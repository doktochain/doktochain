import { api } from '../lib/api-client';
import { storageClient } from '../lib/storage-client';
import { blockchainAuditService } from './blockchainAuditService';

export interface ProviderOnboardingApplication {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  provider_type: 'doctor' | 'dentist' | 'specialist' | 'nurse' | 'therapist' | 'pharmacist' | 'other';
  specialty?: string;
  sub_specialty?: string;
  professional_title?: string;
  license_number: string;
  license_province: string;
  license_expiry: string;
  years_of_experience: number;
  practice_name?: string;
  practice_address_line1?: string;
  practice_address_line2?: string;
  practice_city?: string;
  practice_province?: string;
  practice_postal_code?: string;
  practice_phone?: string;
  languages_spoken: string[];
  accepts_new_patients: boolean;
  bio?: string;
  professional_website?: string;
  application_status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'resubmission_required';
  submission_date?: string;
  review_started_at?: string;
  review_completed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  resubmission_notes?: string;
  resubmission_date?: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationDocument {
  id: string;
  provider_id?: string;
  application_id?: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  verification_status: 'pending' | 'verified' | 'rejected' | 'expired';
  verified_by?: string;
  verified_at?: string;
  expiry_date?: string;
  rejection_reason?: string;
  uploaded_at: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminApproval {
  id: string;
  application_id: string;
  provider_id?: string;
  approval_step: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'on_hold';
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  internal_notes?: string;
  rejection_reason?: string;
  required_actions?: string[];
  follow_up_required: boolean;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
}

export const providerOnboardingService = {
  async createApplication(userId: string, data: Partial<ProviderOnboardingApplication>): Promise<ProviderOnboardingApplication> {
    const { data: application, error } = await api.post<ProviderOnboardingApplication>('/provider-onboarding-applications', {
      user_id: userId,
      ...data,
      application_status: 'draft'
    });

    if (error) throw error;
    return application!;
  },

  async updateApplication(applicationId: string, data: Partial<ProviderOnboardingApplication>): Promise<ProviderOnboardingApplication> {
    const { updated_at: _drop, ...rest } = data as any;
    const { data: application, error } = await api.put<ProviderOnboardingApplication>(`/provider-onboarding-applications/${applicationId}`, rest);

    if (error) throw error;
    return application!;
  },

  async submitApplication(applicationId: string): Promise<ProviderOnboardingApplication> {
    const { data: application, error } = await api.put<ProviderOnboardingApplication>(`/provider-onboarding-applications/${applicationId}`, {
      application_status: 'submitted',
      submission_date: new Date().toISOString(),
    });

    if (error) throw error;

    await api.put('/providers', {
      filters: { user_id: application!.user_id },
      updates: { onboarding_status: 'submitted' }
    });

    await api.post('/provider-verification-history', {
      application_id: applicationId,
      action_type: 'application_submitted',
      action_description: 'Provider application submitted for review',
      performed_by: application!.user_id
    });

    return application!;
  },

  async getApplication(applicationId: string): Promise<ProviderOnboardingApplication | null> {
    const { data, error } = await api.get<ProviderOnboardingApplication>(`/provider-onboarding-applications/${applicationId}`);

    if (error) throw error;
    return data;
  },

  async getApplicationByUserId(userId: string): Promise<ProviderOnboardingApplication | null> {
    const { data, error } = await api.get<ProviderOnboardingApplication[]>('/provider-onboarding-applications', {
      params: { user_id: userId, order: 'created_at:desc', limit: 1 },
    });

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  async getPendingApplications(): Promise<ProviderOnboardingApplication[]> {
    const { data, error } = await api.get<ProviderOnboardingApplication[]>('/provider-onboarding-applications', {
      params: { application_status: 'submitted,under_review', order: 'submission_date:asc' },
    });

    if (error) throw error;
    return data || [];
  },

  async uploadDocument(applicationId: string, file: File, documentType: string): Promise<VerificationDocument> {
    const { publicUrl } = await storageClient.uploadFile('identity-documents', file);

    const { data: document, error: docError } = await api.post<VerificationDocument>('/provider-verification-documents', {
      application_id: applicationId,
      document_type: documentType,
      document_name: file.name,
      file_url: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      verification_status: 'pending'
    });

    if (docError) throw docError;

    await api.post('/provider-verification-history', {
      application_id: applicationId,
      action_type: 'document_uploaded',
      action_description: `Document uploaded: ${documentType}`,
      new_value: { document_type: documentType, document_name: file.name }
    });

    return document!;
  },

  async getApplicationDocuments(applicationId: string): Promise<VerificationDocument[]> {
    const { data, error } = await api.get<VerificationDocument[]>('/provider-verification-documents', {
      params: { application_id: applicationId, order_by: 'uploaded_at:desc' },
    });

    if (error) throw error;
    return data || [];
  },

  async verifyDocument(documentId: string, status: 'verified' | 'rejected', reviewerId: string, notes?: string): Promise<VerificationDocument> {
    const { data: document, error } = await api.put<VerificationDocument>(`/provider-verification-documents/${documentId}`, {
      verification_status: status,
      verified_by: reviewerId,
      verified_at: new Date().toISOString(),
      rejection_reason: status === 'rejected' ? notes : null,
    });

    if (error) throw error;

    await api.post('/provider-verification-history', {
      application_id: document!.application_id,
      action_type: status === 'verified' ? 'document_verified' : 'document_rejected',
      action_description: `Document ${status}: ${document!.document_type}`,
      performed_by: reviewerId
    });

    return document!;
  },

  async createApprovalSteps(applicationId: string): Promise<AdminApproval[]> {
    const steps = [
      'identity_verification',
      'license_verification',
      'credential_verification',
      'practice_verification',
      'final_approval'
    ];

    const approvals = await Promise.all(
      steps.map(async (step) => {
        const { data, error } = await api.post<AdminApproval>('/provider-admin-approvals', {
          application_id: applicationId,
          approval_step: step,
          approval_status: 'pending'
        });

        if (error) throw error;
        return data!;
      })
    );

    return approvals;
  },

  async updateApprovalStep(
    approvalId: string,
    status: 'approved' | 'rejected' | 'on_hold',
    reviewerId: string,
    notes?: string
  ): Promise<AdminApproval> {
    const { data: approval, error } = await api.put<AdminApproval>(`/provider-admin-approvals/${approvalId}`, {
      approval_status: status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      admin_notes: notes,
    });

    if (error) throw error;

    await api.post('/provider-verification-history', {
      application_id: approval!.application_id,
      action_type: 'application_reviewed',
      action_description: `Approval step ${status}: ${approval!.approval_step}`,
      performed_by: reviewerId
    });

    try {
      await blockchainAuditService.logEvent({
        eventType: 'provider_approval_step_updated',
        resourceType: 'provider_application',
        resourceId: approval!.application_id,
        actorId: reviewerId,
        actorRole: 'admin',
        actionData: {
          approval_id: approvalId,
          step: approval!.approval_step,
          status,
          notes,
        },
      });
    } catch {}

    return approval!;
  },

  async getApprovalSteps(applicationId: string): Promise<AdminApproval[]> {
    const { data, error } = await api.get<AdminApproval[]>('/provider-admin-approvals', {
      params: { application_id: applicationId, order_by: 'created_at:asc' },
    });

    if (error) throw error;
    return data || [];
  },

  async approveApplication(applicationId: string, reviewerId: string): Promise<void> {
    const { data: application } = await api.get<ProviderOnboardingApplication>(`/provider-onboarding-applications/${applicationId}`);

    if (!application) throw new Error('Application not found');

    const { data: existingProviders } = await api.get<any[]>('/providers', {
      params: { user_id: application.user_id },
    });

    const existingProvider = existingProviders && existingProviders.length > 0 ? existingProviders[0] : null;

    let providerId: string;

    if (existingProvider) {
      const { data: provider, error: providerError } = await api.put<any>(`/providers/${existingProvider.id}`, {
        provider_type: application.provider_type,
        license_number: application.license_number,
        license_province: application.license_province,
        license_expiry: application.license_expiry,
        professional_title: application.professional_title,
        bio: application.bio,
        years_of_experience: application.years_of_experience,
        languages_spoken: application.languages_spoken,
        accepts_new_patients: application.accepts_new_patients,
        is_verified: true,
        is_active: true,
        onboarding_status: 'approved',
        approved_by: reviewerId,
        approved_at: new Date().toISOString()
      });

      if (providerError) throw providerError;
      providerId = provider!.id;
    } else {
      const { data: provider, error: providerError } = await api.post<any>('/providers', {
        user_id: application.user_id,
        provider_type: application.provider_type,
        license_number: application.license_number,
        license_province: application.license_province,
        license_expiry: application.license_expiry,
        professional_title: application.professional_title,
        bio: application.bio,
        years_of_experience: application.years_of_experience,
        languages_spoken: application.languages_spoken,
        accepts_new_patients: application.accepts_new_patients,
        is_verified: true,
        is_active: true,
        onboarding_status: 'approved',
        approved_by: reviewerId,
        approved_at: new Date().toISOString()
      });

      if (providerError) throw providerError;
      providerId = provider!.id;
    }

    await api.put(`/provider-onboarding-applications/${applicationId}`, {
      application_status: 'approved',
      reviewed_by: reviewerId,
      review_completed_at: new Date().toISOString(),
    });

    await api.post('/provider-verification-history', {
      application_id: applicationId,
      provider_id: providerId,
      action_type: 'application_approved',
      action_description: 'Provider application approved and provider account activated',
      performed_by: reviewerId
    });

    try {
      await blockchainAuditService.logEvent({
        eventType: 'provider_application_approved',
        resourceType: 'provider_application',
        resourceId: applicationId,
        actorId: reviewerId,
        actorRole: 'admin',
        actionData: {
          application_id: applicationId,
          provider_id: providerId,
          applicant_user_id: application.user_id,
          action: 'approved',
        },
      });
    } catch {}
  },

  async rejectApplication(applicationId: string, reviewerId: string, reason: string): Promise<void> {
    const { data: application } = await api.get<ProviderOnboardingApplication>(`/provider-onboarding-applications/${applicationId}`);

    await api.put(`/provider-onboarding-applications/${applicationId}`, {
      application_status: 'rejected',
      reviewed_by: reviewerId,
      review_completed_at: new Date().toISOString(),
      rejection_reason: reason,
    });

    if (application) {
      await api.put('/providers', {
        filters: { user_id: application.user_id },
        updates: { onboarding_status: 'rejected' }
      });
    }

    await api.post('/provider-verification-history', {
      application_id: applicationId,
      action_type: 'application_rejected',
      action_description: 'Provider application rejected',
      performed_by: reviewerId,
      new_value: { rejection_reason: reason }
    });

    try {
      await blockchainAuditService.logEvent({
        eventType: 'provider_application_rejected',
        resourceType: 'provider_application',
        resourceId: applicationId,
        actorId: reviewerId,
        actorRole: 'admin',
        actionData: {
          application_id: applicationId,
          applicant_user_id: application?.user_id,
          action: 'rejected',
          reason,
        },
      });
    } catch {}
  },

  async requestResubmission(applicationId: string, reviewerId: string, notes: string): Promise<void> {
    await api.put(`/provider-onboarding-applications/${applicationId}`, {
      application_status: 'resubmission_required',
      reviewed_by: reviewerId,
      resubmission_notes: notes,
      resubmission_date: new Date().toISOString(),
    });

    await api.post('/provider-verification-history', {
      application_id: applicationId,
      action_type: 'resubmission_requested',
      action_description: 'Resubmission requested for provider application',
      performed_by: reviewerId,
      new_value: { resubmission_notes: notes }
    });
  },

  async getVerificationHistory(applicationId: string): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/provider-verification-history', {
      params: { application_id: applicationId, order: 'created_at:desc' },
    });

    if (error) throw error;
    return data || [];
  },

  async getAllApplications(statusFilter?: string): Promise<ProviderOnboardingApplication[]> {
    const params: Record<string, any> = { order: 'created_at:desc' };

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        params.application_status = 'submitted,under_review';
      } else {
        params.application_status = statusFilter;
      }
    }

    const { data, error } = await api.get<ProviderOnboardingApplication[]>('/provider-onboarding-applications', { params });
    if (error) throw error;
    return data || [];
  }
};
