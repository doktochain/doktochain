import { auditTrailService } from './auditTrailService';

export const auditLog = {
  appointmentCreated: (appointmentId: string, actorId: string, actorRole: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'appointment_created', resourceType: 'appointment', resourceId: appointmentId, actorId, actorRole, actionData: data || {} }),

  appointmentCancelled: (appointmentId: string, actorId: string, actorRole: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'appointment_cancelled', resourceType: 'appointment', resourceId: appointmentId, actorId, actorRole, actionData: data || {} }),

  appointmentRescheduled: (appointmentId: string, actorId: string, actorRole: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'appointment_rescheduled', resourceType: 'appointment', resourceId: appointmentId, actorId, actorRole, actionData: data || {} }),

  prescriptionCreated: (prescriptionId: string, actorId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'prescription_created', resourceType: 'prescription', resourceId: prescriptionId, actorId, actorRole: 'provider', actionData: data || {} }),

  prescriptionSentToPharmacy: (prescriptionId: string, actorId: string, actorRole: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'prescription_sent', resourceType: 'prescription', resourceId: prescriptionId, actorId, actorRole, actionData: data || {} }),

  prescriptionRedirected: (prescriptionId: string, actorId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'prescription_redirected', resourceType: 'prescription', resourceId: prescriptionId, actorId, actorRole: 'patient', actionData: data || {} }),

  consentGranted: (consentId: string, patientId: string, granteeId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'consent_granted', resourceType: 'consent', resourceId: consentId, actorId: patientId, actorRole: 'patient', actionData: { grantee_id: granteeId, ...data } }),

  consentRevoked: (consentId: string, patientId: string, granteeId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'consent_revoked', resourceType: 'consent', resourceId: consentId, actorId: patientId, actorRole: 'patient', actionData: { grantee_id: granteeId, ...data } }),

  consentWindowCreated: (consentId: string, patientId: string, providerId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'consent_window_created', resourceType: 'consent', resourceId: consentId, actorId: patientId, actorRole: 'patient', actionData: { provider_id: providerId, ...data } }),

  dataAccessed: (resourceType: string, resourceId: string, actorId: string, actorRole: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'data_access', resourceType, resourceId, actorId, actorRole, actionData: data || {} }),

  crossProviderAccess: (patientId: string, requestingProviderId: string, originatingProviderId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'cross_provider_access', resourceType: 'health_record', resourceId: patientId, actorId: requestingProviderId, actorRole: 'provider', actionData: { originating_provider_id: originatingProviderId, ...data } }),

  clinicalNoteCreated: (noteId: string, providerId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'clinical_note_created', resourceType: 'clinical_note', resourceId: noteId, actorId: providerId, actorRole: 'provider', actionData: data || {} }),

  clinicalNoteSigned: (noteId: string, providerId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'clinical_note_signed', resourceType: 'clinical_note', resourceId: noteId, actorId: providerId, actorRole: 'provider', actionData: data || {} }),

  paymentProcessed: (transactionId: string, actorId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'payment_processed', resourceType: 'transaction', resourceId: transactionId, actorId, actorRole: 'patient', actionData: data || {} }),

  pharmacyOrderCreated: (orderId: string, pharmacyId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'order_created', resourceType: 'pharmacy_order', resourceId: orderId, actorId: pharmacyId, actorRole: 'pharmacy', actionData: data || {} }),

  pharmacyOrderFulfilled: (orderId: string, pharmacyId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'order_fulfilled', resourceType: 'pharmacy_order', resourceId: orderId, actorId: pharmacyId, actorRole: 'pharmacy', actionData: data || {} }),

  recordExported: (patientId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'record_exported', resourceType: 'health_record', resourceId: patientId, actorId: patientId, actorRole: 'patient', actionData: data || {} }),

  recordShared: (shareId: string, patientId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'record_shared', resourceType: 'health_record', resourceId: shareId, actorId: patientId, actorRole: 'patient', actionData: data || {} }),

  adminAction: (actionType: string, resourceType: string, resourceId: string, adminId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: `admin_${actionType}`, resourceType, resourceId, actorId: adminId, actorRole: 'admin', actionData: data || {} }),

  userLogin: (userId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'user_login', resourceType: 'auth', resourceId: userId, actorId: userId, actorRole: 'system', actionData: data || {} }),

  userLogout: (userId: string, data?: Record<string, unknown>) =>
    auditTrailService.logEventSafe({ eventType: 'user_logout', resourceType: 'auth', resourceId: userId, actorId: userId, actorRole: 'system', actionData: data || {} }),
};
