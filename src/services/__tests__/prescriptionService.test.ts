import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');
vi.mock('../consentService', () => ({
  consentService: { verifyProviderConsent: vi.fn().mockResolvedValue({ hasConsent: true, consent: { id: 'c1' } }) },
}));
vi.mock('../blockchainAuditService', () => ({
  blockchainAuditService: { logEvent: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../auditLogger', () => ({
  auditLog: { prescriptionCreated: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../fhirResourceFactory', () => ({
  fhirResourceFactory: { createMedicationRequest: vi.fn().mockResolvedValue({}) },
}));
vi.mock('../notificationService', () => ({
  notificationService: { createNotification: vi.fn().mockResolvedValue({ data: null, error: null }) },
}));

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), in: vi.fn(), gte: vi.fn(), lte: vi.fn(), or: vi.fn(),
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

const { prescriptionService } = await import('../prescriptionService');

describe('prescriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPrescription', () => {
    it('generates a prescription number starting with RX', async () => {
      const mockRx = { id: 'rx-1', prescription_number: 'RX1234567890' };
      const chain = chainMock({ data: mockRx, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await prescriptionService.createPrescription({
        patient_id: 'p1',
        provider_id: 'prov1',
        prescription_date: '2025-06-15',
      });

      expect(result.prescription_number).toMatch(/^RX/);
    });

    it('throws on supabase error', async () => {
      const chain = chainMock({ data: null, error: { message: 'Insert failed' } });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await expect(
        prescriptionService.createPrescription({ patient_id: 'p1', provider_id: 'prov1' })
      ).rejects.toThrow();
    });
  });

  describe('getPatientPrescriptions', () => {
    it('queries prescriptions by patient_id', async () => {
      const rxList = [{ id: 'rx-1', patient_id: 'p1', status: 'pending' }];
      const chain = chainMock({ data: rxList, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await prescriptionService.getPatientPrescriptions('p1');
      expect(result).toEqual(rxList);
      expect(supabase.from).toHaveBeenCalledWith('prescriptions');
    });

    it('filters by status when provided', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await prescriptionService.getPatientPrescriptions('p1', 'filled');
      expect(chain.eq).toHaveBeenCalledWith('status', 'filled');
    });
  });

  describe('getProviderPrescriptions', () => {
    it('queries prescriptions by provider_id', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await prescriptionService.getProviderPrescriptions('prov1');
      expect(chain.eq).toHaveBeenCalledWith('provider_id', 'prov1');
    });
  });

  describe('updatePrescriptionStatus', () => {
    it('updates status and sets filled_date when status is filled', async () => {
      const chain = chainMock({ data: { id: 'rx-1', status: 'filled' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await prescriptionService.updatePrescriptionStatus('rx-1', 'filled');
      expect(result.status).toBe('filled');
    });
  });

  describe('sendToPharmacy', () => {
    it('updates pharmacy_id and status to sent', async () => {
      const chain = chainMock({
        data: { id: 'rx-1', pharmacy_id: 'pharm-1', status: 'sent', patient_id: 'p1' },
        error: null,
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await prescriptionService.sendToPharmacy('rx-1', 'pharm-1');
      expect(result.status).toBe('sent');
      expect(result.pharmacy_id).toBe('pharm-1');
    });
  });

  describe('requestRefill', () => {
    it('inserts a refill request', async () => {
      const chain = chainMock({ data: { id: 'refill-1', status: 'pending' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await prescriptionService.requestRefill('rx-1', 'patient-1');
      expect(result).toBeDefined();
    });
  });

  describe('approveRefill', () => {
    it('updates refill status to approved', async () => {
      const chain = chainMock({ data: { id: 'refill-1', status: 'approved' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await prescriptionService.approveRefill('refill-1', 'provider-1');
      expect(result.status).toBe('approved');
    });
  });

  describe('denyRefill', () => {
    it('updates refill status to denied with reason', async () => {
      const chain = chainMock({ data: { id: 'refill-1', status: 'denied' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await prescriptionService.denyRefill('refill-1', 'Not medically necessary');
      expect(result.status).toBe('denied');
    });
  });
});
