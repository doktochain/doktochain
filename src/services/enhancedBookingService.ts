import { supabase } from '../lib/supabase';
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
      const { data, error } = await supabase
        .from('appointment_services')
        .select('*')
        .order('name');

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
      const { data, error } = await supabase
        .from('provider_services')
        .select('*')
        .eq('provider_id', providerId);

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
      const { data, error } = await supabase
        .from('provider_time_slots')
        .select(`
          *,
          provider_locations(
            location_name,
            address_line1,
            city,
            province
          )
        `)
        .eq('provider_id', providerId)
        .eq('is_available', true)
        .gte('slot_date', startDate)
        .lte('slot_date', endDate)
        .eq('is_virtual', consultationType === 'virtual')
        .order('slot_date')
        .order('slot_time');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching provider availability:', error);
      throw error;
    }
  },

  async getQuestionnaireForService(serviceId: string): Promise<QuestionnaireQuestion[]> {
    try {
      const { data, error } = await supabase
        .from('appointment_questionnaires')
        .select('*')
        .eq('service_id', serviceId)
        .order('display_order');

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

      const { error } = await supabase
        .from('appointment_questionnaire_responses')
        .upsert(responsesToSave);

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

      const { error } = await supabase
        .from('appointment_questionnaire_responses')
        .upsert(responsesToSave);

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
      const { error } = await supabase
        .from('appointment_consent_forms')
        .insert({
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
      // In production, this would call an insurance verification API
      // For now, we'll simulate verification
      const { data: policy, error: policyError } = await supabase
        .from('patient_insurance_policies')
        .select('*')
        .eq('id', insurancePolicyId)
        .single();

      if (policyError) throw policyError;

      const verificationData = {
        appointment_id: appointmentId,
        insurance_policy_id: insurancePolicyId,
        verification_status: 'verified',
        coverage_details: {
          plan_name: policy.insurance_provider,
          policy_number: policy.policy_number,
          coverage_percentage: 80,
        },
        estimated_copay: 25.00,
        deductible_remaining: 500.00,
        requires_preauth: false,
        verified_at: new Date().toISOString(),
        verified_by: 'system',
      };

      const { data, error } = await supabase
        .from('appointment_insurance_verification')
        .insert(verificationData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error verifying insurance:', error);
      throw error;
    }
  },

  async createAppointment(bookingData: BookingData, patientId: string): Promise<string> {
    try {
      // Create the appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
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
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Mark the time slot as unavailable
      await supabase
        .from('provider_time_slots')
        .update({
          is_available: false,
          appointment_id: appointment.id,
        })
        .eq('id', bookingData.slotId);

      // Set up reminders
      if (bookingData.reminderPreferences && bookingData.reminderPreferences.length > 0) {
        const appointmentDateTime = new Date(`${bookingData.appointmentDate}T${bookingData.appointmentTime}`);

        const reminders = [
          {
            appointment_id: appointment.id,
            reminder_type: '24_hour',
            send_via: bookingData.reminderPreferences,
            scheduled_for: new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
          },
          {
            appointment_id: appointment.id,
            reminder_type: '2_hour',
            send_via: bookingData.reminderPreferences,
            scheduled_for: new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
          },
        ];

        await supabase.from('appointment_reminders').insert(reminders);
      }

      if (bookingData.insurancePolicyId) {
        await this.verifyInsurance(appointment.id, bookingData.insurancePolicyId);
      }

      await auditTrailService.logEventSafe({
        eventType: 'appointment_created',
        resourceType: 'appointment',
        resourceId: appointment.id,
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
        appointmentId: appointment.id,
        appointmentDate: bookingData.appointmentDate,
        startTime: bookingData.appointmentTime,
        endTime: bookingData.appointmentTime,
      }).catch(() => {});

      try {
        const { data: providerUser } = await supabase
          .from('providers')
          .select('user_id')
          .eq('id', bookingData.providerId)
          .maybeSingle();

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
            relatedEntityId: appointment.id,
          });
        }
      } catch {}

      return appointment.id;
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
      // Get current appointment to free up the old slot
      const { data: currentAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;

      // Free up the old time slot
      await supabase
        .from('provider_time_slots')
        .update({
          is_available: true,
          appointment_id: null,
        })
        .eq('appointment_id', appointmentId);

      // Update the appointment
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          appointment_date: newDate,
          start_time: newTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Mark new slot as unavailable
      await supabase
        .from('provider_time_slots')
        .update({
          is_available: false,
          appointment_id: appointmentId,
        })
        .eq('id', newSlotId);

      // Update reminders
      const appointmentDateTime = new Date(`${newDate}T${newTime}`);

      await supabase
        .from('appointment_reminders')
        .update({
          scheduled_for: new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          sent_at: null,
        })
        .eq('appointment_id', appointmentId)
        .eq('reminder_type', '24_hour');

      await supabase
        .from('appointment_reminders')
        .update({
          scheduled_for: new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          sent_at: null,
        })
        .eq('appointment_id', appointmentId)
        .eq('reminder_type', '2_hour');
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
      // Update appointment status
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          notes: `Cancelled: ${cancellationReason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Free up the time slot
      await supabase
        .from('provider_time_slots')
        .update({
          is_available: true,
          appointment_id: null,
        })
        .eq('appointment_id', appointmentId);

      // Cancel reminders
      await supabase
        .from('appointment_reminders')
        .update({ status: 'cancelled' })
        .eq('appointment_id', appointmentId)
        .eq('status', 'pending');
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
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${appointmentId}/${Date.now()}.${fileExt}`;
      const filePath = `appointment-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { error: dbError } = await supabase
        .from('appointment_documents')
        .insert({
          appointment_id: appointmentId,
          document_type: documentType,
          file_name: file.name,
          file_path: filePath,
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
      const { data, error } = await supabase
        .from('appointment_documents')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching appointment documents:', error);
      throw error;
    }
  },
};
