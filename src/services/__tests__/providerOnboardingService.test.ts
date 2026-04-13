import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock('../blockchainAuditService', () => ({
  blockchainAuditService: {
    logEvent: vi.fn().mockResolvedValue(undefined),
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
import { providerOnboardingService } from '../providerOnboardingService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('providerOnboardingService', () => {
  describe('createApplication', () => {
    it('creates application in draft status', async () => {
      const app = { id: 'app1', user_id: 'u1', application_status: 'draft' };
      const chain = chainMock({ data: app, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await providerOnboardingService.createApplication('u1', { first_name: 'John' } as any);
      expect(result).toEqual(app);
      expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'u1',
        application_status: 'draft',
      }));
    });

    it('throws on error', async () => {
      const chain = chainMock({ data: null, error: new Error('Insert fail') });
      (supabase.from as any).mockReturnValue(chain);
      await expect(providerOnboardingService.createApplication('u1', {} as any)).rejects.toThrow('Insert fail');
    });
  });

  describe('updateApplication', () => {
    it('updates with timestamp', async () => {
      const updated = { id: 'app1', first_name: 'Jane' };
      const chain = chainMock({ data: updated, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await providerOnboardingService.updateApplication('app1', { first_name: 'Jane' } as any);
      expect(result).toEqual(updated);
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ first_name: 'Jane' }));
    });
  });

  describe('submitApplication', () => {
    it('transitions to submitted status', async () => {
      const submitted = { id: 'app1', application_status: 'submitted', user_id: 'u1' };
      const chain = chainMock({ data: submitted, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await providerOnboardingService.submitApplication('app1');
      expect(result.application_status).toBe('submitted');
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        application_status: 'submitted',
      }));
    });

    it('updates provider onboarding_status', async () => {
      const submitted = { id: 'app1', application_status: 'submitted', user_id: 'u1' };
      const chain = chainMock({ data: submitted, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await providerOnboardingService.submitApplication('app1');
      expect(supabase.from).toHaveBeenCalledWith('providers');
      expect(supabase.from).toHaveBeenCalledWith('provider_verification_history');
    });
  });

  describe('getApplication', () => {
    it('returns application by ID', async () => {
      const app = { id: 'app1', application_status: 'draft' };
      const chain = chainMock({ data: app, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await providerOnboardingService.getApplication('app1');
      expect(result).toEqual(app);
    });

    it('returns null when not found', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await providerOnboardingService.getApplication('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getApplicationByUserId', () => {
    it('returns most recent application', async () => {
      const app = { id: 'app1', user_id: 'u1' };
      const chain = chainMock({ data: app, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await providerOnboardingService.getApplicationByUserId('u1');
      expect(result).toEqual(app);
    });
  });

  describe('getPendingApplications', () => {
    it('returns submitted and under_review applications', async () => {
      const apps = [{ id: 'a1', application_status: 'submitted' }];
      const chain = chainMock({ data: apps, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await providerOnboardingService.getPendingApplications();
      expect(result).toEqual(apps);
      expect(chain.in).toHaveBeenCalledWith('application_status', ['submitted', 'under_review']);
    });
  });

  describe('uploadDocument', () => {
    it('uploads file and creates document record', async () => {
      (supabase.storage.from as any).mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.pdf' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.pdf' } }),
      });

      const docRecord = { id: 'doc1', document_type: 'license', verification_status: 'pending' };
      const chain = chainMock({ data: docRecord, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const mockFile = new File(['test'], 'license.pdf', { type: 'application/pdf' });
      const result = await providerOnboardingService.uploadDocument('app1', mockFile, 'license');
      expect(result).toEqual(docRecord);
      expect(supabase.storage.from).toHaveBeenCalledWith('provider-documents');
    });

    it('throws on upload error', async () => {
      (supabase.storage.from as any).mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: new Error('Upload failed') }),
      });

      const mockFile = new File(['test'], 'file.pdf', { type: 'application/pdf' });
      await expect(providerOnboardingService.uploadDocument('app1', mockFile, 'license')).rejects.toThrow('Upload failed');
    });
  });

  describe('getApplicationDocuments', () => {
    it('returns documents for application', async () => {
      const docs = [{ id: 'd1' }, { id: 'd2' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: docs, error: null }));

      const result = await providerOnboardingService.getApplicationDocuments('app1');
      expect(result).toHaveLength(2);
    });
  });

  describe('verifyDocument', () => {
    it('marks document as verified', async () => {
      const doc = { id: 'd1', verification_status: 'verified', application_id: 'app1', document_type: 'license' };
      const chain = chainMock({ data: doc, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await providerOnboardingService.verifyDocument('d1', 'verified', 'admin1');
      expect(result.verification_status).toBe('verified');
    });

    it('marks document as rejected with notes', async () => {
      const doc = { id: 'd1', verification_status: 'rejected', application_id: 'app1', document_type: 'license' };
      const chain = chainMock({ data: doc, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await providerOnboardingService.verifyDocument('d1', 'rejected', 'admin1', 'Expired document');
      expect(result.verification_status).toBe('rejected');
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        rejection_reason: 'Expired document',
      }));
    });

    it('sets rejection_reason to null when verified', async () => {
      const doc = { id: 'd1', verification_status: 'verified', application_id: 'app1', document_type: 'license' };
      const chain = chainMock({ data: doc, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await providerOnboardingService.verifyDocument('d1', 'verified', 'admin1', 'some notes');
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        rejection_reason: null,
      }));
    });
  });

  describe('createApprovalSteps', () => {
    it('creates 5 approval steps', async () => {
      const step = { id: 'step1', approval_status: 'pending' };
      const chain = chainMock({ data: step, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await providerOnboardingService.createApprovalSteps('app1');
      expect(result).toHaveLength(5);
      expect(chain.insert).toHaveBeenCalledTimes(5);
    });
  });

  describe('updateApprovalStep', () => {
    it('updates step status and logs to blockchain', async () => {
      const approval = { id: 'step1', approval_status: 'approved', application_id: 'app1', approval_step: 'license_verification' };
      const chain = chainMock({ data: approval, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await providerOnboardingService.updateApprovalStep('step1', 'approved', 'admin1', 'Looks good');
      expect(result.approval_status).toBe('approved');
    });
  });

  describe('approveApplication', () => {
    it('creates new provider when none exists', async () => {
      const application = { id: 'app1', user_id: 'u1', provider_type: 'doctor', license_number: 'LIC123' };
      const chain1 = chainMock({ data: application, error: null });
      const chain2 = chainMock({ data: null, error: null });
      const chain3 = chainMock({ data: { id: 'prov1' }, error: null });
      const chain4 = chainMock({ data: null, error: null });
      const chain5 = chainMock({ data: null, error: null });

      (supabase.from as any)
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3)
        .mockReturnValueOnce(chain4)
        .mockReturnValueOnce(chain5);

      await providerOnboardingService.approveApplication('app1', 'admin1');
      expect(supabase.from).toHaveBeenCalledWith('provider_onboarding_applications');
      expect(supabase.from).toHaveBeenCalledWith('providers');
    });

    it('throws when application not found', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await expect(providerOnboardingService.approveApplication('nonexistent', 'admin1')).rejects.toThrow('Application not found');
    });

    it('updates existing provider when found', async () => {
      const application = { id: 'app1', user_id: 'u1', provider_type: 'doctor' };
      const existingProvider = { id: 'prov1' };
      const updatedProvider = { id: 'prov1', is_verified: true };

      const chain1 = chainMock({ data: application, error: null });
      const chain2 = chainMock({ data: existingProvider, error: null });
      const chain3 = chainMock({ data: updatedProvider, error: null });
      const chain4 = chainMock({ data: null, error: null });
      const chain5 = chainMock({ data: null, error: null });

      (supabase.from as any)
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3)
        .mockReturnValueOnce(chain4)
        .mockReturnValueOnce(chain5);

      await providerOnboardingService.approveApplication('app1', 'admin1');
    });
  });

  describe('rejectApplication', () => {
    it('sets status to rejected with reason', async () => {
      const application = { user_id: 'u1' };
      const chain = chainMock({ data: application, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await providerOnboardingService.rejectApplication('app1', 'admin1', 'Invalid credentials');
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        application_status: 'rejected',
        rejection_reason: 'Invalid credentials',
      }));
    });
  });

  describe('requestResubmission', () => {
    it('sets status to resubmission_required', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await providerOnboardingService.requestResubmission('app1', 'admin1', 'Please upload clearer photo');
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        application_status: 'resubmission_required',
        resubmission_notes: 'Please upload clearer photo',
      }));
    });
  });

  describe('getAllApplications', () => {
    it('returns all when no filter', async () => {
      const apps = [{ id: 'a1' }, { id: 'a2' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: apps, error: null }));

      const result = await providerOnboardingService.getAllApplications();
      expect(result).toHaveLength(2);
    });

    it('maps "pending" filter to submitted + under_review', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await providerOnboardingService.getAllApplications('pending');
      expect(chain.in).toHaveBeenCalledWith('application_status', ['submitted', 'under_review']);
    });

    it('uses eq for specific status filter', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await providerOnboardingService.getAllApplications('approved');
      expect(chain.eq).toHaveBeenCalledWith('application_status', 'approved');
    });

    it('does not filter when "all" passed', async () => {
      const chain = chainMock({ data: [{ id: 'a1' }], error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await providerOnboardingService.getAllApplications('all');
      expect(result).toHaveLength(1);
    });
  });

  describe('getVerificationHistory', () => {
    it('returns history entries for application', async () => {
      const history = [{ id: 'h1', action_type: 'document_uploaded' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: history, error: null }));

      const result = await providerOnboardingService.getVerificationHistory('app1');
      expect(result).toEqual(history);
    });
  });
});
