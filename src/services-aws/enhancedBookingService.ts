import { api } from '../lib/api-client';
import { storageClient } from '../lib/storage-client';
import { auditTrailService } from './auditTrailService';
import { consentService } from './consentService';
import { notificationService } from './notificationService';

export interface BookingServiceType {
  id: string;
  name: string;
  category: string;
  description: string;
  typicalDuration: number;
  requiresQuestionnaire: boolean;
}

export interface ConsentForm {
  id: string;
  formType: 'ehr_access' | 'telemedicine' | 'privacy_policy' | 'treatment' | 'photo_video';
  formTitle: string;
  formContent: string;
}

export interface QuestionnaireQuestion {
  id: string;
  questionText: string;
  questionType: 'text' | 'textarea' | 'single_choice' | 'multiple_choice' | 'rating' | 'date' | 'boolean';
  options?: any;
  isRequired: boolean;
  displayOrder: number;
}

export interface BookingData {
  providerId: string;
  serviceId: string;
  consultationType: 'in_person' | 'virtual' | 'phone' | 'home_visit';
  locationId?: string;
  slotId: string;
  appointmentDate: string;
  appointmentTime: string;
  reasonForVisit: string;
  symptoms?: string;
  symptomDuration?: string;
  currentMedications?: string;
  allergies?: string;
  insurancePolicyId?: string;
  paymentMethod?: 'insurance' | 'self_pay';
  reminderPreferences?: ('email' | 'sms' | 'push')[];
}

export const enhancedBookingService = {
  async getServiceTypes(): Promise<BookingServiceType[]> {
    try {
      const { data, error } = await api.get<any[]>('/appointment-services', {
        params: { order_by: 'name:asc' },
      });

      if (error) throw error;

      return (data || []).map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        description: s.description,
        typicalDuration: s.typical_duration,
        requiresQuestionnaire: s.requires_questionnaire,
      }));
    } catch (error) {
      console.error('Error fetching service types:', error);
      throw error;
    }
  },

  async getProviderServices(providerId: string): Promise<any[]> {
    try {
      const { data, error } = await api.get<any[]>('/provider-services', {
        params: { provider_id: providerId },
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching provider services:', error);
      throw error;
    }
  },

  async getProviderAvailability(
    providerId: string,
    startDate: string,
    endDate: string,
    consultationType: 'virtual' | 'in_person'
  ): Promise<any[]> {
    try {
      const { data, error } = await api.get<any[]>('/provider-time-slots', {
        params: {
          provider_id: providerId,
          is_available: true,
          slot_date_gte: startDate,
          slot_date_lte: endDate,
          is_virtual: consultationType === 'virtual',
          include: 'provider_locations',
          order_by: 'slot_date:asc,slot_time:asc',
        },
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching provider availability:', error);
      throw error;
    }
  },

  async getQuestionnaireForService(serviceId: string): Promise<QuestionnaireQuestion[]> {
    try {
      const { data, error } = await api.get<any[]>('/appointment-questionnaires', {
        params: {
          service_id: serviceId,
          order_by: 'display_order:asc',
        },
      });

      if (error) throw error;

      return (data || []).map(q => ({
        id: q.id,
        questionText: q.question_text,
        questionType: q.question_type,
        options: q.options,
        isRequired: q.is_required,
        displayOrder: q.display_order,
      }));
    } catch (error) {
      console.error('Error fetching questionnaire:', error);
      throw error;
    }
  },

  async saveQuestionnaireDraft(
    appointmentId: string,
    responses: Record<string, any>
  ): Promise<void> {
    try {
      const responsesToSave = Object.entries(responses).map(([questionnaireId, response]) => ({
        appointment_id: appointmentId,
        questionnaire_id: questionnaireId,
        response_text: typeof response === 'string' ? response : null,
        response_data: typeof response === 'object' ? response : null,
        is_draft: true,
      }));

      const { error } = await api.put('/appointment-questionnaire-responses', responsesToSave);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving questionnaire draft:', error);
      throw error;
    }
  },

  async submitQuestionnaire(
    appointmentId: string,
    responses: Record<string, any>
  ): Promise<void> {
    try {
      const responsesToSave = Object.entries(responses).map(([questionnaireId, response]) => ({
        appointment_id: appointmentId,
        questionnaire_id: questionnaireId,
        response_text: typeof response === 'string' ? response : null,
        response_data: typeof response === 'object' ? response : null,
        is_draft: false,
        submitted_at: new Date().toISOString(),
      }));

      const { error } = await api.put('/appointment-questionnaire-responses', responsesToSave);

      if (error) throw error;
    } catch (error) {
      console.error('Error submitting questionnaire:', error);
      throw error;
    }
  },

  async getConsentForms(consultationType: string): Promise<ConsentForm[]> {
    const forms: ConsentForm[] = [
      {
        id: 'ehr_access',
        formType: 'ehr_access',
        formTitle: 'Electronic Health Records Access Consent',
        formContent: `I hereby authorize DoktoChain and its healthcare providers to access my electronic health records for the purpose of providing medical care and treatment. I understand that my health information will be kept confidential and used only for healthcare purposes.`,
      },
      {
        id: 'privacy_policy',
        formType: 'privacy_policy',
        formTitle: 'Privacy Policy Acknowledgment',
        formContent: `I acknowledge that I have read and understand the DoktoChain Privacy Policy. I consent to the collection, use, and disclosure of my personal health information as described in the Privacy Policy.`,
      },
      {
        id: 'treatment',
        formType: 'treatment',
        formTitle: 'Treatment Consent',
        formContent: `I consent to receive medical treatment from the healthcare provider. I understand the nature of the treatment and its potential risks and benefits. I have had the opportunity to ask questions and they have been answered to my satisfaction.`,
      },
    ];

    if (consultationType === 'virtual') {
      forms.push({
        id: 'telemedicine',
        formType: 'telemedicine',
        formTitle: 'Telemedicine Consent',
        formContent: `I consent to receive healthcare services via telemedicine. I understand that telemedicine involves electronic communication of my medical information. I understand the potential risks including technical difficulties and limitations of remote examination.`,
      });
    }

    return forms;
  },

  async signConsentForm(
    appointmentId: string,
    formType: string,
    formTitle: string,
    formContent: string,
    signature: string,
    ipAddress: string
  ): Promise<void> {
    try {
      const { error } = await api.post('/appointment-consent-forms', {
        appointment_id: appointmentId,
        form_type: formType,
        form_title: formTitle,
        form_content: formContent,
        patient_signature: signature,
        signed_at: new Date().toISOString(),
        ip_address: ipAddress,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error signing consent form:', error);
      throw error;
    }
  },

  async verifyInsurance(
    appointmentId: string,
    insurancePolicyId: string
  ): Promise<any> {
    try {
      const { data: policy, error: policyError } = await api.get<any>(`/patient-insurance-policies/${insurancePolicyId}`);

      if (policyError) throw policyError;

      const verificationData = {
        appointment_id: appointmentId,
        insurance_policy_id: insurancePolicyId,
        verification_status: 'verified',
        coverage_details: {
          plan_name: policy!.insurance_provider,
          policy_number: policy!.policy_number,
          coverage_percentage: 80,
        },
        estimated_copay: 25.00,
        deductible_remaining: 500.00,
        requires_preauth: false,
        verified_at: new Date().toISOString(),
        verified_by: 'system',
      };

      const { data, error } = await api.post<any>('/appointment-insurance-verification', verificationData);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error verifying insurance:', error);
      throw error;
    }
  },

  async createAppointment(bookingData: BookingData, patientId: string): Promise<string> {
    try {
      const { data: appointment, error: appointmentError } = await api.post<any>('/appointments', {
        patient_id: patientId,
        provider_id: bookingData.providerId,
        appointment_date: bookingData.appointmentDate,
        start_time: bookingData.appointmentTime,
        end_time: bookingData.appointmentTime,
        visit_type: bookingData.consultationType || 'in_person',
        appointment_type: bookingData.consultationType,
        reason_for_visit: bookingData.reasonForVisit,
        status: 'scheduled',
        notes: bookingData.symptoms,
      });

      if (appointmentError) throw appointmentError;

      await api.put(`/provider-time-slots/${bookingData.slotId}`, {
        is_available: false,
        appointment_id: appointment!.id,
      });

      if (bookingData.reminderPreferences && bookingData.reminderPreferences.length > 0) {
        const appointmentDateTime = new Date(`${bookingData.appointmentDate}T${bookingData.appointmentTime}`);

        const reminders = [
          {
            appointment_id: appointment!.id,
            reminder_type: '24_hour',
            send_via: bookingData.reminderPreferences,
            scheduled_for: new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
          },
          {
            appointment_id: appointment!.id,
            reminder_type: '2_hour',
            send_via: bookingData.reminderPreferences,
            scheduled_for: new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
          },
        ];

        await api.post('/appointment-reminders', reminders);
      }

      if (bookingData.insurancePolicyId) {
        await this.verifyInsurance(appointment!.id, bookingData.insurancePolicyId);
      }

      await auditTrailService.logEventSafe({
        eventType: 'appointment_created',
        resourceType: 'appointment',
        resourceId: appointment!.id,
        actorId: patientId,
        actorRole: 'patient',
        actionData: {
          patient_id: patientId,
          provider_id: bookingData.providerId,
          appointment_date: bookingData.appointmentDate,
          appointment_type: bookingData.consultationType,
          service_id: bookingData.serviceId,
        },
      });

      await consentService.createAppointmentConsent({
        patientId,
        providerId: bookingData.providerId,
        appointmentId: appointment!.id,
        appointmentDate: bookingData.appointmentDate,
        startTime: bookingData.appointmentTime,
        endTime: bookingData.appointmentTime,
      }).catch(() => {});

      try {
        const { data: providerUser } = await api.get<any>(`/providers/${bookingData.providerId}`, {
          params: { fields: 'user_id' },
        });

        if (providerUser?.user_id) {
          await notificationService.createNotification({
            userId: providerUser.user_id,
            type: 'appointment_confirmation',
            category: 'appointment',
            priority: 'normal',
            title: 'New Appointment Booked',
            message: `A new ${bookingData.consultationType} appointment has been booked for ${bookingData.appointmentDate} at ${bookingData.appointmentTime}.`,
            actionUrl: '/dashboard/provider/appointments',
            actionLabel: 'View Appointment',
            relatedEntityType: 'appointment',
            relatedEntityId: appointment!.id,
          });
        }
      } catch {}

      return appointment!.id;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  },

  async rescheduleAppointment(
    appointmentId: string,
    newSlotId: string,
    newDate: string,
    newTime: string,
    reason?: string
  ): Promise<void> {
    try {
      const { data: currentAppointment, error: fetchError } = await api.get<any>(`/appointments/${appointmentId}`);

      if (fetchError) throw fetchError;

      await api.put('/provider-time-slots/by-appointment', {
        appointment_id: appointmentId,
        is_available: true,
        appointment_id_set: null,
      });

      const { error: updateError } = await api.put(`/appointments/${appointmentId}`, {
        appointment_date: newDate,
        start_time: newTime,
        updated_at: new Date().toISOString(),
      });

      if (updateError) throw updateError;

      await api.put(`/provider-time-slots/${newSlotId}`, {
        is_available: false,
        appointment_id: appointmentId,
      });

      const appointmentDateTime = new Date(`${newDate}T${newTime}`);

      await api.put('/appointment-reminders/by-appointment', {
        appointment_id: appointmentId,
        reminder_type: '24_hour',
        scheduled_for: new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        sent_at: null,
      });

      await api.put('/appointment-reminders/by-appointment', {
        appointment_id: appointmentId,
        reminder_type: '2_hour',
        scheduled_for: new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        sent_at: null,
      });
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      throw error;
    }
  },

  async cancelAppointment(
    appointmentId: string,
    cancellationReason: string
  ): Promise<void> {
    try {
      const { error: updateError } = await api.put(`/appointments/${appointmentId}`, {
        status: 'cancelled',
        notes: `Cancelled: ${cancellationReason}`,
        updated_at: new Date().toISOString(),
      });

      if (updateError) throw updateError;

      await api.put('/provider-time-slots/by-appointment', {
        appointment_id: appointmentId,
        is_available: true,
        appointment_id_set: null,
      });

      await api.put('/appointment-reminders/cancel-by-appointment', {
        appointment_id: appointmentId,
        current_status: 'pending',
        status: 'cancelled',
      });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  },

  async uploadAppointmentDocument(
    appointmentId: string,
    file: File,
    documentType: string,
    userId: string
  ): Promise<void> {
    try {
      const { key } = await storageClient.uploadFile('medical-records', file);

      const { error: dbError } = await api.post('/appointment-documents', {
        appointment_id: appointmentId,
        document_type: documentType,
        file_name: file.name,
        file_path: key,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: userId,
        shared_with_provider: true,
      });

      if (dbError) throw dbError;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  async getAppointmentDocuments(appointmentId: string): Promise<any[]> {
    try {
      const { data, error } = await api.get<any[]>('/appointment-documents', {
        params: {
          appointment_id: appointmentId,
          order_by: 'created_at:desc',
        },
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching appointment documents:', error);
      throw error;
    }
  },
};
