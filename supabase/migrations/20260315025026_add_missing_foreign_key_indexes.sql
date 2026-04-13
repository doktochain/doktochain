/*
  # Add Missing Foreign Key Indexes

  ## Summary
  This migration adds covering indexes for all foreign key columns that lack them.
  Without these indexes, JOIN operations and referential integrity checks on these
  columns require full table scans, causing poor query performance.

  ## Changes
  - Adds B-tree indexes on ~170 foreign key columns across all tables
  - Uses IF NOT EXISTS to safely run without errors if any index already exists
  - Indexes are named with the pattern: idx_{table}_{column}

  ## Affected Tables
  All tables with unindexed foreign key columns in the public schema.
*/

-- admin_notes
CREATE INDEX IF NOT EXISTS idx_admin_notes_admin_user_id ON public.admin_notes(admin_user_id);

-- ai_soap_notes
CREATE INDEX IF NOT EXISTS idx_ai_soap_notes_session_id ON public.ai_soap_notes(session_id);

-- ai_transcriptions
CREATE INDEX IF NOT EXISTS idx_ai_transcriptions_session_id ON public.ai_transcriptions(session_id);

-- allergies
CREATE INDEX IF NOT EXISTS idx_allergies_documented_by_provider_id ON public.allergies(documented_by_provider_id);

-- appointment_consent_forms
CREATE INDEX IF NOT EXISTS idx_appointment_consent_forms_appointment_id ON public.appointment_consent_forms(appointment_id);

-- appointment_insurance_verification
CREATE INDEX IF NOT EXISTS idx_appointment_insurance_verification_appointment_id ON public.appointment_insurance_verification(appointment_id);

-- appointment_notes
CREATE INDEX IF NOT EXISTS idx_appointment_notes_appointment_id ON public.appointment_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_notes_provider_id ON public.appointment_notes(provider_id);

-- appointment_questionnaire_responses
CREATE INDEX IF NOT EXISTS idx_appt_questionnaire_responses_appointment_id ON public.appointment_questionnaire_responses(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appt_questionnaire_responses_questionnaire_id ON public.appointment_questionnaire_responses(questionnaire_id);

-- appointment_questionnaires
CREATE INDEX IF NOT EXISTS idx_appointment_questionnaires_service_id ON public.appointment_questionnaires(service_id);

-- appointment_reminders
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment_id ON public.appointment_reminders(appointment_id);

-- appointment_waitlist
CREATE INDEX IF NOT EXISTS idx_appointment_waitlist_appointment_type_id ON public.appointment_waitlist(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_appointment_waitlist_matched_appointment_id ON public.appointment_waitlist(matched_appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_waitlist_patient_id ON public.appointment_waitlist(patient_id);

-- appointments
CREATE INDEX IF NOT EXISTS idx_appointments_cancelled_by ON public.appointments(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_appointments_insurance_id ON public.appointments(insurance_id);
CREATE INDEX IF NOT EXISTS idx_appointments_location_id ON public.appointments(location_id);

-- billing_transactions
CREATE INDEX IF NOT EXISTS idx_billing_transactions_user_id ON public.billing_transactions(user_id);

-- blockchain_integrity_checks
CREATE INDEX IF NOT EXISTS idx_blockchain_integrity_checks_node_id ON public.blockchain_integrity_checks(node_id);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);

-- chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent_id ON public.chat_sessions(agent_id);

-- child_growth_records
CREATE INDEX IF NOT EXISTS idx_child_growth_records_recorded_by ON public.child_growth_records(recorded_by);

-- child_profiles
CREATE INDEX IF NOT EXISTS idx_child_profiles_pediatrician_id ON public.child_profiles(pediatrician_id);

-- clinic_locations
CREATE INDEX IF NOT EXISTS idx_clinic_locations_created_by ON public.clinic_locations(created_by);

-- clinic_provider_invitations
CREATE INDEX IF NOT EXISTS idx_clinic_provider_invitations_provider_id ON public.clinic_provider_invitations(provider_id);

-- clinical_notes
CREATE INDEX IF NOT EXISTS idx_clinical_notes_provider_id ON public.clinical_notes(provider_id);

-- clinical_templates
CREATE INDEX IF NOT EXISTS idx_clinical_templates_created_by ON public.clinical_templates(created_by);

-- cms_blog_categories
CREATE INDEX IF NOT EXISTS idx_cms_blog_categories_parent_category_id ON public.cms_blog_categories(parent_category_id);

-- cms_blog_tags_junction
CREATE INDEX IF NOT EXISTS idx_cms_blog_tags_junction_blog_id ON public.cms_blog_tags_junction(blog_id);
CREATE INDEX IF NOT EXISTS idx_cms_blog_tags_junction_tag_id ON public.cms_blog_tags_junction(tag_id);

-- cms_faqs
CREATE INDEX IF NOT EXISTS idx_cms_faqs_category_id ON public.cms_faqs(category_id);

-- cms_locations_content
CREATE INDEX IF NOT EXISTS idx_cms_locations_content_location_id ON public.cms_locations_content(location_id);

-- cms_pages
CREATE INDEX IF NOT EXISTS idx_cms_pages_parent_page_id ON public.cms_pages(parent_page_id);

-- consent_forms
CREATE INDEX IF NOT EXISTS idx_consent_forms_appointment_id ON public.consent_forms(appointment_id);

-- consultation_feedback
CREATE INDEX IF NOT EXISTS idx_consultation_feedback_consultation_id ON public.consultation_feedback(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_feedback_patient_id ON public.consultation_feedback(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_feedback_provider_id ON public.consultation_feedback(provider_id);

-- consultation_messages
CREATE INDEX IF NOT EXISTS idx_consultation_messages_consultation_id ON public.consultation_messages(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_messages_sender_id ON public.consultation_messages(sender_id);

-- consultation_notes
CREATE INDEX IF NOT EXISTS idx_consultation_notes_appointment_id ON public.consultation_notes(appointment_id);

-- consultation_workflow_steps
CREATE INDEX IF NOT EXISTS idx_consultation_workflow_steps_session_id ON public.consultation_workflow_steps(session_id);

-- courier_assignments
CREATE INDEX IF NOT EXISTS idx_courier_assignments_courier_staff_id ON public.courier_assignments(courier_staff_id);

-- custom_roles
CREATE INDEX IF NOT EXISTS idx_custom_roles_created_by ON public.custom_roles(created_by);

-- custom_table_audit_log
CREATE INDEX IF NOT EXISTS idx_custom_table_audit_log_table_id ON public.custom_table_audit_log(table_id);

-- drug_interactions
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug_2_id ON public.drug_interactions(drug_2_id);

-- e_prescriptions
CREATE INDEX IF NOT EXISTS idx_e_prescriptions_appointment_id ON public.e_prescriptions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_e_prescriptions_consultation_id ON public.e_prescriptions(consultation_id);

-- email_attachments
CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id ON public.email_attachments(email_id);

-- emergency_contacts
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_patient_id ON public.emergency_contacts(patient_id);

-- employee_documents
CREATE INDEX IF NOT EXISTS idx_employee_documents_verified_by ON public.employee_documents(verified_by);

-- entity_status_history
CREATE INDEX IF NOT EXISTS idx_entity_status_history_changed_by ON public.entity_status_history(changed_by);

-- external_deliveries
CREATE INDEX IF NOT EXISTS idx_external_deliveries_integration_id ON public.external_deliveries(integration_id);

-- fhir_allergy_intolerances
CREATE INDEX IF NOT EXISTS idx_fhir_allergy_intolerances_provider_id ON public.fhir_allergy_intolerances(provider_id);

-- fhir_conditions
CREATE INDEX IF NOT EXISTS idx_fhir_conditions_appointment_id ON public.fhir_conditions(appointment_id);

-- fhir_medication_dispenses
CREATE INDEX IF NOT EXISTS idx_fhir_medication_dispenses_medication_request_id ON public.fhir_medication_dispenses(medication_request_id);

-- fhir_medication_requests
CREATE INDEX IF NOT EXISTS idx_fhir_medication_requests_appointment_id ON public.fhir_medication_requests(appointment_id);

-- fhir_observations
CREATE INDEX IF NOT EXISTS idx_fhir_observations_appointment_id ON public.fhir_observations(appointment_id);

-- fhir_procedures
CREATE INDEX IF NOT EXISTS idx_fhir_procedures_appointment_id ON public.fhir_procedures(appointment_id);

-- fhir_resources
CREATE INDEX IF NOT EXISTS idx_fhir_resources_patient_id ON public.fhir_resources(patient_id);
CREATE INDEX IF NOT EXISTS idx_fhir_resources_provider_id ON public.fhir_resources(provider_id);

-- fhir_sync_logs
CREATE INDEX IF NOT EXISTS idx_fhir_sync_logs_endpoint_id ON public.fhir_sync_logs(endpoint_id);

-- guardianship_documents
CREATE INDEX IF NOT EXISTS idx_guardianship_documents_guardian_id ON public.guardianship_documents(guardian_id);
CREATE INDEX IF NOT EXISTS idx_guardianship_documents_verified_by ON public.guardianship_documents(verified_by);

-- help_articles
CREATE INDEX IF NOT EXISTS idx_help_articles_author_id ON public.help_articles(author_id);

-- insurance_claims
CREATE INDEX IF NOT EXISTS idx_insurance_claims_appointment_id ON public.insurance_claims(appointment_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_insurance_id ON public.insurance_claims(insurance_id);

-- inventory_transactions
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_order_id ON public.inventory_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_staff_id ON public.inventory_transactions(staff_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_supplier_id ON public.inventory_transactions(supplier_id);

-- invoice_items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- kanban_cards
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column_id ON public.kanban_cards(column_id);

-- kanban_columns
CREATE INDEX IF NOT EXISTS idx_kanban_columns_board_id ON public.kanban_columns(board_id);

-- lab_results
CREATE INDEX IF NOT EXISTS idx_lab_results_provider_id ON public.lab_results(provider_id);

-- leave_requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_approver_id ON public.leave_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type_id ON public.leave_requests(leave_type_id);

-- medical_records
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_provider_id ON public.medical_records(provider_id);

-- medication_history
CREATE INDEX IF NOT EXISTS idx_medication_history_prescribing_provider_id ON public.medication_history(prescribing_provider_id);

-- medication_logs
CREATE INDEX IF NOT EXISTS idx_medication_logs_patient_id ON public.medication_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_patient_medication_id ON public.medication_logs(patient_medication_id);

-- medication_reminders
CREATE INDEX IF NOT EXISTS idx_medication_reminders_prescription_id ON public.medication_reminders(prescription_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON public.messages(parent_message_id);

-- order_fulfillment
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_assigned_to ON public.order_fulfillment(assigned_to);
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_quality_check_by ON public.order_fulfillment(quality_check_by);
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_verification_by ON public.order_fulfillment(verification_by);

-- order_items
CREATE INDEX IF NOT EXISTS idx_order_items_inventory_id ON public.order_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_prescription_item_id ON public.order_items(prescription_item_id);

-- order_notes
CREATE INDEX IF NOT EXISTS idx_order_notes_staff_id ON public.order_notes(staff_id);

-- order_status_history
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON public.order_status_history(changed_by);

-- patient_allergies
CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient_id ON public.patient_allergies(patient_id);

-- patient_consents
CREATE INDEX IF NOT EXISTS idx_patient_consents_pharmacy_id ON public.patient_consents(pharmacy_id);

-- patient_insurance
CREATE INDEX IF NOT EXISTS idx_patient_insurance_patient_id ON public.patient_insurance(patient_id);

-- patient_insurance_policies
CREATE INDEX IF NOT EXISTS idx_patient_insurance_policies_patient_id ON public.patient_insurance_policies(patient_id);

-- patient_medications
CREATE INDEX IF NOT EXISTS idx_patient_medications_patient_id ON public.patient_medications(patient_id);

-- patient_search_history
CREATE INDEX IF NOT EXISTS idx_patient_search_history_patient_id ON public.patient_search_history(patient_id);

-- payslips
CREATE INDEX IF NOT EXISTS idx_payslips_salary_structure_id ON public.payslips(salary_structure_id);

-- pharmacy_communications
CREATE INDEX IF NOT EXISTS idx_pharmacy_communications_parent_message_id ON public.pharmacy_communications(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_communications_pharmacy_id ON public.pharmacy_communications(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_communications_prescription_id ON public.pharmacy_communications(prescription_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_communications_sender_id ON public.pharmacy_communications(sender_id);

-- pharmacy_delivery_zones
CREATE INDEX IF NOT EXISTS idx_pharmacy_delivery_zones_pharmacy_id ON public.pharmacy_delivery_zones(pharmacy_id);

-- pharmacy_insurance_claims
CREATE INDEX IF NOT EXISTS idx_pharmacy_insurance_claims_order_id ON public.pharmacy_insurance_claims(order_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_insurance_claims_patient_id ON public.pharmacy_insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_insurance_claims_prescription_id ON public.pharmacy_insurance_claims(prescription_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_insurance_claims_submitted_by ON public.pharmacy_insurance_claims(submitted_by);

-- pharmacy_inventory
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_category_id ON public.pharmacy_inventory(category_id);

-- pharmacy_licenses
CREATE INDEX IF NOT EXISTS idx_pharmacy_licenses_verified_by ON public.pharmacy_licenses(verified_by);

-- pharmacy_orders
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_prescription_id ON public.pharmacy_orders(prescription_id);

-- pharmacy_refunds
CREATE INDEX IF NOT EXISTS idx_pharmacy_refunds_approved_by ON public.pharmacy_refunds(approved_by);
CREATE INDEX IF NOT EXISTS idx_pharmacy_refunds_requested_by ON public.pharmacy_refunds(requested_by);
CREATE INDEX IF NOT EXISTS idx_pharmacy_refunds_transaction_id ON public.pharmacy_refunds(transaction_id);

-- pharmacy_transactions
CREATE INDEX IF NOT EXISTS idx_pharmacy_transactions_gateway_id ON public.pharmacy_transactions(gateway_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_transactions_processed_by ON public.pharmacy_transactions(processed_by);

-- post_comments
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_comment_id ON public.post_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);

-- prescription_audit_log
CREATE INDEX IF NOT EXISTS idx_prescription_audit_log_performed_by ON public.prescription_audit_log(performed_by);

-- prescription_fills
CREATE INDEX IF NOT EXISTS idx_prescription_fills_pharmacist_id ON public.prescription_fills(pharmacist_id);
CREATE INDEX IF NOT EXISTS idx_prescription_fills_pharmacy_id ON public.prescription_fills(pharmacy_id);

-- prescription_items
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id ON public.prescription_items(prescription_id);

-- prescription_pharmacies
CREATE INDEX IF NOT EXISTS idx_prescription_pharmacies_pharmacy_id ON public.prescription_pharmacies(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescription_pharmacies_prescription_id ON public.prescription_pharmacies(prescription_id);

-- prescription_refill_requests
CREATE INDEX IF NOT EXISTS idx_prescription_refill_requests_patient_id ON public.prescription_refill_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_refill_requests_prescription_id ON public.prescription_refill_requests(prescription_id);

-- prescription_refills
CREATE INDEX IF NOT EXISTS idx_prescription_refills_approved_by ON public.prescription_refills(approved_by);
CREATE INDEX IF NOT EXISTS idx_prescription_refills_pharmacy_id ON public.prescription_refills(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescription_refills_prescription_id ON public.prescription_refills(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_refills_requested_by ON public.prescription_refills(requested_by);

-- prescription_rejections
CREATE INDEX IF NOT EXISTS idx_prescription_rejections_pharmacy_id ON public.prescription_rejections(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescription_rejections_rejected_by ON public.prescription_rejections(rejected_by);

-- prescription_safety_alerts
CREATE INDEX IF NOT EXISTS idx_prescription_safety_alerts_overridden_by ON public.prescription_safety_alerts(overridden_by);
CREATE INDEX IF NOT EXISTS idx_prescription_safety_alerts_prescription_id ON public.prescription_safety_alerts(prescription_id);

-- prescription_templates
CREATE INDEX IF NOT EXISTS idx_prescription_templates_drug_id ON public.prescription_templates(drug_id);
CREATE INDEX IF NOT EXISTS idx_prescription_templates_provider_id ON public.prescription_templates(provider_id);

-- prescription_validations
CREATE INDEX IF NOT EXISTS idx_prescription_validations_validated_by ON public.prescription_validations(validated_by);

-- prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment_id ON public.prescriptions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_filled_by ON public.prescriptions(filled_by);
CREATE INDEX IF NOT EXISTS idx_prescriptions_pharmacy_id ON public.prescriptions(pharmacy_id);

-- procedure_notes
CREATE INDEX IF NOT EXISTS idx_procedure_notes_procedure_id ON public.procedure_notes(procedure_id);

-- provider_admin_approvals
CREATE INDEX IF NOT EXISTS idx_provider_admin_approvals_provider_id ON public.provider_admin_approvals(provider_id);

-- provider_availability_templates
CREATE INDEX IF NOT EXISTS idx_provider_availability_templates_location_id ON public.provider_availability_templates(location_id);
CREATE INDEX IF NOT EXISTS idx_provider_availability_templates_provider_id ON public.provider_availability_templates(provider_id);

-- provider_clinic_affiliations
CREATE INDEX IF NOT EXISTS idx_provider_clinic_affiliations_clinic_id ON public.provider_clinic_affiliations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_provider_clinic_affiliations_provider_id ON public.provider_clinic_affiliations(provider_id);

-- provider_insurances
CREATE INDEX IF NOT EXISTS idx_provider_insurances_provider_id ON public.provider_insurances(provider_id);

-- provider_review_responses
CREATE INDEX IF NOT EXISTS idx_provider_review_responses_provider_id ON public.provider_review_responses(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_review_responses_review_id ON public.provider_review_responses(review_id);

-- provider_reviews
CREATE INDEX IF NOT EXISTS idx_provider_reviews_patient_id ON public.provider_reviews(patient_id);

-- provider_schedules
CREATE INDEX IF NOT EXISTS idx_provider_schedules_location_id ON public.provider_schedules(location_id);
CREATE INDEX IF NOT EXISTS idx_provider_schedules_provider_id ON public.provider_schedules(provider_id);

-- provider_time_blocks
CREATE INDEX IF NOT EXISTS idx_provider_time_blocks_location_id ON public.provider_time_blocks(location_id);

-- provider_time_slots
CREATE INDEX IF NOT EXISTS idx_provider_time_slots_appointment_id ON public.provider_time_slots(appointment_id);
CREATE INDEX IF NOT EXISTS idx_provider_time_slots_location_id ON public.provider_time_slots(location_id);
CREATE INDEX IF NOT EXISTS idx_provider_time_slots_provider_id ON public.provider_time_slots(provider_id);

-- provider_transactions
CREATE INDEX IF NOT EXISTS idx_provider_transactions_claim_id ON public.provider_transactions(claim_id);
CREATE INDEX IF NOT EXISTS idx_provider_transactions_related_transaction_id ON public.provider_transactions(related_transaction_id);

-- provider_verification_history
CREATE INDEX IF NOT EXISTS idx_provider_verification_history_application_id ON public.provider_verification_history(application_id);

-- provincial_ehr_integrations
CREATE INDEX IF NOT EXISTS idx_provincial_ehr_integrations_fhir_endpoint_id ON public.provincial_ehr_integrations(fhir_endpoint_id);

-- record_shares
CREATE INDEX IF NOT EXISTS idx_record_shares_shared_with_provider_id ON public.record_shares(shared_with_provider_id);

-- salary_structures
CREATE INDEX IF NOT EXISTS idx_salary_structures_designation_id ON public.salary_structures(designation_id);

-- secure_messages
CREATE INDEX IF NOT EXISTS idx_secure_messages_sender_id ON public.secure_messages(sender_id);

-- session_recordings
CREATE INDEX IF NOT EXISTS idx_session_recordings_session_id ON public.session_recordings(session_id);

-- staff_schedules
CREATE INDEX IF NOT EXISTS idx_staff_schedules_created_by ON public.staff_schedules(created_by);

-- support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);

-- ticket_messages
CREATE INDEX IF NOT EXISTS idx_ticket_messages_user_id ON public.ticket_messages(user_id);

-- user_custom_roles
CREATE INDEX IF NOT EXISTS idx_user_custom_roles_assigned_by ON public.user_custom_roles(assigned_by);

-- user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_department_id ON public.user_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_designation_id ON public.user_profiles(designation_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_manager_id ON public.user_profiles(manager_id);

-- verification_documents
CREATE INDEX IF NOT EXISTS idx_verification_documents_pharmacy_id ON public.verification_documents(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_verified_by ON public.verification_documents(verified_by);

-- video_consultations
CREATE INDEX IF NOT EXISTS idx_video_consultations_appointment_id ON public.video_consultations(appointment_id);

-- virtual_waiting_room
CREATE INDEX IF NOT EXISTS idx_virtual_waiting_room_appointment_id ON public.virtual_waiting_room(appointment_id);
CREATE INDEX IF NOT EXISTS idx_virtual_waiting_room_patient_id ON public.virtual_waiting_room(patient_id);

-- waitlist
CREATE INDEX IF NOT EXISTS idx_waitlist_patient_id ON public.waitlist(patient_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_provider_id ON public.waitlist(provider_id);
