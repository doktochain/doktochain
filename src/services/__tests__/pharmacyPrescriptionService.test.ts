import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../consentService', () => ({
  consentService: {
    verifyPharmacyConsent: vi.fn().mockResolvedValue({ hasConsent: true, consent: { id: 'c1' } }),
  },
}));

vi.mock('../blockchainAuditService', () => ({
  blockchainAuditService: {
    logEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../notificationService', () => ({
  notificationService: {
    createNotification: vi.fn().mockResolvedValue({ data: null, error: null }),
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
import { consentService } from '../consentService';
import { pharmacyPrescriptionService } from '../pharmacyPrescriptionService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('pharmacyPrescriptionService', () => {
  describe('getPrescriptionQueue', () => {
    it('returns prescriptions with valid consent', async () => {
      const rxList = [
        { id: 'rx1', patient_id: 'pat1', pharmacy_id: 'ph1' },
        { id: 'rx2', patient_id: 'pat2', pharmacy_id: 'ph1' },
      ];
      (supabase.from as any).mockReturnValue(chainMock({ data: rxList, error: null }));

      const result = await pharmacyPrescriptionService.getPrescriptionQueue('ph1');
      expect(result).toHaveLength(2);
      expect(consentService.verifyPharmacyConsent).toHaveBeenCalledTimes(2);
    });

    it('filters out prescriptions without consent', async () => {
      const rxList = [
        { id: 'rx1', patient_id: 'pat1' },
        { id: 'rx2', patient_id: 'pat2' },
      ];
      (supabase.from as any).mockReturnValue(chainMock({ data: rxList, error: null }));
      (consentService.verifyPharmacyConsent as any)
        .mockResolvedValueOnce({ hasConsent: true })
        .mockResolvedValueOnce({ hasConsent: false });

      const result = await pharmacyPrescriptionService.getPrescriptionQueue('ph1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rx1');
    });

    it('applies status filter', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await pharmacyPrescriptionService.getPrescriptionQueue('ph1', 'pending');
      expect(chain.eq).toHaveBeenCalledWith('status', 'pending');
    });

    it('throws on error', async () => {
      (supabase.from as any).mockReturnValue(chainMock({ data: null, error: new Error('DB') }));
      await expect(pharmacyPrescriptionService.getPrescriptionQueue('ph1')).rejects.toThrow('DB');
    });

    it('skips consent check for entries without patient_id', async () => {
      const rxList = [{ id: 'rx1', patient_id: null }];
      (supabase.from as any).mockReturnValue(chainMock({ data: rxList, error: null }));

      const result = await pharmacyPrescriptionService.getPrescriptionQueue('ph1');
      expect(result).toHaveLength(0);
      expect(consentService.verifyPharmacyConsent).not.toHaveBeenCalled();
    });
  });

  describe('getPrescriptionById', () => {
    it('returns prescription data', async () => {
      const rx = { id: 'rx1', status: 'pending' };
      const chain = chainMock({ data: rx, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await pharmacyPrescriptionService.getPrescriptionById('rx1');
      expect(result).toEqual(rx);
    });
  });

  describe('validatePrescription', () => {
    it('inserts validation record', async () => {
      const validation = { id: 'v1', validation_status: 'passed' };
      const chain = chainMock({ data: validation, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await pharmacyPrescriptionService.validatePrescription({
        prescription_id: 'rx1',
        pharmacy_id: 'ph1',
        validated_by: 'staff1',
        validation_type: 'drug-interaction',
        validation_status: 'passed',
      });
      expect(result).toEqual(validation);
      expect(supabase.from).toHaveBeenCalledWith('prescription_validations');
    });
  });

  describe('getValidations', () => {
    it('returns validations for prescription', async () => {
      const validations = [{ id: 'v1' }, { id: 'v2' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: validations, error: null }));

      const result = await pharmacyPrescriptionService.getValidations('rx1');
      expect(result).toHaveLength(2);
    });
  });

  describe('approvePrescription', () => {
    it('updates status to approved and logs action', async () => {
      const approved = { id: 'rx1', status: 'approved', patient_id: 'pat1' };
      const chain = chainMock({ data: approved, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await pharmacyPrescriptionService.approvePrescription('rx1', 'ph1', 'staff1');
      expect(result).toEqual(approved);
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
    });

    it('throws on error', async () => {
      const chain = chainMock({ data: null, error: new Error('fail') });
      (supabase.from as any).mockReturnValue(chain);
      await expect(pharmacyPrescriptionService.approvePrescription('rx1', 'ph1', 's1')).rejects.toThrow('fail');
    });
  });

  describe('rejectPrescription', () => {
    it('creates rejection record and updates prescription status', async () => {
      const rejection = { id: 'rej1' };
      const chain = chainMock({ data: rejection, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await pharmacyPrescriptionService.rejectPrescription({
        prescription_id: 'rx1',
        pharmacy_id: 'ph1',
        rejected_by: 'staff1',
        rejection_reason: 'Duplicate therapy',
        detailed_notes: 'Already on similar medication',
      });

      expect(result).toEqual(rejection);
      expect(supabase.from).toHaveBeenCalledWith('prescription_rejections');
    });
  });

  describe('getRejections', () => {
    it('returns rejections for pharmacy', async () => {
      const rejections = [{ id: 'rej1' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: rejections, error: null }));

      const result = await pharmacyPrescriptionService.getRejections('ph1');
      expect(result).toEqual(rejections);
    });
  });

  describe('logPrescriptionAction', () => {
    it('inserts audit log entry', async () => {
      const logEntry = { id: 'log1' };
      const chain = chainMock({ data: logEntry, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await pharmacyPrescriptionService.logPrescriptionAction(
        'rx1', 'ph1', 'staff1', 'dispensed', { quantity: 30 }
      );
      expect(result).toEqual(logEntry);
      expect(supabase.from).toHaveBeenCalledWith('prescription_audit_log');
    });
  });

  describe('getAuditLog', () => {
    it('returns audit entries for prescription', async () => {
      const logs = [{ id: 'log1', action: 'approved' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: logs, error: null }));

      const result = await pharmacyPrescriptionService.getAuditLog('rx1');
      expect(result).toEqual(logs);
    });
  });

  describe('sendProviderMessage', () => {
    it('creates pharmacy-to-provider communication', async () => {
      const msg = { id: 'msg1', communication_type: 'pharmacy-to-provider' };
      const chain = chainMock({ data: msg, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await pharmacyPrescriptionService.sendProviderMessage('rx1', 'ph1', 'Need clarification');
      expect(result).toEqual(msg);
      expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
        communication_type: 'pharmacy-to-provider',
        status: 'sent',
      }));
    });
  });

  describe('getCommunications', () => {
    it('returns communications for prescription', async () => {
      const comms = [{ id: 'c1' }, { id: 'c2' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: comms, error: null }));

      const result = await pharmacyPrescriptionService.getCommunications('rx1');
      expect(result).toEqual(comms);
    });
  });

  describe('checkDrugInteractions', () => {
    it('returns no interactions (stub)', async () => {
      const result = await pharmacyPrescriptionService.checkDrugInteractions(['med1', 'med2']);
      expect(result.hasInteractions).toBe(false);
      expect(result.severity).toBe('none');
    });
  });

  describe('checkInsuranceFormulary', () => {
    it('queries formulary by DIN and insurance', async () => {
      const formulary = { din_number: 'DIN123', covered: true };
      const chain = chainMock({ data: formulary, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await pharmacyPrescriptionService.checkInsuranceFormulary('DIN123', 'SunLife', 'Gold Plan');
      expect(result).toEqual(formulary);
      expect(chain.eq).toHaveBeenCalledWith('din_number', 'DIN123');
    });
  });

  describe('getPrescriptionsForPharmacy', () => {
    it('returns prescriptions mapped from junction table', async () => {
      const junctionData = [
        { prescriptions: { id: 'rx1', status: 'pending' } },
        { prescriptions: { id: 'rx2', status: 'approved' } },
      ];
      (supabase.from as any).mockReturnValue(chainMock({ data: junctionData, error: null }));

      const result = await pharmacyPrescriptionService.getPrescriptionsForPharmacy('ph1');
      expect(result).toHaveLength(2);
    });

    it('filters by status when provided', async () => {
      const junctionData = [
        { prescriptions: { id: 'rx1', status: 'pending' } },
        { prescriptions: { id: 'rx2', status: 'approved' } },
      ];
      (supabase.from as any).mockReturnValue(chainMock({ data: junctionData, error: null }));

      const result = await pharmacyPrescriptionService.getPrescriptionsForPharmacy('ph1', 'pending');
      expect(result).toHaveLength(1);
    });

    it('returns all when status is "all"', async () => {
      const junctionData = [
        { prescriptions: { id: 'rx1', status: 'pending' } },
        { prescriptions: { id: 'rx2', status: 'approved' } },
      ];
      (supabase.from as any).mockReturnValue(chainMock({ data: junctionData, error: null }));

      const result = await pharmacyPrescriptionService.getPrescriptionsForPharmacy('ph1', 'all');
      expect(result).toHaveLength(2);
    });
  });

  describe('getPendingPrescriptions', () => {
    it('returns prescriptions with pending transmission status', async () => {
      const data = [{ prescriptions: { id: 'rx1' } }];
      const chain = chainMock({ data, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await pharmacyPrescriptionService.getPendingPrescriptions('ph1');
      expect(result).toHaveLength(1);
      expect(chain.eq).toHaveBeenCalledWith('transmission_status', 'pending');
    });
  });

  describe('updatePrescriptionStatus', () => {
    it('updates prescription status', async () => {
      const updated = { id: 'rx1', status: 'dispensed' };
      const chain = chainMock({ data: updated, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await pharmacyPrescriptionService.updatePrescriptionStatus('rx1', 'dispensed');
      expect(result).toEqual(updated);
    });
  });

  describe('refill flow', () => {
    it('approveRefill updates status with staff info', async () => {
      const approved = { id: 'ref1', status: 'approved' };
      const chain = chainMock({ data: approved, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await pharmacyPrescriptionService.approveRefill('ref1', 'ph1', 'staff1');
      expect(result).toEqual(approved);
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'approved',
        approved_by: 'staff1',
      }));
    });

    it('denyRefill updates status with reason', async () => {
      const denied = { id: 'ref1', status: 'denied' };
      const chain = chainMock({ data: denied, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await pharmacyPrescriptionService.denyRefill('ref1', 'No refills remaining');
      expect(result).toEqual(denied);
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'denied',
        denial_reason: 'No refills remaining',
      }));
    });
  });
});
