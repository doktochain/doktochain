import { api } from '../lib/api-client';
import { auditTrailService } from './auditTrailService';

export interface ConsentRecord {
  id: string;
  patient_id: string;
  provider_id: string | null;
  pharmacy_id?: string | null;
  consent_type: string;
  consent_scope: 'appointment' | 'broad';
  appointment_id?: string | null;
  access_start?: string | null;
  access_end?: string | null;
  record_types: string[];
  start_date: string;
  end_date: string | null;
  status: string;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsentCheckResult {
  hasConsent: boolean;
  consent: ConsentRecord | null;
  reason?: string;
  consentScope?: 'appointment' | 'broad';
  windowEnd?: string;
}

export const consentService = {
  async verifyProviderConsent(
    patientId: string,
    providerId: string,
    recordType?: string
  ): Promise<ConsentCheckResult> {
    const { data, error } = await api.get<ConsentRecord[]>('/patient-consents', {
      params: {
        patient_id: patientId,
        provider_id: providerId,
        status: 'active',
      },
    });

    if (error) {
      return { hasConsent: false, consent: null, reason: 'Error checking consent' };
    }

    const now = new Date();

    const activeConsent = ((data as ConsentRecord[]) || []).find((c: ConsentRecord) => {
      if (c.consent_scope === 'appointment') {
        if (!c.access_start || !c.access_end) return false;
        if (new Date(c.access_start) > now || new Date(c.access_end) < now) return false;
      } else {
        if (new Date(c.start_date) > now) return false;
        if (c.end_date && new Date(c.end_date) < now) return false;
      }
      if (recordType && c.record_types.length > 0 && !c.record_types.includes(recordType)) return false;
      return true;
    });

    if (!activeConsent) {
      await auditTrailService.logEventSafe({
        eventType: 'consent_checked',
        resourceType: 'consent',
        resourceId: patientId,
        actorId: providerId,
        actorRole: 'provider',
        actionData: {
          patient_id: patientId,
          provider_id: providerId,
          requested_record_type: recordType || 'all',
          result: 'denied',
        },
      });

      return {
        hasConsent: false,
        consent: null,
        reason: 'No active consent for this patient'
      };
    }

    return {
      hasConsent: true,
      consent: activeConsent,
      consentScope: activeConsent.consent_scope,
      windowEnd: activeConsent.consent_scope === 'appointment' ? activeConsent.access_end || undefined : activeConsent.end_date || undefined,
    };
  },

  async verifyAndLogAccess(
    patientId: string,
    providerId: string,
    actorUserId: string,
    resourceType: string,
    recordType?: string
  ): Promise<ConsentCheckResult> {
    const result = await this.verifyProviderConsent(patientId, providerId, recordType);

    if (result.hasConsent && result.consent) {
      await auditTrailService.logEventSafe({
        eventType: 'data_access',
        resourceType,
        resourceId: patientId,
        actorId: actorUserId,
        actorRole: 'provider',
        actionData: {
          accessed_data: recordType || 'all',
          consent_id: result.consent.id,
          consent_scope: result.consent.consent_scope,
          patient_id: patientId,
          provider_id: providerId,
        },
      });
    }

    return result;
  },

  async createAppointmentConsent(params: {
    patientId: string;
    providerId: string;
    appointmentId: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
  }): Promise<{ data: ConsentRecord | null; error: Error | null }> {
    try {
      const dateStr = params.appointmentDate;
      const accessStart = new Date(`${dateStr}T${params.startTime}`);
      accessStart.setMinutes(accessStart.getMinutes() - 20);
      const accessEnd = new Date(`${dateStr}T${params.endTime}`);
      accessEnd.setMinutes(accessEnd.getMinutes() + 20);

      const { data, error } = await api.post<ConsentRecord>('/patient-consents', {
        patient_id: params.patientId,
        provider_id: params.providerId,
        consent_type: 'treatment',
        consent_scope: 'appointment',
        appointment_id: params.appointmentId,
        record_types: [],
        start_date: dateStr,
        end_date: dateStr,
        access_start: accessStart.toISOString(),
        access_end: accessEnd.toISOString(),
        status: 'active',
      });

      if (error) throw new Error(error.message);

      await auditTrailService.logEventSafe({
        eventType: 'consent_window_created',
        resourceType: 'consent',
        resourceId: data!.id,
        actorId: params.patientId,
        actorRole: 'patient',
        actionData: {
          patient_id: params.patientId,
          provider_id: params.providerId,
          appointment_id: params.appointmentId,
          consent_scope: 'appointment',
          access_start: accessStart.toISOString(),
          access_end: accessEnd.toISOString(),
        },
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async updateAppointmentConsentWindow(params: {
    appointmentId: string;
    newDate: string;
    newStartTime: string;
    newEndTime: string;
    actorId: string;
  }): Promise<void> {
    const accessStart = new Date(`${params.newDate}T${params.newStartTime}`);
    accessStart.setMinutes(accessStart.getMinutes() - 20);
    const accessEnd = new Date(`${params.newDate}T${params.newEndTime}`);
    accessEnd.setMinutes(accessEnd.getMinutes() + 20);

    const { data: consent } = await api.get<ConsentRecord>('/patient-consents', {
      params: {
        appointment_id: params.appointmentId,
        consent_scope: 'appointment',
        status: 'active',
        limit: '1',
      },
    });

    if (consent) {
      await api.put(`/patient-consents/${(consent as ConsentRecord).id}`, {
        access_start: accessStart.toISOString(),
        access_end: accessEnd.toISOString(),
        start_date: params.newDate,
        end_date: params.newDate,
        updated_at: new Date().toISOString(),
      });

      await auditTrailService.logEventSafe({
        eventType: 'consent_window_extended',
        resourceType: 'consent',
        resourceId: (consent as ConsentRecord).id,
        actorId: params.actorId,
        actorRole: 'system',
        actionData: {
          appointment_id: params.appointmentId,
          new_access_start: accessStart.toISOString(),
          new_access_end: accessEnd.toISOString(),
          reason: 'appointment_rescheduled',
        },
      });
    }
  },

  async revokeAppointmentConsent(appointmentId: string, actorId: string): Promise<void> {
    const { data: consent } = await api.get<ConsentRecord>('/patient-consents', {
      params: {
        appointment_id: appointmentId,
        consent_scope: 'appointment',
        status: 'active',
        limit: '1',
        select: 'id,patient_id,provider_id',
      },
    });

    if (consent) {
      const consentRecord = consent as ConsentRecord;
      await api.put(`/patient-consents/${consentRecord.id}`, {
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await auditTrailService.logEventSafe({
        eventType: 'consent_revoked',
        resourceType: 'consent',
        resourceId: consentRecord.id,
        actorId,
        actorRole: 'system',
        actionData: {
          appointment_id: appointmentId,
          patient_id: consentRecord.patient_id,
          provider_id: consentRecord.provider_id,
          reason: 'appointment_cancelled',
        },
      });
    }
  },

  async grantConsent(params: {
    patientId: string;
    providerId: string;
    consentType?: string;
    recordTypes?: string[];
    durationDays?: number;
  }): Promise<{ data: ConsentRecord | null; error: Error | null }> {
    try {
      const startDate = new Date();
      const endDate = params.durationDays
        ? new Date(startDate.getTime() + params.durationDays * 24 * 60 * 60 * 1000)
        : null;

      const { data, error } = await api.post<ConsentRecord>('/patient-consents', {
        patient_id: params.patientId,
        provider_id: params.providerId,
        consent_type: params.consentType || 'record_access',
        consent_scope: 'broad',
        record_types: params.recordTypes || [],
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate ? endDate.toISOString().split('T')[0] : null,
        status: 'active'
      });

      if (error) throw new Error(error.message);

      await auditTrailService.logEventSafe({
        eventType: 'consent_granted',
        resourceType: 'consent',
        resourceId: data!.id,
        actorId: params.patientId,
        actorRole: 'patient',
        actionData: {
          patient_id: params.patientId,
          provider_id: params.providerId,
          consent_type: params.consentType || 'record_access',
          consent_scope: 'broad',
          record_types: params.recordTypes || [],
          duration_days: params.durationDays || 'indefinite'
        }
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async revokeConsent(
    consentId: string,
    patientId: string,
    providerId: string
  ): Promise<{ data: boolean; error: Error | null }> {
    try {
      const { error } = await api.put(`/patient-consents/${consentId}`, {
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        patient_id: patientId,
      });

      if (error) throw new Error(error.message);

      await auditTrailService.logEventSafe({
        eventType: 'consent_revoked',
        resourceType: 'consent',
        resourceId: consentId,
        actorId: patientId,
        actorRole: 'patient',
        actionData: {
          patient_id: patientId,
          provider_id: providerId,
          revoked_at: new Date().toISOString()
        }
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  async verifyPharmacyConsent(
    patientId: string,
    pharmacyId: string,
    recordType?: string
  ): Promise<ConsentCheckResult> {
    const now = new Date().toISOString();
    const { data, error } = await api.get<ConsentRecord[]>('/patient-consents', {
      params: {
        patient_id: patientId,
        pharmacy_id: pharmacyId,
        status: 'active',
        start_date_lte: now,
      },
    });

    if (error) {
      return { hasConsent: false, consent: null, reason: 'Error checking consent' };
    }

    const activeConsent = ((data as ConsentRecord[]) || []).find((c: ConsentRecord) => {
      if (c.end_date && new Date(c.end_date) < new Date()) return false;
      if (recordType && c.record_types.length > 0 && !c.record_types.includes(recordType)) return false;
      return true;
    });

    if (!activeConsent) {
      return {
        hasConsent: false,
        consent: null,
        reason: 'No active pharmacy consent for this patient'
      };
    }

    return { hasConsent: true, consent: activeConsent };
  },

  async grantPharmacyConsent(params: {
    patientId: string;
    pharmacyId: string;
    consentType?: string;
    recordTypes?: string[];
    durationDays?: number;
  }): Promise<{ data: ConsentRecord | null; error: Error | null }> {
    try {
      const startDate = new Date();
      const endDate = params.durationDays
        ? new Date(startDate.getTime() + params.durationDays * 24 * 60 * 60 * 1000)
        : null;

      const { data, error } = await api.post<ConsentRecord>('/patient-consents', {
        patient_id: params.patientId,
        pharmacy_id: params.pharmacyId,
        consent_type: params.consentType || 'data_sharing',
        consent_scope: 'broad',
        record_types: params.recordTypes || [],
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate ? endDate.toISOString().split('T')[0] : null,
        status: 'active'
      });

      if (error) throw new Error(error.message);

      await auditTrailService.logEventSafe({
        eventType: 'consent_granted',
        resourceType: 'consent',
        resourceId: data!.id,
        actorId: params.patientId,
        actorRole: 'patient',
        actionData: {
          patient_id: params.patientId,
          pharmacy_id: params.pharmacyId,
          consent_scope: 'broad',
          consent_type: params.consentType || 'data_sharing',
          record_types: params.recordTypes || [],
          duration_days: params.durationDays || 'indefinite'
        }
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getPatientConsents(patientId: string): Promise<{
    data: ConsentRecord[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<ConsentRecord[]>('/patient-consents', {
        params: {
          patient_id: patientId,
          order: 'created_at.desc',
          include: 'providers,user_profiles',
        },
      });

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getProviderConsentsForPatient(
    providerId: string,
    patientId: string
  ): Promise<ConsentRecord | null> {
    const now = new Date();
    const { data } = await api.get<ConsentRecord[]>('/patient-consents', {
      params: {
        patient_id: patientId,
        provider_id: providerId,
        status: 'active',
        order: 'created_at.desc',
      },
    });

    if (!data || (data as ConsentRecord[]).length === 0) return null;

    const active = (data as ConsentRecord[]).find((c: ConsentRecord) => {
      if (c.consent_scope === 'appointment') {
        if (!c.access_start || !c.access_end) return false;
        return new Date(c.access_start) <= now && new Date(c.access_end) >= now;
      }
      if (new Date(c.start_date) > now) return false;
      if (c.end_date && new Date(c.end_date) < now) return false;
      return true;
    });

    return active || null;
  },

  async getActiveConsentInfo(
    providerId: string,
    patientId: string
  ): Promise<{ scope: 'appointment' | 'broad'; windowEnd: string | null; consentId: string } | null> {
    const consent = await this.getProviderConsentsForPatient(providerId, patientId);
    if (!consent) return null;

    return {
      scope: consent.consent_scope,
      windowEnd: consent.consent_scope === 'appointment' ? consent.access_end || null : consent.end_date,
      consentId: consent.id,
    };
  },
};
