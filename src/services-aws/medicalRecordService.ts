import { api } from '../lib/api-client';
import { storageService } from './storageService';
import { consentService } from './consentService';
import { auditLog } from './auditLogger';

export interface MedicalRecord {
  id: string;
  patient_id: string;
  provider_id: string | null;
  record_type: 'lab-result' | 'imaging' | 'document' | 'report' | 'note';
  title: string;
  description: string | null;
  record_date: string;
  file_url: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  category: string | null;
  tags: string[] | null;
  is_shared: boolean;
  created_at: string;
}

export const medicalRecordService = {
  async createMedicalRecord(
    patientId: string,
    recordData: {
      record_type: string;
      title: string;
      description?: string;
      record_date: string;
      category?: string;
      tags?: string[];
      provider_id?: string;
    },
    file?: File
  ): Promise<MedicalRecord> {
    if (recordData.provider_id) {
      const consent = await consentService.verifyProviderConsent(patientId, recordData.provider_id, 'medical_records');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    let fileUrl: string | null = null;
    let fileType: string | null = null;
    let fileSizeBytes: number | null = null;

    if (file) {
      fileUrl = await storageService.uploadMedicalRecord(file, patientId);
      fileType = file.type;
      fileSizeBytes = file.size;
    }

    const { data, error } = await api.post<MedicalRecord>('/medical-records', {
      patient_id: patientId,
      ...recordData,
      file_url: fileUrl,
      file_type: fileType,
      file_size_bytes: fileSizeBytes,
    });

    if (error) throw new Error(error.message);

    try {
      await auditLog.dataAccessed('medical_record', data!.id, recordData.provider_id || patientId, recordData.provider_id ? 'provider' : 'patient', {
        action: 'created',
        title: recordData.title,
        record_type: recordData.record_type,
        patient_id: patientId,
      });
    } catch {}

    return data!;
  },

  async getPatientRecords(patientId: string, recordType?: string, providerId?: string): Promise<MedicalRecord[]> {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'medical_records');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const params: Record<string, string> = {
      patient_id: patientId,
      order: 'record_date.desc',
    };

    if (recordType) {
      params.record_type = recordType;
    }

    const { data, error } = await api.get<MedicalRecord[]>('/medical-records', { params });

    if (error) throw new Error(error.message);

    if (providerId) {
      try {
        await auditLog.dataAccessed('medical_record', patientId, providerId, 'provider', {
          action: 'read',
          record_type: recordType || 'all',
          patient_id: patientId,
          records_count: (data || []).length,
        });
      } catch {}
    }

    return data || [];
  },

  async getMedicalRecord(recordId: string, providerId?: string): Promise<MedicalRecord | null> {
    const { data, error } = await api.get<MedicalRecord>(`/medical-records/${recordId}`);

    if (error) throw new Error(error.message);

    if (data && providerId) {
      const consent = await consentService.verifyProviderConsent(data.patient_id, providerId, 'medical_records');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');

      try {
        await auditLog.dataAccessed('medical_record', recordId, providerId, 'provider', {
          action: 'read',
          patient_id: data.patient_id,
          title: data.title,
        });
      } catch {}
    }

    return data;
  },

  async updateMedicalRecord(
    recordId: string,
    updates: Partial<MedicalRecord>,
    providerId?: string
  ): Promise<MedicalRecord> {
    if (providerId) {
      const existing = await this.getMedicalRecord(recordId);
      if (existing) {
        const consent = await consentService.verifyProviderConsent(existing.patient_id, providerId, 'medical_records');
        if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
      }
    }

    const { data, error } = await api.put<MedicalRecord>(`/medical-records/${recordId}`, updates);

    if (error) throw new Error(error.message);

    if (providerId) {
      try {
        await auditLog.dataAccessed('medical_record', recordId, providerId, 'provider', { action: 'update' });
      } catch {}
    }

    return data!;
  },

  async deleteMedicalRecord(recordId: string, actorId?: string): Promise<void> {
    const record = await this.getMedicalRecord(recordId);

    if (record?.file_url) {
      try {
        const urlParts = record.file_url.split('/');
        const path = urlParts.slice(-2).join('/');
        await storageService.deleteFile('medical-records', path);
      } catch {}
    }

    const { error } = await api.delete(`/medical-records/${recordId}`);

    if (error) throw new Error(error.message);

    if (actorId) {
      try {
        await auditLog.dataAccessed('medical_record', recordId, actorId, 'patient', { action: 'delete' });
      } catch {}
    }
  },

  async shareMedicalRecord(recordId: string, providerId: string, patientId?: string): Promise<void> {
    const { error } = await api.post(`/medical-records/${recordId}/share`, {
      provider_id: providerId,
    });

    if (error) throw new Error(error.message);

    try {
      await auditLog.recordShared(recordId, patientId || '', {
        shared_with_provider: providerId,
        record_id: recordId,
      });
    } catch {}
  },

  async downloadFile(recordId: string, providerId?: string): Promise<Blob> {
    const record = await this.getMedicalRecord(recordId);

    if (!record?.file_url) {
      throw new Error('No file attached to this record');
    }

    if (providerId) {
      const consent = await consentService.verifyProviderConsent(record.patient_id, providerId, 'medical_records');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');

      try {
        await auditLog.dataAccessed('medical_record', recordId, providerId, 'provider', { action: 'download' });
      } catch {}
    }

    const urlParts = record.file_url.split('/');
    const path = urlParts.slice(-2).join('/');

    return await storageService.downloadFile('medical-records', path);
  },
};
