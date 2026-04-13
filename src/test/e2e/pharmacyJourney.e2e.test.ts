import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { db, mockSupabase } from './helpers/e2eContext';

vi.unmock('@/services/auditTrailService');
vi.unmock('@/services/blockchainAuditService');

vi.mock('@/lib/supabase', async () => {
  const ctx = await import('./helpers/e2eContext');
  return {
    supabase: ctx.mockSupabase,
    getCurrentUser: vi.fn(),
    getUserProfile: vi.fn(),
    getUserRoles: vi.fn(),
  };
});

import { pharmacyPrescriptionService } from '@/services/pharmacyPrescriptionService';
import { pharmacyOrderFulfillmentService } from '@/services/pharmacyOrderFulfillmentService';
import { pharmacyInventoryService } from '@/services/pharmacyInventoryService';
import { pharmacyService } from '@/services/pharmacyService';
import { consentService } from '@/services/consentService';
import { auditTrailService } from '@/services/auditTrailService';
import { seedPlatformData } from './helpers/e2eContext';

describe('E2E: Complete Pharmacy Journey', () => {
  const state: Record<string, any> = {};

  beforeAll(() => {
    vi.clearAllMocks();
    db.clear();
    seedPlatformData();

    db.seed('prescriptions', [
      {
        id: 'rx-pharm-1',
        patient_id: 'patient-1',
        provider_id: 'provider-1',
        pharmacy_id: 'pharmacy-1',
        diagnosis: 'Eczema',
        diagnosis_code: 'L30.9',
        status: 'sent_to_pharmacy',
        notes: 'Apply morning and evening',
      },
      {
        id: 'rx-pharm-2',
        patient_id: 'patient-1',
        provider_id: 'provider-1',
        pharmacy_id: 'pharmacy-1',
        diagnosis: 'Acne vulgaris',
        diagnosis_code: 'L70.0',
        status: 'sent_to_pharmacy',
        notes: 'Use with sunscreen',
      },
    ]);

    db.seed('prescription_items', [
      {
        id: 'rxi-1',
        prescription_id: 'rx-pharm-1',
        medication_name: 'Hydrocortisone Cream 1%',
        din_number: 'DIN-00012345',
        dosage: 'Thin layer',
        frequency: 'Twice daily',
        duration: '14 days',
        quantity: 1,
      },
      {
        id: 'rxi-2',
        prescription_id: 'rx-pharm-2',
        medication_name: 'Benzoyl Peroxide 5%',
        din_number: 'DIN-00012347',
        dosage: 'Pea-sized amount',
        frequency: 'Once daily at bedtime',
        duration: '30 days',
        quantity: 1,
      },
    ]);

    db.seed('patient_consents', [
      {
        id: 'consent-pharm-1',
        patient_id: 'patient-1',
        pharmacy_id: 'pharmacy-1',
        consent_type: 'data_sharing',
        consent_scope: 'broad',
        record_types: [],
        status: 'active',
        start_date: '2026-04-01',
        end_date: '2026-07-01',
      },
    ]);
  });

  afterAll(() => {
    db.clear();
  });

  describe('Phase 1: Pharmacy profile and inventory setup', () => {
    it('step 1 - pharmacy retrieves its profile', async () => {
      const pharmacy = await pharmacyService.getPharmacyByUserId(
        'pharmacy-user-1'
      );
      expect(pharmacy).toBeDefined();
      expect(pharmacy!.pharmacy_name).toBe('MediPharm Toronto');
      state.pharmacyId = pharmacy!.id;
    });

    it('step 2 - pharmacy views current inventory', async () => {
      const inventory = await pharmacyInventoryService.getInventory(
        state.pharmacyId
      );
      expect(inventory.length).toBeGreaterThanOrEqual(2);
    });

    it('step 3 - pharmacy adds new inventory item', async () => {
      const item = await pharmacyInventoryService.addInventoryItem({
        pharmacy_id: state.pharmacyId,
        medication_name: 'Benzoyl Peroxide 5%',
        din_number: 'DIN-00012347',
        category: 'Topical',
        quantity_on_hand: 25,
        stock_quantity: 25,
        reorder_level: 5,
        unit_price: 899,
        unit_price_cents: 899,
        manufacturer: 'SkinCare Labs',
        form: 'gel',
        strength: '5%',
      });

      expect(item).toBeDefined();
      expect(item.medication_name).toBe('Benzoyl Peroxide 5%');
      state.newInventoryId = item.id;
    });

    it('step 4 - pharmacy checks low stock items', async () => {
      const lowStock = await pharmacyInventoryService.getLowStockItems(
        state.pharmacyId
      );
      expect(Array.isArray(lowStock)).toBe(true);
    });

    it('step 5 - pharmacy calculates total inventory value', async () => {
      const value = await pharmacyInventoryService.getInventoryValue(
        state.pharmacyId
      );
      expect(value.totalItems).toBeGreaterThanOrEqual(3);
      expect(value.totalValue).toBeGreaterThan(0);
    });
  });

  describe('Phase 2: Prescription processing pipeline', () => {
    it('step 6 - pharmacy checks drug interactions for first Rx', async () => {
      const check = await pharmacyPrescriptionService.checkDrugInteractions([
        'Hydrocortisone Cream 1%',
      ]);
      expect(check.hasInteractions).toBe(false);
    });

    it('step 7 - pharmacist validates prescription 1', async () => {
      const validation =
        await pharmacyPrescriptionService.validatePrescription({
          prescription_id: 'rx-pharm-1',
          pharmacy_id: state.pharmacyId,
          pharmacist_id: 'pharmacy-user-1',
          validation_status: 'approved',
          drug_interaction_check: 'clear',
          insurance_verification: 'covered',
          notes: 'All checks passed, no interactions',
        });

      expect(validation).toBeDefined();
      expect(validation.validation_status).toBe('approved');
    });

    it('step 8 - pharmacist validates prescription 2', async () => {
      const validation =
        await pharmacyPrescriptionService.validatePrescription({
          prescription_id: 'rx-pharm-2',
          pharmacy_id: state.pharmacyId,
          pharmacist_id: 'pharmacy-user-1',
          validation_status: 'approved',
          notes: 'Verified dosage and duration',
        });

      expect(validation).toBeDefined();
    });

    it('step 9 - pharmacy approves prescription 1', async () => {
      await pharmacyPrescriptionService.approvePrescription(
        'rx-pharm-1',
        state.pharmacyId,
        'pharmacy-user-1'
      );

      const rx = db.getTable('prescriptions').select({ id: 'rx-pharm-1' });
      expect(rx[0].status).toBe('approved');
    });

    it('step 10 - pharmacy logs prescription actions', async () => {
      const log = await pharmacyPrescriptionService.logPrescriptionAction(
        'rx-pharm-1',
        state.pharmacyId,
        'pharmacy-user-1',
        'dispensing_started',
        { notes: 'Beginning medication preparation' }
      );
      expect(log).toBeDefined();
    });

    it('step 11 - prescription audit log is maintained', async () => {
      const auditLog =
        await pharmacyPrescriptionService.getAuditLog('rx-pharm-1');
      expect(auditLog.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Phase 3: Order fulfillment', () => {
    it('step 12 - pharmacy creates fulfillment for Rx 1', async () => {
      const fulfillment =
        await pharmacyOrderFulfillmentService.createFulfillment({
          pharmacy_id: state.pharmacyId,
          prescription_id: 'rx-pharm-1',
          patient_id: 'patient-1',
          assigned_staff_id: 'pharmacy-user-1',
          fulfillment_status: 'picking',
        });

      expect(fulfillment).toBeDefined();
      state.fulfillmentId = fulfillment.id;
    });

    it('step 13 - fulfillment moves through picking -> checking -> ready', async () => {
      await pharmacyOrderFulfillmentService.updateFulfillmentStatus(
        state.fulfillmentId,
        'checking',
        'pharmacy-user-1'
      );

      const afterCheck = db
        .getTable('order_fulfillment')
        .select({ id: state.fulfillmentId });
      expect(afterCheck[0].fulfillment_status).toBe('checking');

      await pharmacyOrderFulfillmentService.updateFulfillmentStatus(
        state.fulfillmentId,
        'ready',
        'pharmacy-user-1'
      );

      const afterReady = db
        .getTable('order_fulfillment')
        .select({ id: state.fulfillmentId });
      expect(afterReady[0].fulfillment_status).toBe('ready');
    });

    it('step 14 - pharmacy creates a patient order for pickup', async () => {
      const order = await pharmacyService.createOrder({
        pharmacy_id: state.pharmacyId,
        patient_id: 'patient-1',
        prescription_id: 'rx-pharm-1',
        order_type: 'prescription',
        status: 'pending',
        total_amount: 1299,
      });

      expect(order).toBeDefined();
      state.orderId = order.id;
    });

    it('step 15 - order items are added', async () => {
      const items = await pharmacyService.addOrderItems([
        {
          order_id: state.orderId,
          inventory_id: 'inv-1',
          medication_name: 'Hydrocortisone Cream 1%',
          quantity: 1,
          unit_price: 1299,
          total_price: 1299,
        },
      ]);

      expect(items.length).toBe(1);
    });

    it('step 16 - order status progresses: pending -> processing -> ready', async () => {
      let updated = await pharmacyService.updateOrderStatus(
        state.orderId,
        'processing'
      );
      expect(updated.status).toBe('processing');

      updated = await pharmacyService.updateOrderStatus(
        state.orderId,
        'ready'
      );
      expect(updated.status).toBe('ready');
    });

    it('step 17 - pharmacy can add notes to the order', async () => {
      const note = await pharmacyOrderFulfillmentService.addOrderNote(
        state.orderId,
        'pharmacy-user-1',
        'Patient requested branded product, no generic substitution',
        'fulfillment',
        true
      );

      expect(note).toBeDefined();
      expect(note.is_important).toBe(true);
    });
  });

  describe('Phase 4: Delivery flow', () => {
    it('step 18 - create a delivery order for Rx 2', async () => {
      const order2 = await pharmacyService.createOrder({
        pharmacy_id: state.pharmacyId,
        patient_id: 'patient-1',
        prescription_id: 'rx-pharm-2',
        order_type: 'prescription',
        status: 'pending',
        total_amount: 899,
        delivery_type: 'delivery',
      });

      state.deliveryOrderId = order2.id;
    });

    it('step 19 - create delivery record', async () => {
      const delivery = await pharmacyService.createDelivery({
        order_id: state.deliveryOrderId,
        delivery_address: '123 Main St, Toronto, ON',
        delivery_status: 'pending',
        estimated_delivery_time: '2026-04-15T18:00:00Z',
      });

      expect(delivery).toBeDefined();
      state.deliveryId = delivery.id;
    });

    it('step 20 - delivery status progresses', async () => {
      let updated = await pharmacyService.updateDeliveryStatus(
        state.deliveryId,
        'dispatched',
        { dispatched_at: new Date().toISOString() }
      );
      expect(updated.delivery_status).toBe('dispatched');

      updated = await pharmacyService.updateDeliveryStatus(
        state.deliveryId,
        'delivered',
        { delivered_at: new Date().toISOString() }
      );
      expect(updated.delivery_status).toBe('delivered');
    });

    it('step 21 - inventory stock is updated after dispensing', async () => {
      await pharmacyInventoryService.updateStock(
        'inv-1',
        state.pharmacyId,
        -1,
        'dispensed',
        'pharmacy-user-1',
        'Dispensed for rx-pharm-1'
      );

      const item = await pharmacyInventoryService.getInventoryItem('inv-1');
      expect(item.stock_quantity).toBe(49);
    });

    it('step 22 - inventory transaction is recorded', async () => {
      const transactions =
        await pharmacyInventoryService.getTransactionHistory(
          state.pharmacyId
        );
      expect(transactions.length).toBeGreaterThanOrEqual(1);
      const dispenseTx = transactions.find(
        (t) => t.transaction_type === 'dispensed'
      );
      expect(dispenseTx).toBeDefined();
    });
  });

  describe('Phase 5: Refill handling', () => {
    it('step 23 - pharmacy receives refill request', () => {
      db.seed('prescription_refill_requests', [
        {
          id: 'refill-req-1',
          prescription_id: 'rx-pharm-1',
          patient_id: 'patient-1',
          status: 'pending',
          request_reason: 'Medication running low',
        },
      ]);

      const refills = db.getTable('prescription_refill_requests').getAll();
      expect(refills.length).toBeGreaterThanOrEqual(1);
    });

    it('step 24 - pharmacy approves the refill', async () => {
      const approved = await pharmacyPrescriptionService.approveRefill(
        'refill-req-1',
        state.pharmacyId,
        'pharmacy-user-1'
      );

      expect(approved).toBeDefined();

      const refills = db.getTable('prescription_refill_requests').getAll();
      const r = refills.find((x) => x.id === 'refill-req-1');
      expect(r.status).toBe('approved');
    });
  });

  describe('Phase 6: Communication and audit', () => {
    it('step 25 - pharmacy sends message to provider about Rx 2', async () => {
      const msg = await pharmacyPrescriptionService.sendProviderMessage(
        'rx-pharm-2',
        state.pharmacyId,
        'Confirming benzoyl peroxide 5% gel formulation - please advise if cream is preferred'
      );

      expect(msg).toBeDefined();
    });

    it('step 26 - communication log is maintained', async () => {
      const comms =
        await pharmacyPrescriptionService.getCommunications('rx-pharm-2');
      expect(comms.length).toBeGreaterThanOrEqual(1);
    });

    it('step 27 - audit trail has entries for pharmacy actions', async () => {
      const trail = await auditTrailService.getAuditTrail({});
      expect(trail.length).toBeGreaterThan(0);
    });

    it('step 28 - audit chain integrity verified', async () => {
      const result = await auditTrailService.verifyChainIntegrity();
      expect(result.isValid).toBe(true);
    });
  });
});
