import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db, mockSupabase } from './helpers/testContext';

vi.unmock('@/services/auditTrailService');
vi.unmock('@/services/blockchainAuditService');

vi.mock('@/lib/supabase', async () => {
  const ctx = await import('./helpers/testContext');
  return {
    supabase: ctx.mockSupabase,
    getCurrentUser: vi.fn(),
    getUserProfile: vi.fn(),
    getUserRoles: vi.fn(),
  };
});

const originalFetch = globalThis.fetch;

import { paymentService } from '../../services/paymentService';
import { insuranceBillingService } from '../../services/insuranceBillingService';

describe('Integration: Payment + Billing Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.clear();

    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
          user: { id: 'patient-user-1' },
        },
      },
      error: null,
    });
  });

  afterEach(() => {
    db.clear();
    globalThis.fetch = originalFetch;
  });

  describe('Stripe checkout flow', () => {
    it('creates checkout session via edge function', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            checkout_url: 'https://checkout.stripe.com/session123',
            session_id: 'sess_123',
            transaction_id: 'tx-1',
            transaction_number: 'TXN123',
          }),
      }) as any;

      const result = await paymentService.createStripeCheckout({
        appointment_id: 'apt-1',
        amount_cents: 15000,
        patient_id: 'patient-1',
        provider_id: 'provider-1',
        description: 'General Consultation',
        payment_type: 'appointment',
        success_url: 'https://app.test/success',
        cancel_url: 'https://app.test/cancel',
      });

      expect(result.checkout_url).toBe(
        'https://checkout.stripe.com/session123'
      );
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('create-stripe-checkout');
    });

    it('handles authentication failure', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(
        paymentService.createStripeCheckout({
          appointment_id: 'apt-1',
          amount_cents: 15000,
          patient_id: 'patient-1',
          description: 'Test',
          payment_type: 'appointment',
          success_url: 'https://app.test/success',
          cancel_url: 'https://app.test/cancel',
        })
      ).rejects.toThrow('Not authenticated');
    });

    it('handles Stripe error response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({ error: 'Invalid payment amount' }),
      }) as any;

      await expect(
        paymentService.createStripeCheckout({
          appointment_id: 'apt-1',
          amount_cents: -100,
          patient_id: 'patient-1',
          description: 'Test',
          payment_type: 'appointment',
          success_url: 'https://app.test/success',
          cancel_url: 'https://app.test/cancel',
        })
      ).rejects.toThrow();
    });
  });

  describe('transaction recording', () => {
    it('creates transaction and logs to audit trail', async () => {
      const tx = await paymentService.createTransaction({
        user_id: 'patient-1',
        related_type: 'appointment',
        related_id: 'apt-1',
        transaction_type: 'appointment_payment',
        amount_cents: 15000,
        payment_method: 'credit_card',
      });

      expect(tx).toBeDefined();
      expect(tx.transaction_number).toBeDefined();

      const transactions = db.getTable('billing_transactions').getAll();
      expect(transactions.length).toBe(1);
      expect(transactions[0].amount_cents).toBe(15000);
      expect(transactions[0].status).toBe('pending');

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    });

    it('retrieves user transactions', async () => {
      db.seed('billing_transactions', [
        {
          id: 'tx-1',
          user_id: 'patient-1',
          amount_cents: 15000,
          status: 'completed',
          created_at: '2026-03-01',
        },
        {
          id: 'tx-2',
          user_id: 'patient-1',
          amount_cents: 7500,
          status: 'completed',
          created_at: '2026-03-10',
        },
        {
          id: 'tx-3',
          user_id: 'patient-2',
          amount_cents: 20000,
          status: 'completed',
          created_at: '2026-03-15',
        },
      ]);

      const txs = await paymentService.getUserTransactions('patient-1');
      expect(txs.length).toBe(2);
    });
  });

  describe('refund processing', () => {
    it('processes refund and creates refund transaction', async () => {
      db.seed('billing_transactions', [
        {
          id: 'tx-refund-1',
          user_id: 'patient-1',
          related_type: 'appointment',
          related_id: 'apt-1',
          amount_cents: 15000,
          currency: 'CAD',
          payment_method: 'credit_card',
          status: 'completed',
          transaction_type: 'appointment_payment',
        },
      ]);

      const result = await paymentService.processRefund(
        'tx-refund-1',
        15000,
        'Appointment cancelled by provider'
      );

      expect(result).toBeDefined();
      expect(result.transaction_type).toBe('refund');
      expect(result.status).toBe('completed');

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const refundLog = auditLogs.find(
        (l) => l.event_type === 'refund_issued'
      );
      expect(refundLog).toBeDefined();
    });

    it('handles refund for non-existent transaction', async () => {
      await expect(
        paymentService.processRefund('non-existent', 15000, 'Test reason')
      ).rejects.toThrow();
    });
  });

  describe('cost calculations', () => {
    it('calculates appointment cost without insurance', () => {
      const cost = paymentService.calculateAppointmentCost(20000, false);
      expect(cost.total).toBe(20000);
      expect(cost.insurance).toBe(0);
      expect(cost.patient).toBe(20000);
    });

    it('calculates appointment cost with insurance coverage', () => {
      const cost = paymentService.calculateAppointmentCost(20000, true, 80);
      expect(cost.total).toBe(20000);
      expect(cost.insurance).toBe(16000);
      expect(cost.patient).toBe(4000);
    });

    it('calculates pharmacy order cost', () => {
      const cost = paymentService.calculatePharmacyOrderCost(5000, 1000, 0.13);
      expect(cost.subtotal).toBe(5000);
      expect(cost.delivery).toBe(1000);
      expect(cost.tax).toBe(780);
      expect(cost.total).toBe(6780);
    });

    it('handles zero delivery fee', () => {
      const cost = paymentService.calculatePharmacyOrderCost(10000, 0, 0.13);
      expect(cost.subtotal).toBe(10000);
      expect(cost.delivery).toBe(0);
      expect(cost.total).toBe(11300);
    });
  });

  describe('insurance billing integration', () => {
    it('adds insurance policy and retrieves it', async () => {
      await insuranceBillingService.addInsurancePolicy({
        patient_id: 'patient-1',
        provider_name: 'Sun Life',
        policy_number: 'POL-12345',
        group_number: 'GRP-001',
        coverage_type: 'extended',
        is_primary: true,
        is_active: true,
      });

      const policies = await insuranceBillingService.getInsurancePolicies(
        'patient-1'
      );
      expect(policies.data!.length).toBe(1);
      expect(policies.data![0].provider_name).toBe('Sun Life');
    });

    it('submits insurance claim', async () => {
      const result = await insuranceBillingService.submitInsuranceClaim({
        patient_id: 'patient-1',
        provider_id: 'provider-1',
        appointment_id: 'apt-1',
        insurance_policy_id: 'policy-1',
        claim_amount: 15000,
        diagnosis_codes: ['J06.9'],
        procedure_codes: ['99213'],
      });

      expect(result.data).toBeDefined();

      const claims = db.getTable('insurance_claims').getAll();
      expect(claims.length).toBe(1);
      expect(claims[0].status).toBe('submitted');
    });

    it('manages payment methods', async () => {
      await insuranceBillingService.addPaymentMethod({
        patient_id: 'patient-1',
        type: 'credit_card',
        last_four: '4242',
        brand: 'visa',
        is_default: true,
        is_active: true,
      });

      const methods = await insuranceBillingService.getPaymentMethods(
        'patient-1'
      );
      expect(methods.data!.length).toBe(1);
      expect(methods.data![0].last_four).toBe('4242');
    });
  });
});
