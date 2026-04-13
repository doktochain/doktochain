import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from './helpers/testContext';

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

import { providerOnboardingService } from '../../services/providerOnboardingService';

describe('Integration: Provider Onboarding Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.clear();
  });

  afterEach(() => {
    db.clear();
  });

  describe('complete onboarding lifecycle', () => {
    it('creates application in draft status', async () => {
      const app = await providerOnboardingService.createApplication('user-1', {
        email: 'doctor@test.com',
        first_name: 'John',
        last_name: 'Smith',
        phone: '555-1234',
        provider_type: 'doctor',
        specialty: 'Cardiology',
        license_number: 'LIC-99999',
        license_province: 'ON',
      });

      expect(app).toBeDefined();
      expect(app.id).toBeDefined();

      const apps = db.getTable('provider_onboarding_applications').getAll();
      expect(apps.length).toBe(1);
      expect(apps[0].application_status).toBe('draft');
      expect(apps[0].user_id).toBe('user-1');
    });

    it('updates application data', async () => {
      const app = await providerOnboardingService.createApplication('user-1', {
        email: 'doctor@test.com',
        first_name: 'John',
        last_name: 'Smith',
        provider_type: 'doctor',
      });

      await providerOnboardingService.updateApplication(app.id, {
        specialty: 'Neurology',
        years_of_experience: 15,
        bio: 'Experienced neurologist',
      });

      const apps = db.getTable('provider_onboarding_applications').getAll();
      const updated = apps.find((a) => a.id === app.id);
      expect(updated!.specialty).toBe('Neurology');
      expect(updated!.years_of_experience).toBe(15);
    });

    it('submits application and changes status', async () => {
      const app = await providerOnboardingService.createApplication('user-1', {
        email: 'doctor@test.com',
        first_name: 'John',
        last_name: 'Smith',
        provider_type: 'doctor',
        license_number: 'LIC-123',
        license_province: 'ON',
      });

      await providerOnboardingService.submitApplication(app.id);

      const apps = db.getTable('provider_onboarding_applications').getAll();
      const submitted = apps.find((a) => a.id === app.id);
      expect(submitted!.application_status).toBe('submitted');
      expect(submitted!.submission_date).toBeDefined();

      const history = db.getTable('provider_verification_history').getAll();
      const submitLog = history.find(
        (l) => l.action_type === 'application_submitted'
      );
      expect(submitLog).toBeDefined();
    });
  });

  describe('document upload flow', () => {
    it('uploads document and creates record', async () => {
      const app = await providerOnboardingService.createApplication('user-1', {
        email: 'doctor@test.com',
        first_name: 'John',
        last_name: 'Smith',
        provider_type: 'doctor',
      });

      const file = new File(['test content'], 'license.pdf', {
        type: 'application/pdf',
      });

      const doc = await providerOnboardingService.uploadDocument(
        app.id,
        file,
        'medical_license'
      );

      expect(doc).toBeDefined();
      expect(doc.id).toBeDefined();

      const docs = db.getTable('provider_verification_documents').getAll();
      expect(docs.length).toBe(1);
      expect(docs[0].document_type).toBe('medical_license');
      expect(docs[0].application_id).toBe(app.id);
    });
  });

  describe('admin approval workflow', () => {
    let applicationId: string;

    beforeEach(async () => {
      const app = await providerOnboardingService.createApplication('user-1', {
        email: 'doctor@test.com',
        first_name: 'John',
        last_name: 'Smith',
        provider_type: 'doctor',
        license_number: 'LIC-123',
        license_province: 'ON',
      });
      applicationId = app.id;
    });

    it('creates 5 approval steps', async () => {
      const steps =
        await providerOnboardingService.createApprovalSteps(applicationId);

      expect(steps.length).toBe(5);

      const dbSteps = db.getTable('provider_admin_approvals').getAll();
      expect(dbSteps.length).toBe(5);

      const stepNames = dbSteps.map((s) => s.approval_step);
      expect(stepNames).toContain('identity_verification');
      expect(stepNames).toContain('license_verification');
      expect(stepNames).toContain('credential_verification');
      expect(stepNames).toContain('practice_verification');
      expect(stepNames).toContain('final_approval');

      dbSteps.forEach((step) => {
        expect(step.approval_status).toBe('pending');
      });
    });

    it('approves application and creates provider record', async () => {
      await providerOnboardingService.approveApplication(
        applicationId,
        'admin-1'
      );

      const apps = db.getTable('provider_onboarding_applications').getAll();
      const approved = apps.find((a) => a.id === applicationId);
      expect(approved!.application_status).toBe('approved');

      const providers = db.getTable('providers').getAll();
      expect(providers.length).toBe(1);
      expect(providers[0].user_id).toBe('user-1');
      expect(providers[0].is_active).toBe(true);
      expect(providers[0].onboarding_status).toBe('approved');

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const approvalLog = auditLogs.find(
        (l) => l.event_type === 'provider_application_approved'
      );
      expect(approvalLog).toBeDefined();
    });

    it('rejects application with reason', async () => {
      await providerOnboardingService.rejectApplication(
        applicationId,
        'admin-1',
        'Invalid license number'
      );

      const apps = db.getTable('provider_onboarding_applications').getAll();
      const rejected = apps.find((a) => a.id === applicationId);
      expect(rejected!.application_status).toBe('rejected');
      expect(rejected!.rejection_reason).toBe('Invalid license number');

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const rejectionLog = auditLogs.find(
        (l) => l.event_type === 'provider_application_rejected'
      );
      expect(rejectionLog).toBeDefined();
    });

    it('requests resubmission with feedback', async () => {
      await providerOnboardingService.requestResubmission(
        applicationId,
        'admin-1',
        'Please provide clearer scan of license'
      );

      const apps = db.getTable('provider_onboarding_applications').getAll();
      const resubmit = apps.find((a) => a.id === applicationId);
      expect(resubmit!.application_status).toBe('resubmission_required');

      const history = db.getTable('provider_verification_history').getAll();
      expect(history.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('document verification', () => {
    it('verifies document as approved', async () => {
      const app = await providerOnboardingService.createApplication('user-1', {
        email: 'doctor@test.com',
        first_name: 'John',
        last_name: 'Smith',
        provider_type: 'doctor',
      });

      db.seed('provider_verification_documents', [
        {
          id: 'doc-1',
          application_id: app.id,
          document_type: 'medical_license',
          file_url: 'https://storage/license.pdf',
          verification_status: 'pending',
        },
      ]);

      await providerOnboardingService.verifyDocument(
        'doc-1',
        'verified',
        'admin-1'
      );

      const docs = db.getTable('provider_verification_documents').getAll();
      const doc = docs.find((d) => d.id === 'doc-1');
      expect(doc!.verification_status).toBe('verified');
      expect(doc!.verified_by).toBe('admin-1');

      const history = db.getTable('provider_verification_history').getAll();
      expect(history.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects document with reason', async () => {
      db.seed('provider_verification_documents', [
        {
          id: 'doc-2',
          application_id: 'app-1',
          document_type: 'insurance',
          file_url: 'https://storage/insurance.pdf',
          verification_status: 'pending',
        },
      ]);

      await providerOnboardingService.verifyDocument(
        'doc-2',
        'rejected',
        'admin-1',
        'Document is expired'
      );

      const docs = db.getTable('provider_verification_documents').getAll();
      const doc = docs.find((d) => d.id === 'doc-2');
      expect(doc!.verification_status).toBe('rejected');
      expect(doc!.rejection_reason).toBe('Document is expired');
    });
  });

  describe('application listing and filtering', () => {
    beforeEach(() => {
      db.seed('provider_onboarding_applications', [
        {
          id: 'app-s1',
          application_status: 'submitted',
          first_name: 'Alice',
        },
        {
          id: 'app-s2',
          application_status: 'under_review',
          first_name: 'Bob',
        },
        {
          id: 'app-s3',
          application_status: 'approved',
          first_name: 'Charlie',
        },
        {
          id: 'app-s4',
          application_status: 'rejected',
          first_name: 'Diana',
        },
        { id: 'app-s5', application_status: 'draft', first_name: 'Eve' },
      ]);
    });

    it('gets all applications', async () => {
      const apps =
        await providerOnboardingService.getAllApplications('all');
      expect(apps.length).toBe(5);
    });

    it('filters pending applications (submitted + under_review)', async () => {
      const apps =
        await providerOnboardingService.getAllApplications('pending');
      const statuses = apps.map((a: any) => a.application_status);
      expect(statuses).toContain('submitted');
      expect(statuses).toContain('under_review');
      expect(statuses).not.toContain('approved');
      expect(statuses).not.toContain('draft');
    });

    it('filters by specific status', async () => {
      const apps =
        await providerOnboardingService.getAllApplications('approved');
      expect(apps.length).toBe(1);
      expect(apps[0].application_status).toBe('approved');
    });
  });
});
