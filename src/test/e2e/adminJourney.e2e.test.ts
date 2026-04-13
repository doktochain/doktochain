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

import { adminService } from '@/services/adminService';
import { providerOnboardingService } from '@/services/providerOnboardingService';
import { providerBillingService } from '@/services/providerBillingService';
import { notificationService } from '@/services/notificationService';
import { auditTrailService } from '@/services/auditTrailService';
import { seedPlatformData } from './helpers/e2eContext';

describe('E2E: Admin Platform Management Journey', () => {
  const state: Record<string, any> = {};

  beforeAll(() => {
    vi.clearAllMocks();
    db.clear();
    seedPlatformData();
  });

  afterAll(() => {
    db.clear();
  });

  describe('Phase 1: Platform overview', () => {
    it('step 1 - admin views platform statistics', async () => {
      const stats = await adminService.getPlatformStats();
      expect(stats).toBeDefined();
      expect(stats.stats).toBeDefined();
    });

    it('step 2 - admin views audit trail for platform activity', async () => {
      await auditTrailService.logEvent({
        eventType: 'user_login',
        resourceType: 'user',
        resourceId: 'patient-user-1',
        actorId: 'patient-user-1',
        actorRole: 'patient',
        actionData: { method: 'email_password' },
      });

      await auditTrailService.logEvent({
        eventType: 'appointment_created',
        resourceType: 'appointment',
        resourceId: 'apt-1',
        actorId: 'patient-user-1',
        actorRole: 'patient',
        actionData: { provider_id: 'provider-1' },
      });

      const trail = await auditTrailService.getAuditTrail({ limit: 50 });
      expect(trail.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Phase 2: Provider application review workflow', () => {
    it('step 3 - new provider submits application', async () => {
      db.seed('user_profiles', [
        {
          id: 'applicant-user-1',
          email: 'dr.applicant@test.com',
          first_name: 'Emily',
          last_name: 'Chen',
          full_name: 'Dr. Emily Chen',
          role: 'provider',
        },
      ]);

      const app = await providerOnboardingService.createApplication(
        'applicant-user-1',
        {
          license_number: 'CPSO-88888',
          license_province: 'ON',
          specialty: 'Pediatrics',
          years_of_experience: 5,
          practice_name: 'Dr. Chen Pediatrics',
          practice_type: 'solo',
        }
      );
      state.applicationId = app.id;

      await providerOnboardingService.submitApplication(state.applicationId);
    });

    it('step 4 - admin views pending applications', async () => {
      const pending =
        await providerOnboardingService.getPendingApplications();
      expect(pending.length).toBeGreaterThanOrEqual(1);
    });

    it('step 5 - admin creates approval steps', async () => {
      const steps = await providerOnboardingService.createApprovalSteps(
        state.applicationId
      );
      expect(steps.length).toBe(5);
      state.steps = steps;
    });

    it('step 6 - admin approves all verification steps', async () => {
      for (const step of state.steps) {
        await providerOnboardingService.updateApprovalStep(
          step.id,
          'approved',
          'admin-user-1',
          'Credentials verified'
        );
      }

      const updatedSteps = await providerOnboardingService.getApprovalSteps(
        state.applicationId
      );
      const allApproved = updatedSteps.every(
        (s) => s.approval_status === 'approved'
      );
      expect(allApproved).toBe(true);
    });

    it('step 7 - admin approves the full application', async () => {
      await providerOnboardingService.approveApplication(
        state.applicationId,
        'admin-user-1'
      );

      const app = await providerOnboardingService.getApplication(
        state.applicationId
      );
      expect(app!.application_status).toBe('approved');
    });

    it('step 8 - provider record is now active', () => {
      const providers = db.getTable('providers').getAll();
      const newProvider = providers.find(
        (p) => p.user_id === 'applicant-user-1'
      );
      expect(newProvider).toBeDefined();
      expect(newProvider.is_active).toBe(true);
    });
  });

  describe('Phase 3: Provider application rejection flow', () => {
    it('step 9 - another provider submits an application', async () => {
      db.seed('user_profiles', [
        {
          id: 'rejected-user-1',
          email: 'dr.rejected@test.com',
          first_name: 'Mark',
          last_name: 'Wilson',
          full_name: 'Dr. Mark Wilson',
          role: 'provider',
        },
      ]);

      const app = await providerOnboardingService.createApplication(
        'rejected-user-1',
        {
          license_number: 'INVALID-LIC',
          license_province: 'ON',
          specialty: 'Surgery',
          years_of_experience: 2,
        }
      );
      state.rejectedAppId = app.id;

      await providerOnboardingService.submitApplication(
        state.rejectedAppId
      );
    });

    it('step 10 - admin rejects the application with reason', async () => {
      await providerOnboardingService.rejectApplication(
        state.rejectedAppId,
        'admin-user-1',
        'License number could not be verified with CPSO registry'
      );

      const app = await providerOnboardingService.getApplication(
        state.rejectedAppId
      );
      expect(app!.application_status).toBe('rejected');
    });

    it('step 11 - rejection is recorded in verification history', async () => {
      const history = await providerOnboardingService.getVerificationHistory(
        state.rejectedAppId
      );
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 4: Staff and role management', () => {
    it('step 12 - admin creates a custom role', async () => {
      const result = await adminService.createRole({
        role_name: 'billing_specialist',
        display_name: 'Billing Specialist',
        description: 'Can manage billing and payments',
        is_active: true,
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      state.roleId = result.data.id;
    });

    it('step 13 - admin creates a staff member', async () => {
      const result = await adminService.createStaffMember({
        user_id: 'admin-user-1',
        provider_id: 'provider-1',
        role_id: state.roleId,
        first_name: 'Alice',
        last_name: 'Manager',
        email: 'alice@clinic.com',
        is_active: true,
      });

      expect(result.error).toBeNull();
      state.staffId = result.data.id;
    });

    it('step 14 - admin views staff members', async () => {
      const result = await adminService.getStaffMembers('provider-1');
      expect(result.error).toBeNull();
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('step 15 - admin logs staff activity', async () => {
      const result = await adminService.logActivity({
        staff_id: state.staffId,
        action_type: 'login',
        description: 'Staff member logged in',
        ip_address: '192.168.1.1',
      });

      expect(result.error).toBeNull();
    });

    it('step 16 - admin views activity logs', async () => {
      const result = await adminService.getActivityLogs({
        staffId: state.staffId,
      });
      expect(result.error).toBeNull();
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Phase 5: Financial oversight', () => {
    it('step 17 - seed provider transactions for admin view', () => {
      db.seed('provider_transactions', [
        {
          id: 'ptx-1',
          provider_id: 'provider-1',
          patient_id: 'patient-1',
          transaction_type: 'consultation',
          amount: 15000,
          status: 'completed',
          payment_method: 'insurance',
        },
        {
          id: 'ptx-2',
          provider_id: 'provider-1',
          patient_id: 'patient-1',
          transaction_type: 'consultation',
          amount: 12000,
          status: 'completed',
          payment_method: 'credit_card',
        },
      ]);
    });

    it('step 18 - admin reviews provider transactions', async () => {
      const result =
        await providerBillingService.getTransactions('provider-1');
      expect(result.error).toBeNull();
      expect(result.data.length).toBeGreaterThanOrEqual(2);
    });

    it('step 19 - admin generates a patient billing statement', async () => {
      const result = await providerBillingService.generateStatement({
        provider_id: 'provider-1',
        patient_id: 'patient-1',
        statement_date: '2026-04-30',
        due_date: '2026-05-30',
        total_amount: 27000,
        status: 'draft',
        items: [
          { description: 'Derm consultation 04/15', amount: 15000 },
          { description: 'Follow-up 04/20', amount: 12000 },
        ],
      });

      expect(result.error).toBeNull();
      state.statementId = result.data.id;
    });

    it('step 20 - admin sends the statement to the patient', async () => {
      const result = await providerBillingService.sendStatement(
        state.statementId,
        'email'
      );
      expect(result.error).toBeNull();
    });
  });

  describe('Phase 6: Notification management', () => {
    it('step 21 - admin creates platform notification', async () => {
      const result = await notificationService.createNotification({
        userId: 'patient-user-1',
        type: 'system_announcement',
        category: 'system',
        priority: 'low',
        title: 'Platform Maintenance',
        message:
          'Scheduled maintenance on April 20th from 2-4 AM EST',
      });
      expect(result.error).toBeNull();
    });

    it('step 22 - admin verifies audit chain integrity', async () => {
      const integrity = await auditTrailService.verifyChainIntegrity();
      expect(integrity.isValid).toBe(true);
      expect(integrity.invalidBlocks).toBe(0);
    });

    it('step 23 - admin can run an integrity check', async () => {
      const check = await auditTrailService.runIntegrityCheck(1, 10, 'manual');
      expect(check).toBeDefined();
      expect(check.check_type).toBe('manual');
    });
  });
});
