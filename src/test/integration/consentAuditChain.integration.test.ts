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

import { consentService } from '../../services/consentService';
import { auditTrailService } from '../../services/auditTrailService';

describe('Integration: Consent + Audit Chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.clear();
  });

  afterEach(() => {
    db.clear();
  });

  describe('consent grant flow with audit logging', () => {
    it('creates consent record and logs audit event', async () => {
      const result = await consentService.grantConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        consentType: 'record_access',
        recordTypes: ['lab_results', 'medications'],
        durationDays: 30,
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.patient_id).toBe('patient-1');
      expect(result.data!.provider_id).toBe('provider-1');
      expect(result.data!.consent_scope).toBe('broad');
      expect(result.data!.status).toBe('active');

      const consents = db.getTable('patient_consents').getAll();
      expect(consents.length).toBe(1);

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].event_type).toBe('consent_granted');
      expect(auditLogs[0].resource_id).toBe(result.data!.id);
      expect(auditLogs[0].actor_id).toBe('patient-1');
      expect(auditLogs[0].actor_role).toBe('patient');
      expect(auditLogs[0].action_data.provider_id).toBe('provider-1');
    });

    it('verifies consent after grant', async () => {
      await consentService.grantConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        recordTypes: [],
      });

      const check = await consentService.verifyProviderConsent(
        'patient-1',
        'provider-1'
      );

      expect(check.hasConsent).toBe(true);
      expect(check.consent).not.toBeNull();
      expect(check.consentScope).toBe('broad');
    });

    it('denies access without consent and logs denial', async () => {
      const check = await consentService.verifyProviderConsent(
        'patient-1',
        'provider-1',
        'lab_results'
      );

      expect(check.hasConsent).toBe(false);
      expect(check.reason).toBe('No active consent for this patient');

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].event_type).toBe('consent_checked');
      expect(auditLogs[0].action_data.result).toBe('denied');
    });
  });

  describe('appointment consent with time windows', () => {
    it('creates appointment consent with 20min buffer', async () => {
      const result = await consentService.createAppointmentConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        appointmentId: 'apt-1',
        appointmentDate: '2026-04-15',
        startTime: '09:00',
        endTime: '09:30',
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.consent_scope).toBe('appointment');
      expect(result.data!.appointment_id).toBe('apt-1');

      const accessStart = new Date(result.data!.access_start!);
      const accessEnd = new Date(result.data!.access_end!);
      expect(accessStart.getHours()).toBe(8);
      expect(accessStart.getMinutes()).toBe(40);
      expect(accessEnd.getHours()).toBe(9);
      expect(accessEnd.getMinutes()).toBe(50);

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].event_type).toBe('consent_window_created');
      expect(auditLogs[0].action_data.appointment_id).toBe('apt-1');
    });

    it('revokes consent on appointment cancellation and logs it', async () => {
      const { data: consent } = await consentService.createAppointmentConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        appointmentId: 'apt-2',
        appointmentDate: '2026-04-16',
        startTime: '14:00',
        endTime: '14:30',
      });

      expect(consent).not.toBeNull();

      await consentService.revokeAppointmentConsent('apt-2', 'system');

      const consents = db.getTable('patient_consents').getAll();
      const revokedConsent = consents.find((c) => c.appointment_id === 'apt-2');
      expect(revokedConsent!.status).toBe('revoked');
      expect(revokedConsent!.revoked_at).toBeDefined();

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const revocationLog = auditLogs.find(
        (l) => l.event_type === 'consent_revoked'
      );
      expect(revocationLog).toBeDefined();
      expect(revocationLog!.action_data.reason).toBe('appointment_cancelled');
    });

    it('updates consent window on reschedule and logs it', async () => {
      await consentService.createAppointmentConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        appointmentId: 'apt-3',
        appointmentDate: '2026-04-17',
        startTime: '11:00',
        endTime: '11:30',
      });

      await consentService.updateAppointmentConsentWindow({
        appointmentId: 'apt-3',
        newDate: '2026-04-18',
        newStartTime: '15:00',
        newEndTime: '15:30',
        actorId: 'patient-1',
      });

      const consents = db.getTable('patient_consents').getAll();
      const updatedConsent = consents.find((c) => c.appointment_id === 'apt-3');
      expect(updatedConsent!.start_date).toBe('2026-04-18');

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const extendLog = auditLogs.find(
        (l) => l.event_type === 'consent_window_extended'
      );
      expect(extendLog).toBeDefined();
      expect(extendLog!.action_data.reason).toBe('appointment_rescheduled');
    });
  });

  describe('consent revocation flow', () => {
    it('grants and revokes consent with full audit trail', async () => {
      const { data: consent } = await consentService.grantConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        recordTypes: ['lab_results'],
        durationDays: 90,
      });

      expect(consent).not.toBeNull();

      const beforeRevoke = await consentService.verifyProviderConsent(
        'patient-1',
        'provider-1',
        'lab_results'
      );
      expect(beforeRevoke.hasConsent).toBe(true);

      await consentService.revokeConsent(consent!.id, 'patient-1', 'provider-1');

      const afterRevoke = await consentService.verifyProviderConsent(
        'patient-1',
        'provider-1',
        'lab_results'
      );
      expect(afterRevoke.hasConsent).toBe(false);

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const eventTypes = auditLogs.map((l) => l.event_type);
      expect(eventTypes).toContain('consent_granted');
      expect(eventTypes).toContain('consent_revoked');
      expect(eventTypes).toContain('consent_checked');
    });
  });

  describe('pharmacy consent flow', () => {
    it('creates pharmacy consent and verifies it', async () => {
      const { data, error } = await consentService.grantPharmacyConsent({
        patientId: 'patient-1',
        pharmacyId: 'pharmacy-1',
        consentType: 'data_sharing',
        recordTypes: ['prescriptions'],
        durationDays: 365,
      });

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.pharmacy_id).toBe('pharmacy-1');

      const check = await consentService.verifyPharmacyConsent(
        'patient-1',
        'pharmacy-1'
      );
      expect(check.hasConsent).toBe(true);
    });

    it('denies pharmacy access without consent', async () => {
      const check = await consentService.verifyPharmacyConsent(
        'patient-1',
        'pharmacy-1'
      );
      expect(check.hasConsent).toBe(false);
      expect(check.reason).toBe('No active pharmacy consent for this patient');
    });
  });

  describe('audit chain hash integrity', () => {
    it('builds hash chain across multiple events', async () => {
      await consentService.grantConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
      });

      await consentService.grantPharmacyConsent({
        patientId: 'patient-1',
        pharmacyId: 'pharmacy-1',
      });

      await consentService.createAppointmentConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        appointmentId: 'apt-10',
        appointmentDate: '2026-05-01',
        startTime: '10:00',
        endTime: '10:30',
      });

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      expect(auditLogs.length).toBe(3);

      for (const log of auditLogs) {
        expect(log.current_hash).toBeDefined();
        expect(log.current_hash.length).toBe(64);
      }

      expect(auditLogs[1].previous_hash).toBe(auditLogs[0].current_hash);
      expect(auditLogs[2].previous_hash).toBe(auditLogs[1].current_hash);
    });

    it('first block has null previous_hash', async () => {
      await consentService.grantConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
      });

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      expect(auditLogs[0].previous_hash).toBeNull();
    });

    it('verifies chain integrity through service', async () => {
      await auditTrailService.logEvent({
        eventType: 'consent_granted',
        resourceType: 'consent',
        resourceId: 'c1',
        actionData: { test: true },
      });

      await auditTrailService.logEvent({
        eventType: 'consent_checked',
        resourceType: 'consent',
        resourceId: 'c2',
        actionData: { test: true },
      });

      const result = await auditTrailService.verifyChainIntegrity();
      expect(result.totalBlocks).toBe(2);
      expect(result.isValid).toBe(true);
      expect(result.invalidBlocks).toBe(0);
      expect(result.validBlocks).toBe(2);
    });
  });

  describe('consent with record type filtering', () => {
    it('grants consent for specific record types and enforces them', async () => {
      await consentService.grantConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        recordTypes: ['lab_results', 'medications'],
      });

      const labCheck = await consentService.verifyProviderConsent(
        'patient-1',
        'provider-1',
        'lab_results'
      );
      expect(labCheck.hasConsent).toBe(true);

      const medCheck = await consentService.verifyProviderConsent(
        'patient-1',
        'provider-1',
        'medications'
      );
      expect(medCheck.hasConsent).toBe(true);

      const immunCheck = await consentService.verifyProviderConsent(
        'patient-1',
        'provider-1',
        'immunizations'
      );
      expect(immunCheck.hasConsent).toBe(false);
    });

    it('empty record_types grants access to all types', async () => {
      await consentService.grantConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        recordTypes: [],
      });

      const check = await consentService.verifyProviderConsent(
        'patient-1',
        'provider-1',
        'anything'
      );
      expect(check.hasConsent).toBe(true);
    });
  });

  describe('verifyAndLogAccess integration', () => {
    it('logs data_access event on successful consent check', async () => {
      await consentService.grantConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
      });

      const result = await consentService.verifyAndLogAccess(
        'patient-1',
        'provider-1',
        'provider-user-1',
        'health_record',
        'lab_results'
      );

      expect(result.hasConsent).toBe(true);

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const accessLog = auditLogs.find((l) => l.event_type === 'data_access');
      expect(accessLog).toBeDefined();
      expect(accessLog!.resource_type).toBe('health_record');
      expect(accessLog!.actor_id).toBe('provider-user-1');
    });

    it('does not log data_access event when consent denied', async () => {
      const result = await consentService.verifyAndLogAccess(
        'patient-1',
        'provider-1',
        'provider-user-1',
        'health_record'
      );

      expect(result.hasConsent).toBe(false);

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const accessLog = auditLogs.find((l) => l.event_type === 'data_access');
      expect(accessLog).toBeUndefined();

      const deniedLog = auditLogs.find((l) => l.event_type === 'consent_checked');
      expect(deniedLog).toBeDefined();
    });
  });
});
