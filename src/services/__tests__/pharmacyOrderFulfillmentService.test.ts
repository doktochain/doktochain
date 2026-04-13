import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');
vi.mock('../blockchainAuditService', () => ({
  blockchainAuditService: {
    logEvent: vi.fn().mockResolvedValue(undefined),
    logDeliveryEvent: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../auditLogger', () => ({
  auditLog: { pharmacyOrderCreated: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../notificationService', () => ({
  notificationService: { createNotification: vi.fn().mockResolvedValue({ data: null, error: null }) },
}));

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), in: vi.fn(), gte: vi.fn(), lte: vi.fn(), or: vi.fn(),
    order: vi.fn(), limit: vi.fn(), contains: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

const { pharmacyOrderFulfillmentService } = await import('../pharmacyOrderFulfillmentService');

describe('pharmacyOrderFulfillmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrders', () => {
    it('queries orders by pharmacy_id', async () => {
      const orders = [{ id: 'o1', status: 'pending' }];
      const chain = chainMock({ data: orders, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyOrderFulfillmentService.getOrders('ph1');
      expect(result).toEqual(orders);
      expect(supabase.from).toHaveBeenCalledWith('pharmacy_orders');
    });

    it('applies status filter when provided', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await pharmacyOrderFulfillmentService.getOrders('ph1', 'pending');
      expect(chain.eq).toHaveBeenCalledWith('status', 'pending');
    });

    it('returns empty array when data is null', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyOrderFulfillmentService.getOrders('ph1');
      expect(result).toEqual([]);
    });
  });

  describe('getOrderById', () => {
    it('returns order with full relations', async () => {
      const order = { id: 'o1', status: 'pending' };
      const chain = chainMock({ data: order, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyOrderFulfillmentService.getOrderById('o1');
      expect(result).toEqual(order);
      expect(chain.eq).toHaveBeenCalledWith('id', 'o1');
    });
  });

  describe('createFulfillment', () => {
    it('creates fulfillment record', async () => {
      const fulfillment = { id: 'f1', order_id: 'o1', pharmacy_id: 'ph1', fulfillment_status: 'pending' };
      const chain = chainMock({ data: fulfillment, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyOrderFulfillmentService.createFulfillment({
        order_id: 'o1',
        pharmacy_id: 'ph1',
      });
      expect(result).toEqual(fulfillment);
      expect(supabase.from).toHaveBeenCalledWith('order_fulfillment');
    });
  });

  describe('assignStaff', () => {
    it('updates assigned_to field', async () => {
      const fulfillment = { id: 'f1', assigned_to: 'staff1' };
      const chain = chainMock({ data: fulfillment, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyOrderFulfillmentService.assignStaff('f1', 'staff1');
      expect(result).toEqual(fulfillment);
      expect(chain.update).toHaveBeenCalledWith({ assigned_to: 'staff1' });
    });
  });

  describe('addOrderNote', () => {
    it('inserts note with correct fields', async () => {
      const note = { id: 'n1', order_id: 'o1', note_content: 'Urgent' };
      const chain = chainMock({ data: note, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyOrderFulfillmentService.addOrderNote('o1', 'staff1', 'Urgent', 'general', true);
      expect(result).toEqual(note);
      expect(supabase.from).toHaveBeenCalledWith('order_notes');
    });
  });

  describe('getOrderNotes', () => {
    it('returns notes ordered by created_at', async () => {
      const notes = [{ id: 'n1', note_content: 'Test' }];
      const chain = chainMock({ data: notes, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyOrderFulfillmentService.getOrderNotes('o1');
      expect(result).toEqual(notes);
      expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true });
    });
  });

  describe('getOrderStatusHistory', () => {
    it('returns status history for order', async () => {
      const history = [{ id: 'h1', status: 'pending' }];
      const chain = chainMock({ data: history, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyOrderFulfillmentService.getOrderStatusHistory('o1');
      expect(result).toEqual(history);
      expect(supabase.from).toHaveBeenCalledWith('order_status_history');
    });
  });

  describe('assignCourier', () => {
    it('creates courier assignment', async () => {
      const assignment = { id: 'ca1', order_id: 'o1', courier_type: 'internal' };
      const chain = chainMock({ data: assignment, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyOrderFulfillmentService.assignCourier({
        order_id: 'o1',
        courier_type: 'internal',
      });
      expect(result).toEqual(assignment);
      expect(supabase.from).toHaveBeenCalledWith('courier_assignments');
    });
  });

  describe('updateCourierStatus', () => {
    it('updates delivery status', async () => {
      const assignment = { id: 'ca1', delivery_status: 'in-transit' };
      const chain = chainMock({ data: assignment, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyOrderFulfillmentService.updateCourierStatus('ca1', 'in-transit');
      expect(result).toEqual(assignment);
    });
  });

  describe('getActiveDeliveries', () => {
    it('queries active delivery statuses', async () => {
      const deliveries = [{ id: 'ca1', delivery_status: 'in-transit' }];
      const chain = chainMock({ data: deliveries, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyOrderFulfillmentService.getActiveDeliveries('ph1');
      expect(result).toEqual(deliveries);
      expect(chain.in).toHaveBeenCalledWith('delivery_status', ['assigned', 'dispatched', 'in-transit']);
    });
  });

  describe('getFulfillmentMetrics', () => {
    it('calculates metrics from fulfillment data', async () => {
      const now = new Date();
      const pickStart = new Date(now.getTime() - 600000).toISOString();
      const pickEnd = new Date(now.getTime() - 300000).toISOString();
      const packEnd = now.toISOString();

      const fulfillments = [
        {
          id: 'f1',
          fulfillment_status: 'completed',
          picking_started_at: pickStart,
          picking_completed_at: pickEnd,
          packing_completed_at: packEnd,
        },
      ];
      const chain = chainMock({ data: fulfillments, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await pharmacyOrderFulfillmentService.getFulfillmentMetrics('ph1');
      expect(result.totalOrders).toBe(1);
      expect(result.completedOrders).toBe(1);
      expect(typeof result.avgPickingTimeMinutes).toBe('number');
      expect(typeof result.avgTotalTimeMinutes).toBe('number');
    });

    it('applies date filters when provided', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await pharmacyOrderFulfillmentService.getFulfillmentMetrics('ph1', '2025-01-01', '2025-12-31');
      expect(chain.gte).toHaveBeenCalledWith('created_at', '2025-01-01');
      expect(chain.lte).toHaveBeenCalledWith('created_at', '2025-12-31');
    });
  });
});
