/*
  # Add Remaining Missing Foreign Key Indexes

  ## Summary
  Adds covering indexes for all remaining foreign key columns that lack indexes.
  These were identified in the Supabase security advisor after the previous
  migration already covered the first batch.

  ## Changes
  Adds ~63 new B-tree indexes on foreign key columns across multiple tables
  to improve JOIN performance and referential integrity checks.
*/

-- account_deletion_requests
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id ON public.account_deletion_requests(user_id);

-- admin_contacts_directory
CREATE INDEX IF NOT EXISTS idx_admin_contacts_directory_contact_user_id ON public.admin_contacts_directory(contact_user_id);

-- admin_email_monitoring
CREATE INDEX IF NOT EXISTS idx_admin_email_monitoring_recipient_id ON public.admin_email_monitoring(recipient_id);
CREATE INDEX IF NOT EXISTS idx_admin_email_monitoring_sender_id ON public.admin_email_monitoring(sender_id);

-- admin_file_monitoring
CREATE INDEX IF NOT EXISTS idx_admin_file_monitoring_uploader_id ON public.admin_file_monitoring(uploader_id);

-- admin_flags
CREATE INDEX IF NOT EXISTS idx_admin_flags_assigned_to ON public.admin_flags(assigned_to);
CREATE INDEX IF NOT EXISTS idx_admin_flags_flagged_by ON public.admin_flags(flagged_by);
CREATE INDEX IF NOT EXISTS idx_admin_flags_resolved_by ON public.admin_flags(resolved_by);

-- admin_kanban_overview
CREATE INDEX IF NOT EXISTS idx_admin_kanban_overview_owner_id ON public.admin_kanban_overview(owner_id);

-- admin_social_feed
CREATE INDEX IF NOT EXISTS idx_admin_social_feed_author_id ON public.admin_social_feed(author_id);

-- admin_system_events
CREATE INDEX IF NOT EXISTS idx_admin_system_events_organizer_id ON public.admin_system_events(organizer_id);

-- admin_user_notes
CREATE INDEX IF NOT EXISTS idx_admin_user_notes_user_id ON public.admin_user_notes(user_id);

-- ai_soap_notes
CREATE INDEX IF NOT EXISTS idx_ai_soap_notes_provider_reviewed_by ON public.ai_soap_notes(provider_reviewed_by);

-- ai_transcriptions
CREATE INDEX IF NOT EXISTS idx_ai_transcriptions_edited_by ON public.ai_transcriptions(edited_by);

-- appointment_cancellations
CREATE INDEX IF NOT EXISTS idx_appointment_cancellations_cancelled_by ON public.appointment_cancellations(cancelled_by);

-- appointment_documents
CREATE INDEX IF NOT EXISTS idx_appointment_documents_uploaded_by ON public.appointment_documents(uploaded_by);

-- appointment_status_history
CREATE INDEX IF NOT EXISTS idx_appointment_status_history_changed_by ON public.appointment_status_history(changed_by);

-- appointments
CREATE INDEX IF NOT EXISTS idx_appointments_questionnaire_approved_by ON public.appointments(questionnaire_approved_by);

-- automated_messages
CREATE INDEX IF NOT EXISTS idx_automated_messages_target_patient_id ON public.automated_messages(target_patient_id);

-- blockchain_integrity_checks
CREATE INDEX IF NOT EXISTS idx_blockchain_integrity_checks_checked_by ON public.blockchain_integrity_checks(checked_by);

-- clinic_provider_invitations
CREATE INDEX IF NOT EXISTS idx_clinic_provider_invitations_invited_by ON public.clinic_provider_invitations(invited_by);

-- cms_testimonials
CREATE INDEX IF NOT EXISTS idx_cms_testimonials_approved_by ON public.cms_testimonials(approved_by);

-- consultation_workflow_steps
CREATE INDEX IF NOT EXISTS idx_consultation_workflow_steps_completed_by ON public.consultation_workflow_steps(completed_by);

-- contact_groups
CREATE INDEX IF NOT EXISTS idx_contact_groups_user_id ON public.contact_groups(user_id);

-- content_moderation_queue
CREATE INDEX IF NOT EXISTS idx_content_moderation_queue_assigned_to ON public.content_moderation_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_content_moderation_queue_author_id ON public.content_moderation_queue(author_id);
CREATE INDEX IF NOT EXISTS idx_content_moderation_queue_reviewed_by ON public.content_moderation_queue(reviewed_by);

-- custom_table_audit_log
CREATE INDEX IF NOT EXISTS idx_custom_table_audit_log_performed_by ON public.custom_table_audit_log(performed_by);

-- custom_tables_registry
CREATE INDEX IF NOT EXISTS idx_custom_tables_registry_created_by ON public.custom_tables_registry(created_by);

-- data_export_requests
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON public.data_export_requests(user_id);

-- event_attendees
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON public.event_attendees(user_id);

-- family_relationships
CREATE INDEX IF NOT EXISTS idx_family_relationships_child_user_id ON public.family_relationships(child_user_id);

-- fhir_endpoints
CREATE INDEX IF NOT EXISTS idx_fhir_endpoints_created_by ON public.fhir_endpoints(created_by);

-- fhir_sync_logs
CREATE INDEX IF NOT EXISTS idx_fhir_sync_logs_user_id ON public.fhir_sync_logs(user_id);

-- file_shares
CREATE INDEX IF NOT EXISTS idx_file_shares_shared_with_user_id ON public.file_shares(shared_with_user_id);

-- identity_documents
CREATE INDEX IF NOT EXISTS idx_identity_documents_verified_by ON public.identity_documents(verified_by);

-- identity_verification
CREATE INDEX IF NOT EXISTS idx_identity_verification_verified_by ON public.identity_verification(verified_by);

-- kanban_cards
CREATE INDEX IF NOT EXISTS idx_kanban_cards_assigned_to ON public.kanban_cards(assigned_to);

-- leave_balances
CREATE INDEX IF NOT EXISTS idx_leave_balances_leave_type_id ON public.leave_balances(leave_type_id);

-- login_history
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);

-- patient_favorite_providers
CREATE INDEX IF NOT EXISTS idx_patient_favorite_providers_provider_id ON public.patient_favorite_providers(provider_id);

-- patient_insurance_cards
CREATE INDEX IF NOT EXISTS idx_patient_insurance_cards_verified_by ON public.patient_insurance_cards(verified_by);

-- patients
CREATE INDEX IF NOT EXISTS idx_patients_parent_user_id ON public.patients(parent_user_id);

-- platform_account_settings
CREATE INDEX IF NOT EXISTS idx_platform_account_settings_updated_by ON public.platform_account_settings(updated_by);

-- platform_expenses
CREATE INDEX IF NOT EXISTS idx_platform_expenses_approved_by ON public.platform_expenses(approved_by);

-- post_comments
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);

-- post_reactions
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON public.post_reactions(user_id);

-- provider_admin_approvals
CREATE INDEX IF NOT EXISTS idx_provider_admin_approvals_reviewed_by ON public.provider_admin_approvals(reviewed_by);

-- provider_favorite_codes
CREATE INDEX IF NOT EXISTS idx_provider_favorite_codes_billing_code_id ON public.provider_favorite_codes(billing_code_id);

-- provider_onboarding_applications
CREATE INDEX IF NOT EXISTS idx_provider_onboarding_applications_reviewed_by ON public.provider_onboarding_applications(reviewed_by);

-- provider_settlements
CREATE INDEX IF NOT EXISTS idx_provider_settlements_settled_by ON public.provider_settlements(settled_by);

-- provider_verification_documents
CREATE INDEX IF NOT EXISTS idx_provider_verification_documents_verified_by ON public.provider_verification_documents(verified_by);

-- provider_verification_history
CREATE INDEX IF NOT EXISTS idx_provider_verification_history_performed_by ON public.provider_verification_history(performed_by);

-- providers
CREATE INDEX IF NOT EXISTS idx_providers_approved_by ON public.providers(approved_by);

-- refund_requests
CREATE INDEX IF NOT EXISTS idx_refund_requests_recipient_id ON public.refund_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_reviewed_by ON public.refund_requests(reviewed_by);

-- session_chat_messages
CREATE INDEX IF NOT EXISTS idx_session_chat_messages_sender_id ON public.session_chat_messages(sender_id);

-- session_files
CREATE INDEX IF NOT EXISTS idx_session_files_uploaded_by ON public.session_files(uploaded_by);

-- session_participants
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON public.session_participants(user_id);

-- staff_activity_logs
CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_patient_id ON public.staff_activity_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_user_id ON public.staff_activity_logs(user_id);

-- staff_chat_channels
CREATE INDEX IF NOT EXISTS idx_staff_chat_channels_provider_id ON public.staff_chat_channels(provider_id);

-- staff_chat_messages
CREATE INDEX IF NOT EXISTS idx_staff_chat_messages_patient_id ON public.staff_chat_messages(patient_id);

-- staff_members
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id ON public.staff_members(user_id);
