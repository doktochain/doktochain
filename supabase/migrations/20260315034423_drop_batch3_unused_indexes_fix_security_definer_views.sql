/*
  # Drop Unused Indexes (Batch 3), Fix Security Definer Views, Fix Remaining Always-True RLS

  ## Summary
  1. Drops ~200 unused indexes identified by the security advisor
  2. Recreates cms_blog_tags_with_counts and cms_blog_categories_with_counts as regular
     (SECURITY INVOKER) views, removing the SECURITY DEFINER property
  3. Fixes remaining always-true INSERT RLS policies on audit_failures and custom_table_audit_log

  ## Security Changes
  - Views no longer run with creator's elevated permissions (privilege escalation fix)
  - System audit tables now restricted to service_role only for inserts
*/

-- Drop unused indexes (batch 3)
DROP INDEX IF EXISTS public.idx_appointments_insurance_id;
DROP INDEX IF EXISTS public.idx_admin_notes_admin_user_id;
DROP INDEX IF EXISTS public.idx_ai_soap_notes_session_id;
DROP INDEX IF EXISTS public.idx_ai_transcriptions_session_id;
DROP INDEX IF EXISTS public.idx_allergies_documented_by_provider_id;
DROP INDEX IF EXISTS public.idx_appointment_consent_forms_appointment_id;
DROP INDEX IF EXISTS public.idx_appointment_insurance_verification_appointment_id;
DROP INDEX IF EXISTS public.idx_appointment_notes_appointment_id;
DROP INDEX IF EXISTS public.idx_appointment_notes_provider_id;
DROP INDEX IF EXISTS public.idx_appt_questionnaire_responses_appointment_id;
DROP INDEX IF EXISTS public.idx_appt_questionnaire_responses_questionnaire_id;
DROP INDEX IF EXISTS public.idx_appointment_questionnaires_service_id;
DROP INDEX IF EXISTS public.idx_appointment_reminders_appointment_id;
DROP INDEX IF EXISTS public.idx_appointment_waitlist_appointment_type_id;
DROP INDEX IF EXISTS public.idx_appointment_waitlist_matched_appointment_id;
DROP INDEX IF EXISTS public.idx_appointment_waitlist_patient_id;
DROP INDEX IF EXISTS public.idx_appointments_cancelled_by;
DROP INDEX IF EXISTS public.idx_appointments_location_id;
DROP INDEX IF EXISTS public.idx_billing_transactions_user_id;
DROP INDEX IF EXISTS public.idx_blockchain_integrity_checks_node_id;
DROP INDEX IF EXISTS public.idx_chat_messages_sender_id;
DROP INDEX IF EXISTS public.idx_chat_sessions_agent_id;
DROP INDEX IF EXISTS public.idx_child_growth_records_recorded_by;
DROP INDEX IF EXISTS public.idx_child_profiles_pediatrician_id;
DROP INDEX IF EXISTS public.idx_clinic_locations_created_by;
DROP INDEX IF EXISTS public.idx_clinic_provider_invitations_provider_id;
DROP INDEX IF EXISTS public.idx_clinical_notes_provider_id;
DROP INDEX IF EXISTS public.idx_clinical_templates_created_by;
DROP INDEX IF EXISTS public.idx_cms_blog_categories_parent_category_id;
DROP INDEX IF EXISTS public.idx_cms_blog_tags_junction_blog_id;
DROP INDEX IF EXISTS public.idx_cms_blog_tags_junction_tag_id;
DROP INDEX IF EXISTS public.idx_cms_faqs_category_id;
DROP INDEX IF EXISTS public.idx_cms_locations_content_location_id;
DROP INDEX IF EXISTS public.idx_cms_pages_parent_page_id;
DROP INDEX IF EXISTS public.idx_consent_forms_appointment_id;
DROP INDEX IF EXISTS public.idx_consultation_feedback_consultation_id;
DROP INDEX IF EXISTS public.idx_consultation_feedback_patient_id;
DROP INDEX IF EXISTS public.idx_consultation_feedback_provider_id;
DROP INDEX IF EXISTS public.idx_consultation_messages_consultation_id;
DROP INDEX IF EXISTS public.idx_consultation_messages_sender_id;
DROP INDEX IF EXISTS public.idx_consultation_notes_appointment_id;
DROP INDEX IF EXISTS public.idx_consultation_workflow_steps_session_id;
DROP INDEX IF EXISTS public.idx_courier_assignments_courier_staff_id;
DROP INDEX IF EXISTS public.idx_custom_roles_created_by;
DROP INDEX IF EXISTS public.idx_custom_table_audit_log_table_id;
DROP INDEX IF EXISTS public.idx_drug_interactions_drug_2_id;
DROP INDEX IF EXISTS public.idx_e_prescriptions_appointment_id;
DROP INDEX IF EXISTS public.idx_e_prescriptions_consultation_id;
DROP INDEX IF EXISTS public.idx_email_attachments_email_id;
DROP INDEX IF EXISTS public.idx_emergency_contacts_patient_id;
DROP INDEX IF EXISTS public.idx_employee_documents_verified_by;
DROP INDEX IF EXISTS public.idx_entity_status_history_changed_by;
DROP INDEX IF EXISTS public.idx_external_deliveries_integration_id;
DROP INDEX IF EXISTS public.idx_fhir_allergy_intolerances_provider_id;
DROP INDEX IF EXISTS public.idx_fhir_conditions_appointment_id;
DROP INDEX IF EXISTS public.idx_fhir_medication_dispenses_medication_request_id;
DROP INDEX IF EXISTS public.idx_fhir_medication_requests_appointment_id;
DROP INDEX IF EXISTS public.idx_fhir_observations_appointment_id;
DROP INDEX IF EXISTS public.idx_fhir_procedures_appointment_id;
DROP INDEX IF EXISTS public.idx_fhir_resources_patient_id;
DROP INDEX IF EXISTS public.idx_fhir_resources_provider_id;
DROP INDEX IF EXISTS public.idx_fhir_sync_logs_endpoint_id;
DROP INDEX IF EXISTS public.idx_guardianship_documents_guardian_id;
DROP INDEX IF EXISTS public.idx_guardianship_documents_verified_by;
DROP INDEX IF EXISTS public.idx_help_articles_author_id;
DROP INDEX IF EXISTS public.idx_insurance_claims_appointment_id;
DROP INDEX IF EXISTS public.idx_insurance_claims_insurance_id;
DROP INDEX IF EXISTS public.idx_inventory_transactions_order_id;
DROP INDEX IF EXISTS public.idx_inventory_transactions_staff_id;
DROP INDEX IF EXISTS public.idx_inventory_transactions_supplier_id;
DROP INDEX IF EXISTS public.idx_invoice_items_invoice_id;
DROP INDEX IF EXISTS public.idx_kanban_cards_column_id;
DROP INDEX IF EXISTS public.idx_kanban_columns_board_id;
DROP INDEX IF EXISTS public.idx_lab_results_provider_id;
DROP INDEX IF EXISTS public.idx_leave_requests_approver_id;
DROP INDEX IF EXISTS public.idx_leave_requests_leave_type_id;
DROP INDEX IF EXISTS public.idx_medication_reminders_prescription_id;
DROP INDEX IF EXISTS public.idx_medical_records_patient_id;
DROP INDEX IF EXISTS public.idx_medical_records_provider_id;
DROP INDEX IF EXISTS public.idx_medication_history_prescribing_provider_id;
DROP INDEX IF EXISTS public.idx_medication_logs_patient_id;
DROP INDEX IF EXISTS public.idx_medication_logs_patient_medication_id;
DROP INDEX IF EXISTS public.idx_messages_parent_message_id;
DROP INDEX IF EXISTS public.idx_order_fulfillment_assigned_to;
DROP INDEX IF EXISTS public.idx_order_fulfillment_quality_check_by;
DROP INDEX IF EXISTS public.idx_order_fulfillment_verification_by;
DROP INDEX IF EXISTS public.idx_order_items_inventory_id;
DROP INDEX IF EXISTS public.idx_order_items_order_id;
DROP INDEX IF EXISTS public.idx_patient_insurance_policies_patient_id;
DROP INDEX IF EXISTS public.idx_patient_medications_patient_id;
DROP INDEX IF EXISTS public.idx_order_items_prescription_item_id;
DROP INDEX IF EXISTS public.idx_order_notes_staff_id;
DROP INDEX IF EXISTS public.idx_order_status_history_changed_by;
DROP INDEX IF EXISTS public.idx_patient_allergies_patient_id;
DROP INDEX IF EXISTS public.idx_patient_consents_pharmacy_id;
DROP INDEX IF EXISTS public.idx_patient_insurance_patient_id;
DROP INDEX IF EXISTS public.idx_patient_search_history_patient_id;
DROP INDEX IF EXISTS public.idx_payslips_salary_structure_id;
DROP INDEX IF EXISTS public.idx_pharmacy_communications_parent_message_id;
DROP INDEX IF EXISTS public.idx_pharmacy_communications_pharmacy_id;
DROP INDEX IF EXISTS public.idx_pharmacy_communications_prescription_id;
DROP INDEX IF EXISTS public.idx_pharmacy_communications_sender_id;
DROP INDEX IF EXISTS public.idx_pharmacy_licenses_verified_by;
DROP INDEX IF EXISTS public.idx_pharmacy_orders_prescription_id;
DROP INDEX IF EXISTS public.idx_pharmacy_delivery_zones_pharmacy_id;
DROP INDEX IF EXISTS public.idx_pharmacy_insurance_claims_order_id;
DROP INDEX IF EXISTS public.idx_pharmacy_insurance_claims_patient_id;
DROP INDEX IF EXISTS public.idx_pharmacy_insurance_claims_prescription_id;
DROP INDEX IF EXISTS public.idx_pharmacy_insurance_claims_submitted_by;
DROP INDEX IF EXISTS public.idx_pharmacy_inventory_category_id;
DROP INDEX IF EXISTS public.idx_pharmacy_refunds_approved_by;
DROP INDEX IF EXISTS public.idx_pharmacy_refunds_requested_by;
DROP INDEX IF EXISTS public.idx_pharmacy_refunds_transaction_id;
DROP INDEX IF EXISTS public.idx_pharmacy_transactions_gateway_id;
DROP INDEX IF EXISTS public.idx_pharmacy_transactions_processed_by;
DROP INDEX IF EXISTS public.idx_post_comments_parent_comment_id;
DROP INDEX IF EXISTS public.idx_post_comments_post_id;
DROP INDEX IF EXISTS public.idx_prescription_audit_log_performed_by;
DROP INDEX IF EXISTS public.idx_prescription_fills_pharmacist_id;
DROP INDEX IF EXISTS public.idx_prescription_fills_pharmacy_id;
DROP INDEX IF EXISTS public.idx_prescription_items_prescription_id;
DROP INDEX IF EXISTS public.idx_prescription_pharmacies_pharmacy_id;
DROP INDEX IF EXISTS public.idx_prescription_pharmacies_prescription_id;
DROP INDEX IF EXISTS public.idx_prescription_refill_requests_patient_id;
DROP INDEX IF EXISTS public.idx_prescription_refill_requests_prescription_id;
DROP INDEX IF EXISTS public.idx_prescription_refills_approved_by;
DROP INDEX IF EXISTS public.idx_prescription_refills_pharmacy_id;
DROP INDEX IF EXISTS public.idx_prescription_refills_prescription_id;
DROP INDEX IF EXISTS public.idx_prescription_refills_requested_by;
DROP INDEX IF EXISTS public.idx_prescription_rejections_pharmacy_id;
DROP INDEX IF EXISTS public.idx_prescriptions_appointment_id;
DROP INDEX IF EXISTS public.idx_prescriptions_filled_by;
DROP INDEX IF EXISTS public.idx_prescription_rejections_rejected_by;
DROP INDEX IF EXISTS public.idx_prescription_safety_alerts_overridden_by;
DROP INDEX IF EXISTS public.idx_prescription_safety_alerts_prescription_id;
DROP INDEX IF EXISTS public.idx_prescription_templates_drug_id;
DROP INDEX IF EXISTS public.idx_prescription_templates_provider_id;
DROP INDEX IF EXISTS public.idx_prescription_validations_validated_by;
DROP INDEX IF EXISTS public.idx_prescriptions_pharmacy_id;
DROP INDEX IF EXISTS public.idx_procedure_notes_procedure_id;
DROP INDEX IF EXISTS public.idx_provider_admin_approvals_provider_id;
DROP INDEX IF EXISTS public.idx_provider_availability_templates_location_id;
DROP INDEX IF EXISTS public.idx_provider_availability_templates_provider_id;
DROP INDEX IF EXISTS public.idx_provider_clinic_affiliations_clinic_id;
DROP INDEX IF EXISTS public.idx_provider_clinic_affiliations_provider_id;
DROP INDEX IF EXISTS public.idx_provider_insurances_provider_id;
DROP INDEX IF EXISTS public.idx_provider_review_responses_provider_id;
DROP INDEX IF EXISTS public.idx_provider_review_responses_review_id;
DROP INDEX IF EXISTS public.idx_provider_reviews_patient_id;
DROP INDEX IF EXISTS public.idx_provider_schedules_location_id;
DROP INDEX IF EXISTS public.idx_provider_schedules_provider_id;
DROP INDEX IF EXISTS public.idx_provider_time_blocks_location_id;
DROP INDEX IF EXISTS public.idx_provider_time_slots_appointment_id;
DROP INDEX IF EXISTS public.idx_provider_time_slots_location_id;
DROP INDEX IF EXISTS public.idx_secure_messages_sender_id;
DROP INDEX IF EXISTS public.idx_session_recordings_session_id;
DROP INDEX IF EXISTS public.idx_staff_schedules_created_by;
DROP INDEX IF EXISTS public.idx_support_tickets_assigned_to;
DROP INDEX IF EXISTS public.idx_provider_time_slots_provider_id;
DROP INDEX IF EXISTS public.idx_provider_transactions_claim_id;
DROP INDEX IF EXISTS public.idx_provider_transactions_related_transaction_id;
DROP INDEX IF EXISTS public.idx_provider_verification_history_application_id;
DROP INDEX IF EXISTS public.idx_provincial_ehr_integrations_fhir_endpoint_id;
DROP INDEX IF EXISTS public.idx_record_shares_shared_with_provider_id;
DROP INDEX IF EXISTS public.idx_salary_structures_designation_id;
DROP INDEX IF EXISTS public.idx_ticket_messages_user_id;
DROP INDEX IF EXISTS public.idx_user_custom_roles_assigned_by;
DROP INDEX IF EXISTS public.idx_user_profiles_department_id;
DROP INDEX IF EXISTS public.idx_user_profiles_designation_id;
DROP INDEX IF EXISTS public.idx_user_profiles_manager_id;
DROP INDEX IF EXISTS public.idx_verification_documents_pharmacy_id;
DROP INDEX IF EXISTS public.idx_verification_documents_verified_by;
DROP INDEX IF EXISTS public.idx_video_consultations_appointment_id;
DROP INDEX IF EXISTS public.idx_virtual_waiting_room_appointment_id;
DROP INDEX IF EXISTS public.idx_virtual_waiting_room_patient_id;
DROP INDEX IF EXISTS public.idx_waitlist_patient_id;
DROP INDEX IF EXISTS public.idx_waitlist_provider_id;
DROP INDEX IF EXISTS public.idx_fhir_endpoints_created_by;
DROP INDEX IF EXISTS public.idx_account_deletion_requests_user_id;
DROP INDEX IF EXISTS public.idx_admin_contacts_directory_contact_user_id;
DROP INDEX IF EXISTS public.idx_admin_email_monitoring_recipient_id;
DROP INDEX IF EXISTS public.idx_admin_email_monitoring_sender_id;
DROP INDEX IF EXISTS public.idx_admin_file_monitoring_uploader_id;
DROP INDEX IF EXISTS public.idx_admin_flags_assigned_to;
DROP INDEX IF EXISTS public.idx_admin_flags_flagged_by;
DROP INDEX IF EXISTS public.idx_admin_flags_resolved_by;
DROP INDEX IF EXISTS public.idx_admin_kanban_overview_owner_id;
DROP INDEX IF EXISTS public.idx_admin_social_feed_author_id;
DROP INDEX IF EXISTS public.idx_admin_system_events_organizer_id;
DROP INDEX IF EXISTS public.idx_admin_user_notes_user_id;
DROP INDEX IF EXISTS public.idx_ai_soap_notes_provider_reviewed_by;
DROP INDEX IF EXISTS public.idx_ai_transcriptions_edited_by;
DROP INDEX IF EXISTS public.idx_appointment_cancellations_cancelled_by;
DROP INDEX IF EXISTS public.idx_appointment_documents_uploaded_by;
DROP INDEX IF EXISTS public.idx_appointment_status_history_changed_by;
DROP INDEX IF EXISTS public.idx_appointments_questionnaire_approved_by;
DROP INDEX IF EXISTS public.idx_automated_messages_target_patient_id;
DROP INDEX IF EXISTS public.idx_blockchain_integrity_checks_checked_by;
DROP INDEX IF EXISTS public.idx_clinic_provider_invitations_invited_by;
DROP INDEX IF EXISTS public.idx_cms_testimonials_approved_by;
DROP INDEX IF EXISTS public.idx_consultation_workflow_steps_completed_by;
DROP INDEX IF EXISTS public.idx_contact_groups_user_id;
DROP INDEX IF EXISTS public.idx_content_moderation_queue_assigned_to;
DROP INDEX IF EXISTS public.idx_content_moderation_queue_author_id;
DROP INDEX IF EXISTS public.idx_content_moderation_queue_reviewed_by;
DROP INDEX IF EXISTS public.idx_custom_table_audit_log_performed_by;
DROP INDEX IF EXISTS public.idx_custom_tables_registry_created_by;
DROP INDEX IF EXISTS public.idx_data_export_requests_user_id;
DROP INDEX IF EXISTS public.idx_event_attendees_user_id;
DROP INDEX IF EXISTS public.idx_family_relationships_child_user_id;
DROP INDEX IF EXISTS public.idx_fhir_sync_logs_user_id;
DROP INDEX IF EXISTS public.idx_file_shares_shared_with_user_id;
DROP INDEX IF EXISTS public.idx_identity_documents_verified_by;
DROP INDEX IF EXISTS public.idx_identity_verification_verified_by;
DROP INDEX IF EXISTS public.idx_kanban_cards_assigned_to;
DROP INDEX IF EXISTS public.idx_leave_balances_leave_type_id;
DROP INDEX IF EXISTS public.idx_login_history_user_id;
DROP INDEX IF EXISTS public.idx_patient_favorite_providers_provider_id;
DROP INDEX IF EXISTS public.idx_patient_insurance_cards_verified_by;
DROP INDEX IF EXISTS public.idx_provider_admin_approvals_reviewed_by;
DROP INDEX IF EXISTS public.idx_provider_favorite_codes_billing_code_id;
DROP INDEX IF EXISTS public.idx_provider_onboarding_applications_reviewed_by;
DROP INDEX IF EXISTS public.idx_provider_settlements_settled_by;
DROP INDEX IF EXISTS public.idx_provider_verification_documents_verified_by;
DROP INDEX IF EXISTS public.idx_provider_verification_history_performed_by;
DROP INDEX IF EXISTS public.idx_providers_approved_by;
DROP INDEX IF EXISTS public.idx_refund_requests_recipient_id;
DROP INDEX IF EXISTS public.idx_patients_parent_user_id;
DROP INDEX IF EXISTS public.idx_platform_account_settings_updated_by;
DROP INDEX IF EXISTS public.idx_platform_expenses_approved_by;
DROP INDEX IF EXISTS public.idx_post_comments_user_id;
DROP INDEX IF EXISTS public.idx_post_reactions_user_id;
DROP INDEX IF EXISTS public.idx_refund_requests_reviewed_by;
DROP INDEX IF EXISTS public.idx_session_chat_messages_sender_id;
DROP INDEX IF EXISTS public.idx_session_files_uploaded_by;
DROP INDEX IF EXISTS public.idx_session_participants_user_id;
DROP INDEX IF EXISTS public.idx_staff_activity_logs_patient_id;
DROP INDEX IF EXISTS public.idx_staff_activity_logs_user_id;
DROP INDEX IF EXISTS public.idx_staff_chat_channels_provider_id;
DROP INDEX IF EXISTS public.idx_staff_chat_messages_patient_id;
DROP INDEX IF EXISTS public.idx_staff_members_user_id;

-- Fix Security Definer Views: recreate as regular (invoker security) views
DROP VIEW IF EXISTS public.cms_blog_tags_with_counts;
DROP VIEW IF EXISTS public.cms_blog_categories_with_counts;

CREATE VIEW public.cms_blog_tags_with_counts
WITH (security_invoker = true)
AS
SELECT
  t.id,
  t.name,
  t.slug,
  t.color,
  t.created_at,
  COUNT(j.blog_id) AS blog_count
FROM public.cms_blog_tags t
LEFT JOIN public.cms_blog_tags_junction j ON j.tag_id = t.id
GROUP BY t.id, t.name, t.slug, t.color, t.created_at;

CREATE VIEW public.cms_blog_categories_with_counts
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.name,
  c.slug,
  c.description,
  c.parent_category_id,
  c.created_at,
  COUNT(b.id) AS blog_count
FROM public.cms_blog_categories c
LEFT JOIN public.cms_blogs b ON b.category_id = c.id
GROUP BY c.id, c.name, c.slug, c.description, c.parent_category_id, c.created_at;

-- Fix remaining always-true INSERT RLS policies

-- audit_failures: drop all INSERT policies, replace with service_role only
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_failures' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_failures', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_failures') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'audit_failures'
        AND policyname = 'Service role can insert audit failures'
    ) THEN
      CREATE POLICY "Service role can insert audit failures"
        ON public.audit_failures
        FOR INSERT
        TO service_role
        WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- custom_table_audit_log: drop all INSERT policies, replace with service_role only
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'custom_table_audit_log' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.custom_table_audit_log', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_table_audit_log') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'custom_table_audit_log'
        AND policyname = 'Service role can insert custom table audit'
    ) THEN
      CREATE POLICY "Service role can insert custom table audit"
        ON public.custom_table_audit_log
        FOR INSERT
        TO service_role
        WITH CHECK (true);
    END IF;
  END IF;
END $$;
