import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('../blockchainAuditService', () => ({
  blockchainAuditService: {
    logPayment: vi.fn().mockResolvedValue(undefined),
    logEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), in: vi.fn(), gte: vi.fn(), lte: vi.fn(), or: vi.fn(), is: vi.fn(),
    order: vi.fn(), limit: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

import { supabase } from '../../lib/supabase';
import { paymentService } from '../paymentService';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
});

describe('paymentService', () => {
  describe('createStripeCheckout', () => {
    it('throws when not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

      await expect(paymentService.createStripeCheckout({
        amount_cents: 5000,
        patient_id: 'pat1',
        description: 'Test',
        payment_type: 'appointment',
        success_url: '/success',
        cancel_url: '/cancel',
      })).rejects.toThrow('Not authenticated');
    });

    it('returns checkout data on success', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'tok123' } },
      });

      const checkoutResult = {
        checkout_url: 'https://checkout.stripe.com/session',
        session_id: 'ses_123',
        transaction_id: 'txn_1',
        transaction_number: 'TXN123',
      };
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(checkoutResult),
      });

      const result = await paymentService.createStripeCheckout({
        amount_cents: 5000,
        patient_id: 'pat1',
        description: 'Appointment',
        payment_type: 'appointment',
        success_url: '/success',
        cancel_url: '/cancel',
      });

      expect(result).toEqual(checkoutResult);
    });

    it('returns setup_required on specific error', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'tok123' } },
      });

      (globalThis.fetch as any).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ setup_required: true }),
      });

      const result = await paymentService.createStripeCheckout({
        amount_cents: 5000,
        patient_id: 'pat1',
        description: 'Test',
        payment_type: 'appointment',
        success_url: '/success',
        cancel_url: '/cancel',
      });

      expect(result.setup_required).toBe(true);
      expect(result.checkout_url).toBe('');
    });

    it('throws on generic error response', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'tok123' } },
      });

      (globalThis.fetch as any).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Payment failed' }),
      });

      await expect(paymentService.createStripeCheckout({
        amount_cents: 5000,
        patient_id: 'pat1',
        description: 'Test',
        payment_type: 'appointment',
        success_url: '/s',
        cancel_url: '/c',
      })).rejects.toThrow('Payment failed');
    });
  });

  describe('createTransaction', () => {
    it('creates a transaction with generated number', async () => {
      const txn = { id: 't1', transaction_number: 'TXN123', user_id: 'u1', amount_cents: 5000 };
      const chain = chainMock({ data: txn, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await paymentService.createTransaction({
        user_id: 'u1',
        related_type: 'appointment',
        related_id: 'apt1',
        transaction_type: 'charge',
        amount_cents: 5000,
        payment_method: 'card',
      });

      expect(result).toEqual(txn);
      expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
        currency: 'CAD',
        payment_gateway: 'stripe',
        status: 'pending',
      }));
    });

    it('throws on error', async () => {
      const chain = chainMock({ data: null, error: new Error('Insert failed') });
      (supabase.from as any).mockReturnValue(chain);

      await expect(paymentService.createTransaction({
        user_id: 'u1',
        related_type: 'appointment',
        related_id: 'apt1',
        transaction_type: 'charge',
        amount_cents: 5000,
        payment_method: 'card',
      })).rejects.toThrow('Insert failed');
    });
  });

  describe('processAppointmentPayment', () => {
    it('calls createStripeCheckout with appointment params', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      });
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ checkout_url: 'url', session_id: 's', transaction_id: 't', transaction_number: 'n' }),
      });

      const result = await paymentService.processAppointmentPayment('apt1', 'u1', 5000, '/s', '/c', 'prov1');
      expect(result.checkout_url).toBe('url');
    });
  });

  describe('processPharmacyOrderPayment', () => {
    it('calls createStripeCheckout with pharmacy order params', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      });
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ checkout_url: 'url', session_id: 's', transaction_id: 't', transaction_number: 'n' }),
      });

      const result = await paymentService.processPharmacyOrderPayment('ord1', 'u1', 3000, '/s', '/c');
      expect(result.checkout_url).toBe('url');
    });
  });

  describe('getUserTransactions', () => {
    it('returns transactions for user', async () => {
      const txns = [{ id: 't1' }, { id: 't2' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: txns, error: null }));

      const result = await paymentService.getUserTransactions('u1');
      expect(result).toHaveLength(2);
    });

    it('returns empty array on null data', async () => {
      (supabase.from as any).mockReturnValue(chainMock({ data: null, error: null }));
      const result = await paymentService.getUserTransactions('u1');
      expect(result).toEqual([]);
    });
  });

  describe('getTransaction', () => {
    it('returns transaction by ID', async () => {
      const txn = { id: 't1', amount_cents: 5000 };
      const chain = chainMock({ data: txn, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await paymentService.getTransaction('t1');
      expect(result).toEqual(txn);
    });

    it('returns null when not found', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await paymentService.getTransaction('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getTransactionByNumber', () => {
    it('returns transaction by number', async () => {
      const txn = { id: 't1', transaction_number: 'TXN123' };
      const chain = chainMock({ data: txn, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await paymentService.getTransactionByNumber('TXN123');
      expect(result).toEqual(txn);
    });
  });

  describe('processRefund', () => {
    it('creates refund transaction based on original', async () => {
      const original = { id: 't1', user_id: 'u1', related_type: 'appointment', related_id: 'apt1', currency: 'CAD', payment_method: 'card' };
      const refund = { id: 't2', transaction_type: 'refund', amount_cents: 2500 };

      const getChain = chainMock({ data: original, error: null });
      const insertChain = chainMock({ data: refund, error: null });

      (supabase.from as any)
        .mockReturnValueOnce(getChain)
        .mockReturnValueOnce(insertChain);

      const result = await paymentService.processRefund('t1', 2500, 'Customer request');
      expect(result).toEqual(refund);
    });

    it('throws when original transaction not found', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await expect(paymentService.processRefund('nonexistent', 1000, 'test')).rejects.toThrow('Original transaction not found');
    });
  });

  describe('calculateAppointmentCost', () => {
    it('calculates with no insurance', () => {
      const result = paymentService.calculateAppointmentCost(10000, false);
      expect(result).toEqual({ total: 10000, insurance: 0, patient: 10000 });
    });

    it('calculates with insurance coverage', () => {
      const result = paymentService.calculateAppointmentCost(10000, true, 80);
      expect(result).toEqual({ total: 10000, insurance: 8000, patient: 2000 });
    });

    it('handles 100% coverage', () => {
      const result = paymentService.calculateAppointmentCost(5000, true, 100);
      expect(result).toEqual({ total: 5000, insurance: 5000, patient: 0 });
    });

    it('handles 0% coverage with insurance flag', () => {
      const result = paymentService.calculateAppointmentCost(5000, true, 0);
      expect(result).toEqual({ total: 5000, insurance: 0, patient: 5000 });
    });

    it('floors partial cent amounts', () => {
      const result = paymentService.calculateAppointmentCost(999, true, 33);
      expect(result.insurance).toBe(Math.floor((999 * 33) / 100));
      expect(result.patient).toBe(999 - result.insurance);
    });
  });

  describe('calculatePharmacyOrderCost', () => {
    it('calculates with default 13% tax', () => {
      const result = paymentService.calculatePharmacyOrderCost(10000, 500);
      expect(result.subtotal).toBe(10000);
      expect(result.delivery).toBe(500);
      expect(result.tax).toBe(Math.floor((10000 + 500) * 0.13));
      expect(result.total).toBe(10000 + 500 + result.tax);
    });

    it('calculates with custom tax rate', () => {
      const result = paymentService.calculatePharmacyOrderCost(10000, 0, 0.15);
      expect(result.tax).toBe(Math.floor(10000 * 0.15));
      expect(result.total).toBe(10000 + result.tax);
    });

    it('calculates with zero delivery', () => {
      const result = paymentService.calculatePharmacyOrderCost(5000, 0);
      expect(result.delivery).toBe(0);
      expect(result.tax).toBe(Math.floor(5000 * 0.13));
    });
  });
});
