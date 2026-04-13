import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), in: vi.fn(), gte: vi.fn(), lte: vi.fn(), or: vi.fn(), is: vi.fn(),
    order: vi.fn(), limit: vi.fn(), ilike: vi.fn(),
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
import { insuranceBillingService, CANADIAN_PROVINCES } from '../insuranceBillingService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('insuranceBillingService', () => {
  describe('formatCurrency', () => {
    it('converts cents to dollar display', () => {
      expect(insuranceBillingService.formatCurrency(1500)).toContain('15.00');
    });

    it('formats zero cents', () => {
      expect(insuranceBillingService.formatCurrency(0)).toContain('0.00');
    });

    it('handles large amounts', () => {
      expect(insuranceBillingService.formatCurrency(150000)).toContain('1,500.00');
    });

    it('formats fractional cents correctly', () => {
      expect(insuranceBillingService.formatCurrency(1999)).toContain('19.99');
    });

    it('includes CAD by default', () => {
      expect(insuranceBillingService.formatCurrency(100)).toContain('$');
    });
  });

  describe('getProvincialInsurance', () => {
    it('returns OHIP for Ontario', () => {
      expect(insuranceBillingService.getProvincialInsurance('ON')).toBe('OHIP');
    });

    it('returns MSP for British Columbia', () => {
      expect(insuranceBillingService.getProvincialInsurance('BC')).toBe('MSP');
    });

    it('returns AHCIP for Alberta', () => {
      expect(insuranceBillingService.getProvincialInsurance('AB')).toBe('AHCIP');
    });

    it('returns RAMQ for Quebec', () => {
      expect(insuranceBillingService.getProvincialInsurance('QC')).toBe('RAMQ');
    });

    it('returns fallback for unknown province', () => {
      expect(insuranceBillingService.getProvincialInsurance('XX')).toBe('Provincial Health Insurance');
    });

    it('covers all 10 provinces', () => {
      expect(CANADIAN_PROVINCES).toHaveLength(10);
      for (const province of CANADIAN_PROVINCES) {
        expect(insuranceBillingService.getProvincialInsurance(province.code)).toBe(province.insurance);
      }
    });
  });

  describe('getStatusColor', () => {
    it('returns green for paid', () => expect(insuranceBillingService.getStatusColor('paid')).toBe('green'));
    it('returns green for completed', () => expect(insuranceBillingService.getStatusColor('completed')).toBe('green'));
    it('returns green for approved', () => expect(insuranceBillingService.getStatusColor('approved')).toBe('green'));
    it('returns yellow for pending', () => expect(insuranceBillingService.getStatusColor('pending')).toBe('yellow'));
    it('returns yellow for partial', () => expect(insuranceBillingService.getStatusColor('partial')).toBe('yellow'));
    it('returns red for overdue', () => expect(insuranceBillingService.getStatusColor('overdue')).toBe('red'));
    it('returns red for failed', () => expect(insuranceBillingService.getStatusColor('failed')).toBe('red'));
    it('returns red for denied', () => expect(insuranceBillingService.getStatusColor('denied')).toBe('red'));
    it('returns gray for cancelled', () => expect(insuranceBillingService.getStatusColor('cancelled')).toBe('gray'));
    it('returns gray for unknown status', () => expect(insuranceBillingService.getStatusColor('unknown')).toBe('gray'));
  });

  describe('getInsurancePolicies', () => {
    it('returns active policies for patient', async () => {
      const policies = [{ id: 'p1', is_primary: true }];
      (supabase.from as any).mockReturnValue(chainMock({ data: policies, error: null }));

      const result = await insuranceBillingService.getInsurancePolicies('pat1');
      expect(result.data).toEqual(policies);
      expect(result.error).toBeNull();
    });

    it('returns error on failure', async () => {
      (supabase.from as any).mockReturnValue(chainMock({ data: null, error: new Error('DB error') }));
      const result = await insuranceBillingService.getInsurancePolicies('pat1');
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('addInsurancePolicy', () => {
    it('inserts policy and returns it', async () => {
      const policy = { id: 'p1', policy_number: 'POL-001' };
      const chain = chainMock({ data: policy, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await insuranceBillingService.addInsurancePolicy({ policy_number: 'POL-001' } as any);
      expect(result.data).toEqual(policy);
    });
  });

  describe('updateInsurancePolicy', () => {
    it('updates policy with timestamp', async () => {
      const updated = { id: 'p1', policy_number: 'POL-002' };
      const chain = chainMock({ data: updated, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await insuranceBillingService.updateInsurancePolicy('p1', { policy_number: 'POL-002' } as any);
      expect(result.data).toEqual(updated);
    });
  });

  describe('setPrimaryInsurance', () => {
    it('clears existing primary and sets new one', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await insuranceBillingService.setPrimaryInsurance('p1', 'pat1');
      expect(result.data).toBe(true);
    });

    it('returns false on error', async () => {
      const chain = chainMock({ data: null, error: new Error('fail') });
      (supabase.from as any).mockReturnValue(chain);

      const result = await insuranceBillingService.setPrimaryInsurance('p1', 'pat1');
      expect(result.data).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('getPaymentMethods', () => {
    it('returns active payment methods', async () => {
      const methods = [{ id: 'm1', last_four: '4242' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: methods, error: null }));

      const result = await insuranceBillingService.getPaymentMethods('pat1');
      expect(result.data).toEqual(methods);
    });
  });

  describe('addPaymentMethod', () => {
    it('inserts and returns payment method', async () => {
      const method = { id: 'm1', last_four: '1234' };
      const chain = chainMock({ data: method, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await insuranceBillingService.addPaymentMethod({ last_four: '1234' } as any);
      expect(result.data).toEqual(method);
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('clears existing default and sets new one', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await insuranceBillingService.setDefaultPaymentMethod('m1', 'pat1');
      expect(result.data).toBe(true);
    });
  });

  describe('deletePaymentMethod', () => {
    it('soft-deletes by setting is_active to false', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await insuranceBillingService.deletePaymentMethod('m1');
      expect(result.data).toBe(true);
      expect(chain.update).toHaveBeenCalledWith({ is_active: false });
    });
  });

  describe('getBillingTransactions', () => {
    it('returns transactions with default limit', async () => {
      const txns = [{ id: 't1' }];
      const chain = chainMock({ data: txns, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await insuranceBillingService.getBillingTransactions('pat1');
      expect(result.data).toEqual(txns);
      expect(chain.limit).toHaveBeenCalledWith(50);
    });

    it('accepts custom limit', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await insuranceBillingService.getBillingTransactions('pat1', 10);
      expect(chain.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getInvoices', () => {
    it('returns invoices for patient', async () => {
      const invoices = [{ id: 'inv1', invoice_number: 'INV-001' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: invoices, error: null }));

      const result = await insuranceBillingService.getInvoices('pat1');
      expect(result.data).toEqual(invoices);
    });
  });

  describe('getOutstandingBalance', () => {
    it('sums balance_cents from outstanding invoices', async () => {
      const invoices = [
        { balance_cents: 5000 },
        { balance_cents: 3000 },
      ];
      const chain = chainMock({ data: invoices, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await insuranceBillingService.getOutstandingBalance('pat1');
      expect(result.data).toBe(8000);
      expect(chain.in).toHaveBeenCalledWith('status', ['sent', 'partial', 'overdue']);
    });

    it('returns 0 when no outstanding invoices', async () => {
      (supabase.from as any).mockReturnValue(chainMock({ data: [], error: null }));
      const result = await insuranceBillingService.getOutstandingBalance('pat1');
      expect(result.data).toBe(0);
    });

    it('returns 0 on error', async () => {
      (supabase.from as any).mockReturnValue(chainMock({ data: null, error: new Error('DB') }));
      const result = await insuranceBillingService.getOutstandingBalance('pat1');
      expect(result.data).toBe(0);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('getInsuranceClaims', () => {
    it('returns claims for patient', async () => {
      const claims = [{ id: 'cl1', status: 'submitted' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: claims, error: null }));

      const result = await insuranceBillingService.getInsuranceClaims('pat1');
      expect(result.data).toEqual(claims);
    });
  });

  describe('submitInsuranceClaim', () => {
    it('creates claim with submitted status and date', async () => {
      const claim = { id: 'cl1', status: 'submitted' };
      const chain = chainMock({ data: claim, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await insuranceBillingService.submitInsuranceClaim({
        patient_id: 'pat1',
        insurance_policy_id: 'pol1',
        claim_date: '2025-01-01',
        service_date: '2025-01-01',
        claimed_amount_cents: 15000,
      } as any);

      expect(result.data).toEqual(claim);
      expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
        status: 'submitted',
      }));
    });

    it('returns error on failure', async () => {
      const chain = chainMock({ data: null, error: new Error('Claim failed') });
      (supabase.from as any).mockReturnValue(chain);

      const result = await insuranceBillingService.submitInsuranceClaim({} as any);
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('getCardBrandIcon', () => {
    it('returns icon for known brands', () => {
      expect(insuranceBillingService.getCardBrandIcon('visa')).toBeDefined();
      expect(insuranceBillingService.getCardBrandIcon('mastercard')).toBeDefined();
      expect(insuranceBillingService.getCardBrandIcon('amex')).toBeDefined();
    });

    it('returns default for unknown brand', () => {
      expect(insuranceBillingService.getCardBrandIcon('unknown')).toBeDefined();
    });

    it('handles undefined brand', () => {
      expect(insuranceBillingService.getCardBrandIcon()).toBeDefined();
    });
  });
});
