/*
  # Add Missing Foreign Key Indexes - Batch 3

  ## Summary
  Adds covering indexes for foreign key columns that lack them across ~160 tables.
  These indexes prevent full table scans during JOIN operations and CASCADE operations,
  improving query performance significantly.

  ## Tables Covered
  All tables listed in the security advisor report as having unindexed foreign keys.
*/

-- admin_activity_log
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_user_id ON public.admin_activity_log(admin_user_id);

-- admin_audit_log
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user_id ON public.admin_audit_log(admin_user_id);

-- admin_search_analytics
CREATE INDEX IF NOT EXISTS idx_admin_search_analytics_user_id ON public.admin_search_analytics(user_id);

-- ai_soap_notes
CREATE INDEX IF NOT EXISTS idx_ai_soap_notes_appointment_id ON public.ai_soap_notes(appointment_id);

-- allergies
CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON public.allergies(patient_id);

-- appointment_cancellations
CREATE INDEX IF NOT EXISTS idx_appointment_cancellations_appointment_id ON public.appointment_cancellations(appointment_id);

-- appointment_documents
CREATE INDEX IF NOT EXISTS idx_appointment_documents_appointment_id ON public.appointment_documents(appointment_id);

-- appointment_status_history
CREATE INDEX IF NOT EXISTS idx_appointment_status_history_appointment_id ON public.appointment_status_history(appointment_id);

-- appointment_types
CREATE INDEX IF NOT EXISTS idx_appointment_types_provider_id ON public.appointment_types(provider_id);

-- appointment_waitlist
CREATE INDEX IF NOT EXISTS idx_appointment_waitlist_provider_id ON public.appointment_waitlist(provider_id);

-- appointments
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_type_id ON public.appointments(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_appointments_insurance_card_id ON public.appointments(insurance_card_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_provider_id ON public.appointments(provider_id);

-- article_feedback
CREATE INDEX IF NOT EXISTS idx_article_feedback_user_id ON public.article_feedback(user_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- audit_trail
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON public.audit_trail(user_id);

-- automated_messages
CREATE INDEX IF NOT EXISTS idx_automated_messages_provider_id ON public.automated_messages(provider_id);

-- billing_transactions
CREATE INDEX IF NOT EXISTS idx_billing_transactions_patient_id ON public.billing_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_provider_id ON public.billing_transactions(provider_id);

-- blockchain_audit_log
CREATE INDEX IF NOT EXISTS idx_blockchain_audit_log_actor_id ON public.blockchain_audit_log(actor_id);

-- calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);

-- call_participants
CREATE INDEX IF NOT EXISTS idx_call_participants_call_id ON public.call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON public.call_participants(user_id);

-- calls
CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON public.calls(caller_id);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);

-- chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);

-- child_developmental_milestones
CREATE INDEX IF NOT EXISTS idx_child_developmental_milestones_child_id ON public.child_developmental_milestones(child_id);

-- child_growth_records
CREATE INDEX IF NOT EXISTS idx_child_growth_records_child_id ON public.child_growth_records(child_id);

-- child_profiles
CREATE INDEX IF NOT EXISTS idx_child_profiles_guardian_id ON public.child_profiles(guardian_id);

-- child_vaccinations
CREATE INDEX IF NOT EXISTS idx_child_vaccinations_child_id ON public.child_vaccinations(child_id);

-- clinic_provider_invitations
CREATE INDEX IF NOT EXISTS idx_clinic_provider_invitations_clinic_id ON public.clinic_provider_invitations(clinic_id);

-- clinic_services
CREATE INDEX IF NOT EXISTS idx_clinic_services_service_id ON public.clinic_services(service_id);

-- clinic_specializations
CREATE INDEX IF NOT EXISTS idx_clinic_specializations_specialty_id ON public.clinic_specializations(specialty_id);

-- clinic_staff
CREATE INDEX IF NOT EXISTS idx_clinic_staff_clinic_id ON public.clinic_staff(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_user_id ON public.clinic_staff(user_id);

-- clinic_staff_activity_log
CREATE INDEX IF NOT EXISTS idx_clinic_staff_activity_log_clinic_id ON public.clinic_staff_activity_log(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_activity_log_staff_id ON public.clinic_staff_activity_log(staff_id);

-- clinical_notes
CREATE INDEX IF NOT EXISTS idx_clinical_notes_appointment_id ON public.clinical_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_id ON public.clinical_notes(patient_id);

-- cms_blogs
CREATE INDEX IF NOT EXISTS idx_cms_blogs_author_id ON public.cms_blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_cms_blogs_category_id ON public.cms_blogs(category_id);

-- cms_media_library
CREATE INDEX IF NOT EXISTS idx_cms_media_library_uploaded_by ON public.cms_media_library(uploaded_by);

-- cms_pages
CREATE INDEX IF NOT EXISTS idx_cms_pages_author_id ON public.cms_pages(author_id);

-- consultation_notes
CREATE INDEX IF NOT EXISTS idx_consultation_notes_consultant_provider_id ON public.consultation_notes(consultant_provider_id);
CREATE INDEX IF NOT EXISTS idx_consultation_notes_patient_id ON public.consultation_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_notes_referring_provider_id ON public.consultation_notes(referring_provider_id);

-- contacts
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);

-- courier_assignments
CREATE INDEX IF NOT EXISTS idx_courier_assignments_order_id ON public.courier_assignments(order_id);

-- delivery_cost_analytics
CREATE INDEX IF NOT EXISTS idx_delivery_cost_analytics_pharmacy_id ON public.delivery_cost_analytics(pharmacy_id);

-- delivery_quotes
CREATE INDEX IF NOT EXISTS idx_delivery_quotes_order_id ON public.delivery_quotes(order_id);

-- departments
CREATE INDEX IF NOT EXISTS idx_departments_head_user_id ON public.departments(head_user_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent_department_id ON public.departments(parent_department_id);

-- designations
CREATE INDEX IF NOT EXISTS idx_designations_department_id ON public.designations(department_id);

-- drug_interactions
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug_1_id ON public.drug_interactions(drug_1_id);

-- e_prescriptions
CREATE INDEX IF NOT EXISTS idx_e_prescriptions_patient_id ON public.e_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_e_prescriptions_provider_id ON public.e_prescriptions(provider_id);

-- email_verification_codes
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_user_id ON public.email_verification_codes(user_id);

-- emails
CREATE INDEX IF NOT EXISTS idx_emails_sender_id ON public.emails(sender_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON public.emails(thread_id);

-- employee_documents
CREATE INDEX IF NOT EXISTS idx_employee_documents_user_id ON public.employee_documents(user_id);

-- external_deliveries
CREATE INDEX IF NOT EXISTS idx_external_deliveries_order_id ON public.external_deliveries(order_id);

-- faqs
CREATE INDEX IF NOT EXISTS idx_faqs_category_id ON public.faqs(category_id);

-- fhir_allergy_intolerances
CREATE INDEX IF NOT EXISTS idx_fhir_allergy_intolerances_patient_id ON public.fhir_allergy_intolerances(patient_id);

-- fhir_conditions
CREATE INDEX IF NOT EXISTS idx_fhir_conditions_patient_id ON public.fhir_conditions(patient_id);
CREATE INDEX IF NOT EXISTS idx_fhir_conditions_provider_id ON public.fhir_conditions(provider_id);

-- fhir_medication_requests
CREATE INDEX IF NOT EXISTS idx_fhir_medication_requests_patient_id ON public.fhir_medication_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_fhir_medication_requests_provider_id ON public.fhir_medication_requests(provider_id);

-- fhir_observations
CREATE INDEX IF NOT EXISTS idx_fhir_observations_patient_id ON public.fhir_observations(patient_id);
CREATE INDEX IF NOT EXISTS idx_fhir_observations_provider_id ON public.fhir_observations(provider_id);

-- fhir_procedures
CREATE INDEX IF NOT EXISTS idx_fhir_procedures_patient_id ON public.fhir_procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_fhir_procedures_provider_id ON public.fhir_procedures(provider_id);

-- file_storage
CREATE INDEX IF NOT EXISTS idx_file_storage_parent_id ON public.file_storage(parent_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_user_id ON public.file_storage(user_id);

-- financial_transactions
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_id ON public.financial_transactions(user_id);

-- guardian_relationships
CREATE INDEX IF NOT EXISTS idx_guardian_relationships_child_id ON public.guardian_relationships(child_id);

-- guardianship_documents
CREATE INDEX IF NOT EXISTS idx_guardianship_documents_child_id ON public.guardianship_documents(child_id);

-- health_record_sync_status
CREATE INDEX IF NOT EXISTS idx_health_record_sync_status_patient_id ON public.health_record_sync_status(patient_id);

-- help_articles
CREATE INDEX IF NOT EXISTS idx_help_articles_category_id ON public.help_articles(category_id);

-- help_categories
CREATE INDEX IF NOT EXISTS idx_help_categories_parent_category_id ON public.help_categories(parent_category_id);

-- identity_documents
CREATE INDEX IF NOT EXISTS idx_identity_documents_user_id ON public.identity_documents(user_id);

-- identity_verification
CREATE INDEX IF NOT EXISTS idx_identity_verification_user_id ON public.identity_verification(user_id);

-- immunizations
CREATE INDEX IF NOT EXISTS idx_immunizations_patient_id ON public.immunizations(patient_id);

-- insurance_claims
CREATE INDEX IF NOT EXISTS idx_insurance_claims_patient_id ON public.insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_provider_id ON public.insurance_claims(provider_id);

-- insurance_policies
CREATE INDEX IF NOT EXISTS idx_insurance_policies_patient_id ON public.insurance_policies(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_user_id ON public.insurance_policies(user_id);

-- inventory_categories
CREATE INDEX IF NOT EXISTS idx_inventory_categories_parent_category_id ON public.inventory_categories(parent_category_id);

-- inventory_transactions
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id ON public.inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_pharmacy_id ON public.inventory_transactions(pharmacy_id);

-- kanban_boards
CREATE INDEX IF NOT EXISTS idx_kanban_boards_user_id ON public.kanban_boards(user_id);

-- lab_results
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON public.lab_results(patient_id);

-- leave_requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON public.leave_requests(user_id);

-- marketplace_transaction_logs
CREATE INDEX IF NOT EXISTS idx_marketplace_transaction_logs_actor_id ON public.marketplace_transaction_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transaction_logs_target_id ON public.marketplace_transaction_logs(target_id);

-- medical_assets
CREATE INDEX IF NOT EXISTS idx_medical_assets_location_id ON public.medical_assets(location_id);

-- medication_adherence_log
CREATE INDEX IF NOT EXISTS idx_medication_adherence_log_patient_id ON public.medication_adherence_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_adherence_log_reminder_id ON public.medication_adherence_log(reminder_id);

-- medication_history
CREATE INDEX IF NOT EXISTS idx_medication_history_patient_id ON public.medication_history(patient_id);

-- medication_reminders
CREATE INDEX IF NOT EXISTS idx_medication_reminders_patient_id ON public.medication_reminders(patient_id);

-- message_conversations
CREATE INDEX IF NOT EXISTS idx_message_conversations_patient_id ON public.message_conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_message_conversations_provider_id ON public.message_conversations(provider_id);

-- message_templates
CREATE INDEX IF NOT EXISTS idx_message_templates_provider_id ON public.message_templates(provider_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- moderation_logs
CREATE INDEX IF NOT EXISTS idx_moderation_logs_admin_user_id ON public.moderation_logs(admin_user_id);

-- notes
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);

-- notification_delivery_logs
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_notification_id ON public.notification_delivery_logs(notification_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- order_fulfillment
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_order_id ON public.order_fulfillment(order_id);
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_pharmacy_id ON public.order_fulfillment(pharmacy_id);

-- order_notes
CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON public.order_notes(order_id);

-- order_status_history
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);

-- otp_codes
CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON public.otp_codes(user_id);

-- patient_billing_statements
CREATE INDEX IF NOT EXISTS idx_patient_billing_statements_patient_id ON public.patient_billing_statements(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_billing_statements_provider_id ON public.patient_billing_statements(provider_id);

-- patient_consents
CREATE INDEX IF NOT EXISTS idx_patient_consents_appointment_id ON public.patient_consents(appointment_id);

-- patient_insurance_cards
CREATE INDEX IF NOT EXISTS idx_patient_insurance_cards_insurance_provider_id ON public.patient_insurance_cards(insurance_provider_id);

-- payment_gateway_configs
CREATE INDEX IF NOT EXISTS idx_payment_gateway_configs_provider_id ON public.payment_gateway_configs(provider_id);

-- payslips
CREATE INDEX IF NOT EXISTS idx_payslips_user_id ON public.payslips(user_id);

-- performance_reviews
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer_id ON public.performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_user_id ON public.performance_reviews(user_id);

-- pharmacy_communications
CREATE INDEX IF NOT EXISTS idx_pharmacy_communications_provider_id ON public.pharmacy_communications(provider_id);

-- pharmacy_insurance_claims
CREATE INDEX IF NOT EXISTS idx_pharmacy_insurance_claims_pharmacy_id ON public.pharmacy_insurance_claims(pharmacy_id);

-- pharmacy_licenses
CREATE INDEX IF NOT EXISTS idx_pharmacy_licenses_pharmacy_id ON public.pharmacy_licenses(pharmacy_id);

-- pharmacy_orders
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_patient_id ON public.pharmacy_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_pharmacy_id ON public.pharmacy_orders(pharmacy_id);

-- pharmacy_refunds
CREATE INDEX IF NOT EXISTS idx_pharmacy_refunds_order_id ON public.pharmacy_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_refunds_pharmacy_id ON public.pharmacy_refunds(pharmacy_id);

-- pharmacy_staff
CREATE INDEX IF NOT EXISTS idx_pharmacy_staff_pharmacy_id ON public.pharmacy_staff(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_staff_user_id ON public.pharmacy_staff(user_id);

-- pharmacy_transactions
CREATE INDEX IF NOT EXISTS idx_pharmacy_transactions_order_id ON public.pharmacy_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_transactions_pharmacy_id ON public.pharmacy_transactions(pharmacy_id);

-- phone_verification_codes
CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_user_id ON public.phone_verification_codes(user_id);

-- platform_expenses
CREATE INDEX IF NOT EXISTS idx_platform_expenses_submitted_by ON public.platform_expenses(submitted_by);

-- platform_income
CREATE INDEX IF NOT EXISTS idx_platform_income_related_user_id ON public.platform_income(related_user_id);

-- platform_invoice_items
CREATE INDEX IF NOT EXISTS idx_platform_invoice_items_invoice_id ON public.platform_invoice_items(invoice_id);

-- platform_invoices
CREATE INDEX IF NOT EXISTS idx_platform_invoices_client_id ON public.platform_invoices(client_id);

-- prescription_audit_log
CREATE INDEX IF NOT EXISTS idx_prescription_audit_log_prescription_id ON public.prescription_audit_log(prescription_id);

-- prescription_fills
CREATE INDEX IF NOT EXISTS idx_prescription_fills_prescription_id ON public.prescription_fills(prescription_id);

-- prescription_refill_requests
CREATE INDEX IF NOT EXISTS idx_prescription_refill_requests_provider_id ON public.prescription_refill_requests(provider_id);

-- prescription_rejections
CREATE INDEX IF NOT EXISTS idx_prescription_rejections_prescription_id ON public.prescription_rejections(prescription_id);

-- prescription_validations
CREATE INDEX IF NOT EXISTS idx_prescription_validations_pharmacy_id ON public.prescription_validations(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescription_validations_prescription_id ON public.prescription_validations(prescription_id);

-- prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_provider_id ON public.prescriptions(provider_id);

-- procedure_notes
CREATE INDEX IF NOT EXISTS idx_procedure_notes_patient_id ON public.procedure_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedure_notes_provider_id ON public.procedure_notes(provider_id);

-- procedures_master
CREATE INDEX IF NOT EXISTS idx_procedures_master_specialty_id ON public.procedures_master(specialty_id);

-- product_images
CREATE INDEX IF NOT EXISTS idx_product_images_inventory_id ON public.product_images(inventory_id);

-- provider_admin_approvals
CREATE INDEX IF NOT EXISTS idx_provider_admin_approvals_application_id ON public.provider_admin_approvals(application_id);

-- provider_clinic_affiliations
CREATE INDEX IF NOT EXISTS idx_provider_clinic_affiliations_clinic_entity_id ON public.provider_clinic_affiliations(clinic_entity_id);

-- provider_credential_alerts
CREATE INDEX IF NOT EXISTS idx_provider_credential_alerts_provider_id ON public.provider_credential_alerts(provider_id);

-- provider_credentials
CREATE INDEX IF NOT EXISTS idx_provider_credentials_provider_id ON public.provider_credentials(provider_id);

-- provider_digital_signatures
CREATE INDEX IF NOT EXISTS idx_provider_digital_signatures_provider_id ON public.provider_digital_signatures(provider_id);

-- provider_insurance_accepted
CREATE INDEX IF NOT EXISTS idx_provider_insurance_accepted_provider_id ON public.provider_insurance_accepted(provider_id);

-- provider_languages
CREATE INDEX IF NOT EXISTS idx_provider_languages_provider_id ON public.provider_languages(provider_id);

-- provider_locations
CREATE INDEX IF NOT EXISTS idx_provider_locations_provider_id ON public.provider_locations(provider_id);

-- provider_notifications
CREATE INDEX IF NOT EXISTS idx_provider_notifications_provider_id ON public.provider_notifications(provider_id);

-- provider_onboarding_applications
CREATE INDEX IF NOT EXISTS idx_provider_onboarding_applications_user_id ON public.provider_onboarding_applications(user_id);

-- provider_payouts
CREATE INDEX IF NOT EXISTS idx_provider_payouts_provider_id ON public.provider_payouts(provider_id);

-- provider_procedures
CREATE INDEX IF NOT EXISTS idx_provider_procedures_procedure_id ON public.provider_procedures(procedure_id);

-- provider_reviews
CREATE INDEX IF NOT EXISTS idx_provider_reviews_provider_id ON public.provider_reviews(provider_id);

-- provider_services
CREATE INDEX IF NOT EXISTS idx_provider_services_medical_service_id ON public.provider_services(medical_service_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id ON public.provider_services(provider_id);

-- provider_specialties
CREATE INDEX IF NOT EXISTS idx_provider_specialties_specialty_id ON public.provider_specialties(specialty_id);

-- provider_transactions
CREATE INDEX IF NOT EXISTS idx_provider_transactions_patient_id ON public.provider_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_provider_transactions_provider_id ON public.provider_transactions(provider_id);

-- provider_verification_documents
CREATE INDEX IF NOT EXISTS idx_provider_verification_documents_application_id ON public.provider_verification_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_provider_verification_documents_provider_id ON public.provider_verification_documents(provider_id);

-- provider_verification_history
CREATE INDEX IF NOT EXISTS idx_provider_verification_history_provider_id ON public.provider_verification_history(provider_id);

-- record_shares
CREATE INDEX IF NOT EXISTS idx_record_shares_patient_id ON public.record_shares(patient_id);

-- refund_requests
CREATE INDEX IF NOT EXISTS idx_refund_requests_requester_id ON public.refund_requests(requester_id);

-- salary_structures
CREATE INDEX IF NOT EXISTS idx_salary_structures_user_id ON public.salary_structures(user_id);

-- secure_messages
CREATE INDEX IF NOT EXISTS idx_secure_messages_patient_id ON public.secure_messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_secure_messages_provider_id ON public.secure_messages(provider_id);

-- session_chat_messages
CREATE INDEX IF NOT EXISTS idx_session_chat_messages_session_id ON public.session_chat_messages(session_id);

-- session_files
CREATE INDEX IF NOT EXISTS idx_session_files_session_id ON public.session_files(session_id);

-- session_participants
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON public.session_participants(session_id);

-- settings_audit_log
CREATE INDEX IF NOT EXISTS idx_settings_audit_log_changed_by ON public.settings_audit_log(changed_by);

-- soap_notes
CREATE INDEX IF NOT EXISTS idx_soap_notes_appointment_id ON public.soap_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_soap_notes_patient_id ON public.soap_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_soap_notes_provider_id ON public.soap_notes(provider_id);

-- social_posts
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_posts(user_id);

-- staff_activity_logs
CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_staff_id ON public.staff_activity_logs(staff_id);

-- staff_chat_messages
CREATE INDEX IF NOT EXISTS idx_staff_chat_messages_channel_id ON public.staff_chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_staff_chat_messages_sender_id ON public.staff_chat_messages(sender_id);

-- staff_members
CREATE INDEX IF NOT EXISTS idx_staff_members_provider_id ON public.staff_members(provider_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_role_id ON public.staff_members(role_id);

-- staff_performance_metrics
CREATE INDEX IF NOT EXISTS idx_staff_performance_metrics_staff_id ON public.staff_performance_metrics(staff_id);

-- support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);

-- telemedicine_sessions
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_appointment_id ON public.telemedicine_sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_patient_id ON public.telemedicine_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_provider_id ON public.telemedicine_sessions(provider_id);

-- ticket_messages
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);

-- trusted_devices
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);

-- user_custom_roles
CREATE INDEX IF NOT EXISTS idx_user_custom_roles_role_id ON public.user_custom_roles(role_id);

-- video_consultations
CREATE INDEX IF NOT EXISTS idx_video_consultations_patient_id ON public.video_consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_video_consultations_provider_id ON public.video_consultations(provider_id);

-- virtual_waiting_room
CREATE INDEX IF NOT EXISTS idx_virtual_waiting_room_provider_id ON public.virtual_waiting_room(provider_id);
