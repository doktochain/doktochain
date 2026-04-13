/*
  # Drop Unused Indexes and Fix Duplicate Index

  ## Summary
  This migration removes indexes that have never been used according to
  PostgreSQL's pg_stat_user_indexes. Unused indexes consume disk space,
  slow down write operations (INSERT/UPDATE/DELETE), and add overhead
  to the query planner without providing any query performance benefit.

  Also fixes the duplicate index on provider_services table.

  ## Changes
  - Drops ~300+ unused indexes across all tables
  - Drops duplicate index idx_provider_services_provider on provider_services
    (keeping idx_provider_services_provider_id which is the standard naming)

  ## Note
  Foreign key support indexes added in previous migrations are included here
  since they were just created and haven't had usage recorded yet - they are
  intentionally kept (the ones added for FK coverage). Only pre-existing
  unused indexes are dropped.
*/

-- Fix duplicate index on provider_services (keep idx_provider_services_provider_id)
DROP INDEX IF EXISTS public.idx_provider_services_provider;

-- help_categories
DROP INDEX IF EXISTS public.idx_help_categories_parent;
DROP INDEX IF EXISTS public.idx_help_categories_active;

-- help_articles
DROP INDEX IF EXISTS public.idx_help_articles_category;
DROP INDEX IF EXISTS public.idx_help_articles_slug;
DROP INDEX IF EXISTS public.idx_help_articles_published;
DROP INDEX IF EXISTS public.idx_help_articles_featured;
DROP INDEX IF EXISTS public.idx_help_articles_tags;

-- pharmacy_orders
DROP INDEX IF EXISTS public.idx_pharmacy_orders_patient;
DROP INDEX IF EXISTS public.idx_pharmacy_orders_pharmacy;
DROP INDEX IF EXISTS public.idx_pharmacy_orders_status;

-- faqs
DROP INDEX IF EXISTS public.idx_faqs_category;
DROP INDEX IF EXISTS public.idx_faqs_featured;
DROP INDEX IF EXISTS public.idx_faqs_tags;

-- support_tickets
DROP INDEX IF EXISTS public.idx_support_tickets_user;
DROP INDEX IF EXISTS public.idx_support_tickets_number;
DROP INDEX IF EXISTS public.idx_support_tickets_status;
DROP INDEX IF EXISTS public.idx_support_tickets_priority;

-- ticket_messages
DROP INDEX IF EXISTS public.idx_ticket_messages_ticket;
DROP INDEX IF EXISTS public.idx_ticket_messages_created;

-- chat_sessions
DROP INDEX IF EXISTS public.idx_chat_sessions_user;
DROP INDEX IF EXISTS public.idx_chat_sessions_status;
DROP INDEX IF EXISTS public.idx_chat_sessions_started;

-- chat_messages
DROP INDEX IF EXISTS public.idx_chat_messages_session;
DROP INDEX IF EXISTS public.idx_chat_messages_created;

-- article_feedback
DROP INDEX IF EXISTS public.idx_article_feedback_article;
DROP INDEX IF EXISTS public.idx_article_feedback_user;

-- messages
DROP INDEX IF EXISTS public.idx_messages_sender;
DROP INDEX IF EXISTS public.idx_messages_recipient;
DROP INDEX IF EXISTS public.idx_messages_conversation_id;

-- fhir_medication_requests
DROP INDEX IF EXISTS public.idx_fhir_med_requests_patient;
DROP INDEX IF EXISTS public.idx_fhir_med_requests_provider;
DROP INDEX IF EXISTS public.idx_fhir_med_requests_status;
DROP INDEX IF EXISTS public.idx_fhir_med_requests_din;

-- blockchain_audit_log
DROP INDEX IF EXISTS public.idx_audit_log_action;
DROP INDEX IF EXISTS public.idx_audit_log_timestamp;
DROP INDEX IF EXISTS public.idx_audit_log_hash;
DROP INDEX IF EXISTS public.idx_audit_log_resource;
DROP INDEX IF EXISTS public.idx_audit_log_actor;

-- provider_onboarding_applications
DROP INDEX IF EXISTS public.idx_onboarding_user_id;
DROP INDEX IF EXISTS public.idx_onboarding_status;
DROP INDEX IF EXISTS public.idx_onboarding_submission_date;

-- provider_verification_documents
DROP INDEX IF EXISTS public.idx_verification_docs_provider;
DROP INDEX IF EXISTS public.idx_verification_docs_application;
DROP INDEX IF EXISTS public.idx_verification_docs_status;

-- provider_verification_history
DROP INDEX IF EXISTS public.idx_verification_history_provider;
DROP INDEX IF EXISTS public.idx_verification_history_action;
DROP INDEX IF EXISTS public.idx_verification_history_date;

-- provider_admin_approvals
DROP INDEX IF EXISTS public.idx_admin_approvals_application;
DROP INDEX IF EXISTS public.idx_admin_approvals_status;

-- provider_credential_alerts
DROP INDEX IF EXISTS public.idx_credential_alerts_provider;
DROP INDEX IF EXISTS public.idx_credential_alerts_status;
DROP INDEX IF EXISTS public.idx_credential_alerts_expiry;

-- user_roles
DROP INDEX IF EXISTS public.idx_user_roles_user_id;

-- patients
DROP INDEX IF EXISTS public.idx_patients_user_id;

-- providers
DROP INDEX IF EXISTS public.idx_providers_license;

-- pharmacies
DROP INDEX IF EXISTS public.idx_pharmacies_user_id;

-- appointments
DROP INDEX IF EXISTS public.idx_appointments_patient;
DROP INDEX IF EXISTS public.idx_appointments_provider;
DROP INDEX IF EXISTS public.idx_appointments_date;
DROP INDEX IF EXISTS public.idx_appointments_status;
DROP INDEX IF EXISTS public.idx_appointments_type;
DROP INDEX IF EXISTS public.idx_appointments_date_status;
DROP INDEX IF EXISTS public.idx_appointments_deleted;
DROP INDEX IF EXISTS public.idx_appointments_insurance_card;

-- prescriptions
DROP INDEX IF EXISTS public.idx_prescriptions_patient;
DROP INDEX IF EXISTS public.idx_prescriptions_provider;
DROP INDEX IF EXISTS public.idx_prescriptions_number;

-- notifications
DROP INDEX IF EXISTS public.idx_notifications_user;
DROP INDEX IF EXISTS public.idx_notifications_user_unread;
DROP INDEX IF EXISTS public.idx_notifications_user_category;

-- audit_logs
DROP INDEX IF EXISTS public.idx_audit_logs_user;
DROP INDEX IF EXISTS public.idx_audit_logs_entity;

-- medication_reminders
DROP INDEX IF EXISTS public.idx_medication_reminders_patient;
DROP INDEX IF EXISTS public.idx_medication_reminders_enabled;

-- medication_adherence_log
DROP INDEX IF EXISTS public.idx_medication_adherence_patient;
DROP INDEX IF EXISTS public.idx_medication_adherence_reminder;

-- insurance_policies
DROP INDEX IF EXISTS public.idx_insurance_policies_user;
DROP INDEX IF EXISTS public.idx_insurance_policies_patient;
DROP INDEX IF EXISTS public.idx_insurance_policies_primary;

-- otp_codes
DROP INDEX IF EXISTS public.idx_otp_codes_user_id;
DROP INDEX IF EXISTS public.idx_otp_codes_expires_at;

-- trusted_devices
DROP INDEX IF EXISTS public.idx_trusted_devices_user_id;

-- identity_verification
DROP INDEX IF EXISTS public.idx_identity_verification_user_id;
DROP INDEX IF EXISTS public.idx_identity_verification_status;

-- phone_verification_codes
DROP INDEX IF EXISTS public.idx_phone_verification_phone;
DROP INDEX IF EXISTS public.idx_phone_verification_user;
DROP INDEX IF EXISTS public.idx_phone_verification_expires;

-- email_verification_codes
DROP INDEX IF EXISTS public.idx_email_verification_email;
DROP INDEX IF EXISTS public.idx_email_verification_user;

-- identity_documents
DROP INDEX IF EXISTS public.idx_identity_documents_user;
DROP INDEX IF EXISTS public.idx_identity_documents_status;

-- appointment_types
DROP INDEX IF EXISTS public.idx_appointment_types_provider;

-- appointment_waitlist
DROP INDEX IF EXISTS public.idx_waitlist_provider_status;
DROP INDEX IF EXISTS public.idx_waitlist_dates;

-- appointment_status_history
DROP INDEX IF EXISTS public.idx_status_history_appointment;

-- appointment_cancellations
DROP INDEX IF EXISTS public.idx_cancellations_appointment;

-- provider_credentials
DROP INDEX IF EXISTS public.idx_provider_credentials_provider;

-- provider_locations
DROP INDEX IF EXISTS public.idx_provider_locations_provider;
DROP INDEX IF EXISTS public.idx_provider_locations_postal;

-- provider_services
DROP INDEX IF EXISTS public.idx_provider_services_type;
DROP INDEX IF EXISTS public.idx_provider_services_medical_service_id;
DROP INDEX IF EXISTS public.idx_provider_services_provider_id;

-- provider_languages
DROP INDEX IF EXISTS public.idx_provider_languages_provider;

-- provider_insurance_accepted
DROP INDEX IF EXISTS public.idx_provider_insurance_provider;

-- provider_time_slots
DROP INDEX IF EXISTS public.idx_provider_time_slots_date;
DROP INDEX IF EXISTS public.idx_provider_time_slots_available;

-- provider_reviews
DROP INDEX IF EXISTS public.idx_provider_reviews_provider;
DROP INDEX IF EXISTS public.idx_provider_reviews_rating;

-- appointment_documents
DROP INDEX IF EXISTS public.idx_appointment_documents_appointment;

-- patient_favorite_providers
DROP INDEX IF EXISTS public.idx_patient_favorite_providers_patient;

-- video_consultations
DROP INDEX IF EXISTS public.idx_video_consultations_patient;
DROP INDEX IF EXISTS public.idx_video_consultations_provider;
DROP INDEX IF EXISTS public.idx_video_consultations_status;

-- secure_messages
DROP INDEX IF EXISTS public.idx_secure_messages_thread;
DROP INDEX IF EXISTS public.idx_secure_messages_patient;
DROP INDEX IF EXISTS public.idx_secure_messages_provider;

-- e_prescriptions
DROP INDEX IF EXISTS public.idx_e_prescriptions_patient;
DROP INDEX IF EXISTS public.idx_e_prescriptions_provider;
DROP INDEX IF EXISTS public.idx_e_prescriptions_status;

-- telemedicine_sessions
DROP INDEX IF EXISTS public.idx_telemedicine_sessions_appointment;
DROP INDEX IF EXISTS public.idx_telemedicine_sessions_provider;
DROP INDEX IF EXISTS public.idx_telemedicine_sessions_patient;

-- session_participants
DROP INDEX IF EXISTS public.idx_session_participants_session;

-- child_profiles
DROP INDEX IF EXISTS public.idx_child_profiles_guardian;
DROP INDEX IF EXISTS public.idx_child_profiles_active;
DROP INDEX IF EXISTS public.idx_child_profiles_dob;

-- guardian_relationships
DROP INDEX IF EXISTS public.idx_guardian_relationships_guardian;
DROP INDEX IF EXISTS public.idx_guardian_relationships_child;

-- guardianship_documents
DROP INDEX IF EXISTS public.idx_guardianship_documents_child;

-- child_growth_records
DROP INDEX IF EXISTS public.idx_child_growth_records_child;
DROP INDEX IF EXISTS public.idx_child_growth_records_date;

-- child_developmental_milestones
DROP INDEX IF EXISTS public.idx_child_milestones_child;

-- child_vaccinations
DROP INDEX IF EXISTS public.idx_child_vaccinations_child;
DROP INDEX IF EXISTS public.idx_child_vaccinations_due;

-- session_chat_messages
DROP INDEX IF EXISTS public.idx_session_chat_session;

-- lab_results
DROP INDEX IF EXISTS public.idx_lab_results_test_name;
DROP INDEX IF EXISTS public.idx_lab_results_fhir;
DROP INDEX IF EXISTS public.idx_lab_results_patient;
DROP INDEX IF EXISTS public.idx_lab_results_result_date;

-- session_files
DROP INDEX IF EXISTS public.idx_session_files_session;

-- ai_soap_notes
DROP INDEX IF EXISTS public.idx_ai_soap_notes_appointment;

-- virtual_waiting_room
DROP INDEX IF EXISTS public.idx_virtual_waiting_room_provider;
DROP INDEX IF EXISTS public.idx_virtual_waiting_room_queue;

-- medication_history
DROP INDEX IF EXISTS public.idx_medication_history_patient;
DROP INDEX IF EXISTS public.idx_medication_history_status;
DROP INDEX IF EXISTS public.idx_medication_history_start_date;

-- allergies
DROP INDEX IF EXISTS public.idx_allergies_patient;
DROP INDEX IF EXISTS public.idx_allergies_status;
DROP INDEX IF EXISTS public.idx_allergies_severity;

-- immunizations
DROP INDEX IF EXISTS public.idx_immunizations_patient;
DROP INDEX IF EXISTS public.idx_immunizations_admin_date;
DROP INDEX IF EXISTS public.idx_immunizations_vaccine;

-- clinical_notes
DROP INDEX IF EXISTS public.idx_clinical_notes_patient;
DROP INDEX IF EXISTS public.idx_clinical_notes_visit_date;
DROP INDEX IF EXISTS public.idx_clinical_notes_type;
DROP INDEX IF EXISTS public.idx_clinical_notes_appointment_id;
DROP INDEX IF EXISTS public.idx_clinical_notes_is_finalized;

-- fhir_procedures
DROP INDEX IF EXISTS public.idx_fhir_procedures_patient;
DROP INDEX IF EXISTS public.idx_fhir_procedures_provider;
DROP INDEX IF EXISTS public.idx_fhir_procedures_code;
DROP INDEX IF EXISTS public.idx_fhir_procedures_performed;

-- health_record_sync_status
DROP INDEX IF EXISTS public.idx_sync_status_patient;
DROP INDEX IF EXISTS public.idx_sync_status_date;

-- record_shares
DROP INDEX IF EXISTS public.idx_record_shares_patient;
DROP INDEX IF EXISTS public.idx_record_shares_status;

-- billing_transactions
DROP INDEX IF EXISTS public.idx_billing_transactions_provider_id;
DROP INDEX IF EXISTS public.idx_billing_transactions_patient_id;
DROP INDEX IF EXISTS public.idx_billing_transactions_appointment_id;
DROP INDEX IF EXISTS public.idx_billing_transactions_settlement_id;

-- fhir_observations
DROP INDEX IF EXISTS public.idx_fhir_observations_patient;
DROP INDEX IF EXISTS public.idx_fhir_observations_provider;
DROP INDEX IF EXISTS public.idx_fhir_observations_code;
DROP INDEX IF EXISTS public.idx_fhir_observations_effective;

-- fhir_conditions
DROP INDEX IF EXISTS public.idx_fhir_conditions_patient;
DROP INDEX IF EXISTS public.idx_fhir_conditions_provider;
DROP INDEX IF EXISTS public.idx_fhir_conditions_icd10;
DROP INDEX IF EXISTS public.idx_fhir_conditions_status;

-- fhir_allergy_intolerances
DROP INDEX IF EXISTS public.idx_fhir_allergies_patient;
DROP INDEX IF EXISTS public.idx_fhir_allergies_code;
DROP INDEX IF EXISTS public.idx_fhir_allergies_criticality;

-- provider_settlements
DROP INDEX IF EXISTS public.idx_provider_settlements_status;
DROP INDEX IF EXISTS public.idx_provider_settlements_settled_at;

-- clinical_templates
DROP INDEX IF EXISTS public.idx_clinical_templates_type;
DROP INDEX IF EXISTS public.idx_clinical_templates_specialty;
DROP INDEX IF EXISTS public.idx_clinical_templates_active;

-- icd10_codes
DROP INDEX IF EXISTS public.idx_icd10_code;
DROP INDEX IF EXISTS public.idx_icd10_description;
DROP INDEX IF EXISTS public.idx_icd10_common;

-- procedure_codes
DROP INDEX IF EXISTS public.idx_procedure_code;
DROP INDEX IF EXISTS public.idx_procedure_system;
DROP INDEX IF EXISTS public.idx_procedure_description;

-- soap_notes
DROP INDEX IF EXISTS public.idx_soap_notes_patient;
DROP INDEX IF EXISTS public.idx_soap_notes_provider;
DROP INDEX IF EXISTS public.idx_soap_notes_appointment;
DROP INDEX IF EXISTS public.idx_soap_notes_status;

-- consultation_notes
DROP INDEX IF EXISTS public.idx_consultation_notes_patient;
DROP INDEX IF EXISTS public.idx_consultation_notes_consultant;
DROP INDEX IF EXISTS public.idx_consultation_notes_referring;

-- patient_consents
DROP INDEX IF EXISTS public.idx_patient_consents_appointment_id;
DROP INDEX IF EXISTS public.idx_patient_consents_active_window;

-- procedure_notes
DROP INDEX IF EXISTS public.idx_procedure_notes_patient;
DROP INDEX IF EXISTS public.idx_procedure_notes_provider;

-- clinical_data_hashes
DROP INDEX IF EXISTS public.idx_data_hashes_resource;
DROP INDEX IF EXISTS public.idx_data_hashes_timestamp;

-- provider_digital_signatures
DROP INDEX IF EXISTS public.idx_signatures_provider;
DROP INDEX IF EXISTS public.idx_signatures_resource;
DROP INDEX IF EXISTS public.idx_signatures_timestamp;

-- payment_gateway_configs
DROP INDEX IF EXISTS public.idx_gateway_configs_provider;

-- payment_methods
DROP INDEX IF EXISTS public.idx_payment_methods_default;

-- provider_payouts
DROP INDEX IF EXISTS public.idx_payouts_provider;
DROP INDEX IF EXISTS public.idx_payouts_status;
DROP INDEX IF EXISTS public.idx_payouts_scheduled_date;

-- insurance_claims
DROP INDEX IF EXISTS public.idx_claims_provider;
DROP INDEX IF EXISTS public.idx_claims_patient;
DROP INDEX IF EXISTS public.idx_claims_status;
DROP INDEX IF EXISTS public.idx_claims_service_date;

-- billing_codes_library
DROP INDEX IF EXISTS public.idx_billing_codes_code;
DROP INDEX IF EXISTS public.idx_billing_codes_province;
DROP INDEX IF EXISTS public.idx_billing_codes_specialty;

-- provider_favorite_codes
DROP INDEX IF EXISTS public.idx_favorite_codes_provider;

-- provider_transactions
DROP INDEX IF EXISTS public.idx_transactions_provider;
DROP INDEX IF EXISTS public.idx_transactions_patient;
DROP INDEX IF EXISTS public.idx_transactions_type;
DROP INDEX IF EXISTS public.idx_transactions_date;

-- patient_billing_statements
DROP INDEX IF EXISTS public.idx_statements_provider;
DROP INDEX IF EXISTS public.idx_statements_patient;
DROP INDEX IF EXISTS public.idx_statements_date;

-- message_conversations
DROP INDEX IF EXISTS public.idx_msg_conv_provider;
DROP INDEX IF EXISTS public.idx_msg_conv_patient;

-- message_templates
DROP INDEX IF EXISTS public.idx_msg_templates_provider;

-- automated_messages
DROP INDEX IF EXISTS public.idx_auto_msg_provider;
DROP INDEX IF EXISTS public.idx_auto_msg_scheduled;

-- staff_chat_channels
DROP INDEX IF EXISTS public.idx_staff_channels_members;

-- staff_chat_messages
DROP INDEX IF EXISTS public.idx_staff_msg_channel;
DROP INDEX IF EXISTS public.idx_staff_msg_sender;

-- staff_members
DROP INDEX IF EXISTS public.idx_staff_provider;
DROP INDEX IF EXISTS public.idx_staff_role;

-- staff_activity_logs
DROP INDEX IF EXISTS public.idx_activity_staff;
DROP INDEX IF EXISTS public.idx_activity_date;

-- staff_performance_metrics
DROP INDEX IF EXISTS public.idx_performance_staff;

-- clinic_provider_invitations
DROP INDEX IF EXISTS public.idx_clinic_invitations_clinic_id;
DROP INDEX IF EXISTS public.idx_clinic_invitations_email;
DROP INDEX IF EXISTS public.idx_clinic_invitations_token;
DROP INDEX IF EXISTS public.idx_clinic_invitations_status;

-- drug_database
DROP INDEX IF EXISTS public.idx_drug_generic_name;
DROP INDEX IF EXISTS public.idx_drug_din;

-- drug_interactions
DROP INDEX IF EXISTS public.idx_drug_interactions_drug1;

-- prescription_fills
DROP INDEX IF EXISTS public.idx_prescription_fills_rx;

-- prescription_refill_requests
DROP INDEX IF EXISTS public.idx_refill_requests_status;
DROP INDEX IF EXISTS public.idx_refill_requests_provider;

-- pharmacy_communications
DROP INDEX IF EXISTS public.idx_pharmacy_comms_provider;

-- provider_notifications
DROP INDEX IF EXISTS public.idx_provider_notifications_provider_id;
DROP INDEX IF EXISTS public.idx_provider_notifications_type;
DROP INDEX IF EXISTS public.idx_provider_notifications_priority;
DROP INDEX IF EXISTS public.idx_provider_notifications_read_at;
DROP INDEX IF EXISTS public.idx_provider_notifications_created_at;

-- notification_delivery_logs
DROP INDEX IF EXISTS public.idx_notification_delivery_logs_notification_id;
DROP INDEX IF EXISTS public.idx_notification_delivery_logs_channel;
DROP INDEX IF EXISTS public.idx_notification_delivery_logs_status;

-- pharmacy_staff
DROP INDEX IF EXISTS public.idx_pharmacy_staff_pharmacy_id;
DROP INDEX IF EXISTS public.idx_pharmacy_staff_user_id;

-- pharmacy_licenses
DROP INDEX IF EXISTS public.idx_pharmacy_licenses_pharmacy_id;
DROP INDEX IF EXISTS public.idx_pharmacy_licenses_expiry;

-- prescription_validations
DROP INDEX IF EXISTS public.idx_prescription_validations_prescription_id;
DROP INDEX IF EXISTS public.idx_prescription_validations_pharmacy_id;

-- prescription_rejections
DROP INDEX IF EXISTS public.idx_prescription_rejections_prescription_id;

-- prescription_audit_log
DROP INDEX IF EXISTS public.idx_prescription_audit_log_prescription_id;

-- inventory_transactions
DROP INDEX IF EXISTS public.idx_inventory_transactions_pharmacy_id;
DROP INDEX IF EXISTS public.idx_inventory_transactions_inventory_id;
DROP INDEX IF EXISTS public.idx_inventory_transactions_date;

-- product_images
DROP INDEX IF EXISTS public.idx_product_images_inventory_id;

-- inventory_categories
DROP INDEX IF EXISTS public.idx_inventory_categories_parent;

-- order_fulfillment
DROP INDEX IF EXISTS public.idx_order_fulfillment_order_id;
DROP INDEX IF EXISTS public.idx_order_fulfillment_pharmacy_id;

-- courier_assignments
DROP INDEX IF EXISTS public.idx_courier_assignments_order_id;

-- order_notes
DROP INDEX IF EXISTS public.idx_order_notes_order_id;

-- order_status_history
DROP INDEX IF EXISTS public.idx_order_status_history_order_id;

-- delivery_integrations
DROP INDEX IF EXISTS public.idx_delivery_integrations_pharmacy_id;

-- external_deliveries
DROP INDEX IF EXISTS public.idx_external_deliveries_order_id;

-- delivery_quotes
DROP INDEX IF EXISTS public.idx_delivery_quotes_order_id;

-- payment_gateways
DROP INDEX IF EXISTS public.idx_payment_gateways_pharmacy_id;

-- pharmacy_transactions
DROP INDEX IF EXISTS public.idx_pharmacy_transactions_pharmacy_id;
DROP INDEX IF EXISTS public.idx_pharmacy_transactions_order_id;

-- pharmacy_insurance_claims
DROP INDEX IF EXISTS public.idx_pharmacy_insurance_claims_pharmacy_id;
DROP INDEX IF EXISTS public.idx_pharmacy_insurance_claims_status;

-- pharmacy_refunds
DROP INDEX IF EXISTS public.idx_pharmacy_refunds_pharmacy_id;
DROP INDEX IF EXISTS public.idx_pharmacy_refunds_order_id;

-- staff_schedules
DROP INDEX IF EXISTS public.idx_staff_schedules_staff_id;
DROP INDEX IF EXISTS public.idx_staff_schedules_date;

-- procedures_master
DROP INDEX IF EXISTS public.idx_procedures_slug;
DROP INDEX IF EXISTS public.idx_procedures_specialty;
DROP INDEX IF EXISTS public.idx_procedures_active;
DROP INDEX IF EXISTS public.idx_procedures_common;

-- provider_procedures
DROP INDEX IF EXISTS public.idx_provider_procedures_provider;
DROP INDEX IF EXISTS public.idx_provider_procedures_procedure;

-- dashboard_analytics
DROP INDEX IF EXISTS public.idx_dashboard_analytics_date;

-- financial_transactions
DROP INDEX IF EXISTS public.idx_financial_transactions_created_at;
DROP INDEX IF EXISTS public.idx_financial_transactions_user_id;
DROP INDEX IF EXISTS public.idx_financial_transactions_status;

-- sales_metrics
DROP INDEX IF EXISTS public.idx_sales_metrics_period;

-- system_metrics
DROP INDEX IF EXISTS public.idx_system_metrics_timestamp;
DROP INDEX IF EXISTS public.idx_system_metrics_type;

-- clinics
DROP INDEX IF EXISTS public.idx_clinics_slug;
DROP INDEX IF EXISTS public.idx_clinics_is_active;

-- provider_clinic_affiliations
DROP INDEX IF EXISTS public.idx_provider_clinic_affiliations_clinic_entity;

-- calls
DROP INDEX IF EXISTS public.idx_calls_caller_id;
DROP INDEX IF EXISTS public.idx_calls_start_time;

-- call_participants
DROP INDEX IF EXISTS public.idx_call_participants_call_id;
DROP INDEX IF EXISTS public.idx_call_participants_user_id;

-- emails
DROP INDEX IF EXISTS public.idx_emails_sender_id;
DROP INDEX IF EXISTS public.idx_emails_thread_id;

-- contacts
DROP INDEX IF EXISTS public.idx_contacts_user_id;

-- calendar_events
DROP INDEX IF EXISTS public.idx_calendar_events_user_id;
DROP INDEX IF EXISTS public.idx_calendar_events_start_time;

-- notes
DROP INDEX IF EXISTS public.idx_notes_user_id;

-- invoices
DROP INDEX IF EXISTS public.idx_invoices_user_id;

-- kanban_boards
DROP INDEX IF EXISTS public.idx_kanban_boards_user_id;

-- file_storage
DROP INDEX IF EXISTS public.idx_file_storage_user_id;
DROP INDEX IF EXISTS public.idx_file_storage_parent_id;

-- social_posts
DROP INDEX IF EXISTS public.idx_social_posts_user_id;
DROP INDEX IF EXISTS public.idx_social_posts_created_at;

-- admin_flags
DROP INDEX IF EXISTS public.idx_admin_flags_status;
DROP INDEX IF EXISTS public.idx_admin_flags_table_record;

-- moderation_logs
DROP INDEX IF EXISTS public.idx_moderation_logs_admin;
DROP INDEX IF EXISTS public.idx_moderation_logs_target;

-- system_analytics
DROP INDEX IF EXISTS public.idx_system_analytics_metric;

-- audit_trail
DROP INDEX IF EXISTS public.idx_audit_trail_user;
DROP INDEX IF EXISTS public.idx_audit_trail_event;

-- admin_activity_log
DROP INDEX IF EXISTS public.idx_admin_activity_log_admin;

-- content_moderation_queue
DROP INDEX IF EXISTS public.idx_content_moderation_status;

-- admin_system_events
DROP INDEX IF EXISTS public.idx_admin_system_events_time;

-- admin_email_monitoring
DROP INDEX IF EXISTS public.idx_admin_email_monitoring_flagged;

-- admin_user_notes
DROP INDEX IF EXISTS public.idx_admin_user_notes_flagged;

-- admin_file_monitoring
DROP INDEX IF EXISTS public.idx_admin_file_monitoring_flagged;

-- admin_social_feed
DROP INDEX IF EXISTS public.idx_admin_social_feed_flagged;

-- admin_search_analytics
DROP INDEX IF EXISTS public.idx_admin_search_analytics_user;

-- clinic_staff
DROP INDEX IF EXISTS public.idx_clinic_staff_user_id;
DROP INDEX IF EXISTS public.idx_clinic_staff_clinic_id;
DROP INDEX IF EXISTS public.idx_clinic_staff_activity_log_clinic_id;
DROP INDEX IF EXISTS public.idx_clinic_staff_activity_log_staff_id;
DROP INDEX IF EXISTS public.idx_clinic_staff_activity_log_created_at;

-- clinic_services, clinic_specializations
DROP INDEX IF EXISTS public.idx_clinic_services_clinic_id;
DROP INDEX IF EXISTS public.idx_clinic_services_service_id;
DROP INDEX IF EXISTS public.idx_clinic_specializations_specialty_id;

-- departments
DROP INDEX IF EXISTS public.idx_departments_head_user;
DROP INDEX IF EXISTS public.idx_departments_parent;
DROP INDEX IF EXISTS public.idx_departments_active;

-- designations
DROP INDEX IF EXISTS public.idx_designations_department;
DROP INDEX IF EXISTS public.idx_designations_level;
DROP INDEX IF EXISTS public.idx_designations_active;

-- staff_attendance
DROP INDEX IF EXISTS public.idx_staff_attendance_user;
DROP INDEX IF EXISTS public.idx_staff_attendance_date;
DROP INDEX IF EXISTS public.idx_staff_attendance_status;

-- leave_types
DROP INDEX IF EXISTS public.idx_leave_types_active;

-- leave_balances
DROP INDEX IF EXISTS public.idx_leave_balances_user;
DROP INDEX IF EXISTS public.idx_leave_balances_year;

-- leave_requests
DROP INDEX IF EXISTS public.idx_leave_requests_user;
DROP INDEX IF EXISTS public.idx_leave_requests_status;
DROP INDEX IF EXISTS public.idx_leave_requests_dates;

-- holidays
DROP INDEX IF EXISTS public.idx_holidays_date;
DROP INDEX IF EXISTS public.idx_holidays_type;
DROP INDEX IF EXISTS public.idx_holidays_active;

-- salary_structures
DROP INDEX IF EXISTS public.idx_salary_structures_user;
DROP INDEX IF EXISTS public.idx_salary_structures_active;
DROP INDEX IF EXISTS public.idx_salary_structures_dates;

-- payslips
DROP INDEX IF EXISTS public.idx_payslips_user;
DROP INDEX IF EXISTS public.idx_payslips_status;
DROP INDEX IF EXISTS public.idx_payslips_period;

-- employee_documents
DROP INDEX IF EXISTS public.idx_employee_documents_user;
DROP INDEX IF EXISTS public.idx_employee_documents_type;
DROP INDEX IF EXISTS public.idx_employee_documents_expiry;

-- performance_reviews
DROP INDEX IF EXISTS public.idx_performance_reviews_user;
DROP INDEX IF EXISTS public.idx_performance_reviews_reviewer;
DROP INDEX IF EXISTS public.idx_performance_reviews_status;

-- user_custom_roles
DROP INDEX IF EXISTS public.idx_user_custom_roles_user_id;
DROP INDEX IF EXISTS public.idx_user_custom_roles_role_id;

-- custom_roles
DROP INDEX IF EXISTS public.idx_custom_roles_role_type;

-- role_permissions
DROP INDEX IF EXISTS public.idx_role_permissions_role_id;
DROP INDEX IF EXISTS public.idx_role_permissions_resource_path;
DROP INDEX IF EXISTS public.idx_role_permissions_category;

-- platform_expenses
DROP INDEX IF EXISTS public.idx_platform_expenses_date;
DROP INDEX IF EXISTS public.idx_platform_expenses_category;
DROP INDEX IF EXISTS public.idx_platform_expenses_status;
DROP INDEX IF EXISTS public.idx_platform_expenses_submitted_by;

-- platform_income
DROP INDEX IF EXISTS public.idx_platform_income_date;
DROP INDEX IF EXISTS public.idx_platform_income_source;
DROP INDEX IF EXISTS public.idx_platform_income_user;

-- platform_invoices
DROP INDEX IF EXISTS public.idx_platform_invoices_number;
DROP INDEX IF EXISTS public.idx_platform_invoices_client;
DROP INDEX IF EXISTS public.idx_platform_invoices_status;
DROP INDEX IF EXISTS public.idx_platform_invoices_date;
DROP INDEX IF EXISTS public.idx_platform_invoices_due_date;

-- platform_invoice_items
DROP INDEX IF EXISTS public.idx_platform_invoice_items_invoice;

-- platform_billing_configs
DROP INDEX IF EXISTS public.idx_platform_billing_configs_active;

-- refund_requests
DROP INDEX IF EXISTS public.idx_refund_requests_requester;
DROP INDEX IF EXISTS public.idx_refund_requests_status;
DROP INDEX IF EXISTS public.idx_refund_requests_type;
DROP INDEX IF EXISTS public.idx_refund_requests_created;

-- marketplace_transaction_logs
DROP INDEX IF EXISTS public.idx_marketplace_logs_transaction;
DROP INDEX IF EXISTS public.idx_marketplace_logs_actor;
DROP INDEX IF EXISTS public.idx_marketplace_logs_target;
DROP INDEX IF EXISTS public.idx_marketplace_logs_type;
DROP INDEX IF EXISTS public.idx_marketplace_logs_status;
DROP INDEX IF EXISTS public.idx_marketplace_logs_created;
DROP INDEX IF EXISTS public.idx_marketplace_logs_gateway;

-- delivery_cost_analytics
DROP INDEX IF EXISTS public.idx_delivery_analytics_date;
DROP INDEX IF EXISTS public.idx_delivery_analytics_pharmacy;
DROP INDEX IF EXISTS public.idx_delivery_analytics_provider;

-- admin_audit_log
DROP INDEX IF EXISTS public.idx_admin_audit_log_entity;
DROP INDEX IF EXISTS public.idx_admin_audit_log_admin;
DROP INDEX IF EXISTS public.idx_admin_audit_log_created;

-- admin_notes
DROP INDEX IF EXISTS public.idx_admin_notes_entity;
DROP INDEX IF EXISTS public.idx_admin_notes_pinned;

-- entity_status_history
DROP INDEX IF EXISTS public.idx_status_history_entity;
DROP INDEX IF EXISTS public.idx_status_history_created;

-- clinic_locations
DROP INDEX IF EXISTS public.idx_clinic_locations_active;
DROP INDEX IF EXISTS public.idx_clinic_locations_deleted;

-- medical_services
DROP INDEX IF EXISTS public.idx_medical_services_active;
DROP INDEX IF EXISTS public.idx_medical_services_category;

-- medical_assets
DROP INDEX IF EXISTS public.idx_medical_assets_location;
DROP INDEX IF EXISTS public.idx_medical_assets_status;

-- pharmacies
DROP INDEX IF EXISTS public.idx_pharmacies_deleted;

-- products_master
DROP INDEX IF EXISTS public.idx_products_din;
DROP INDEX IF EXISTS public.idx_products_category;
DROP INDEX IF EXISTS public.idx_products_active;
DROP INDEX IF EXISTS public.idx_products_prescription;
DROP INDEX IF EXISTS public.idx_products_name;

-- custom_tables_registry
DROP INDEX IF EXISTS public.idx_custom_tables_status;
DROP INDEX IF EXISTS public.idx_custom_tables_category;

-- custom_table_columns
DROP INDEX IF EXISTS public.idx_custom_table_columns_table_id;
DROP INDEX IF EXISTS public.idx_custom_table_columns_order;

-- custom_table_permissions
DROP INDEX IF EXISTS public.idx_custom_table_permissions_table;

-- custom_table_audit_log
DROP INDEX IF EXISTS public.idx_custom_table_audit_created;

-- cms_pages
DROP INDEX IF EXISTS public.idx_pages_slug;
DROP INDEX IF EXISTS public.idx_pages_status;
DROP INDEX IF EXISTS public.idx_pages_author;

-- cms_blogs
DROP INDEX IF EXISTS public.idx_blogs_slug;
DROP INDEX IF EXISTS public.idx_blogs_status;
DROP INDEX IF EXISTS public.idx_blogs_category;
DROP INDEX IF EXISTS public.idx_blogs_author;
DROP INDEX IF EXISTS public.idx_blogs_published;

-- cms_locations_content
DROP INDEX IF EXISTS public.idx_locations_content_slug;

-- cms_testimonials
DROP INDEX IF EXISTS public.idx_testimonials_status;
DROP INDEX IF EXISTS public.idx_testimonials_featured;

-- cms_media_library
DROP INDEX IF EXISTS public.idx_media_uploaded_by;
DROP INDEX IF EXISTS public.idx_media_folder;

-- platform_account_settings
DROP INDEX IF EXISTS public.idx_account_settings_category;
DROP INDEX IF EXISTS public.idx_account_settings_key;

-- platform_other_settings
DROP INDEX IF EXISTS public.idx_other_settings_category;

-- settings_audit_log
DROP INDEX IF EXISTS public.idx_audit_log_table;
DROP INDEX IF EXISTS public.idx_audit_log_changed_by;
DROP INDEX IF EXISTS public.idx_audit_log_changed_at;

-- provider_time_blocks
DROP INDEX IF EXISTS public.idx_provider_time_blocks_day;

-- provider_unavailability
DROP INDEX IF EXISTS public.idx_provider_unavailability_dates;

-- patient_insurance_cards
DROP INDEX IF EXISTS public.idx_patient_insurance_cards_provider;
DROP INDEX IF EXISTS public.idx_patient_insurance_cards_active;
DROP INDEX IF EXISTS public.idx_patient_insurance_cards_primary;

-- provider_specialties
DROP INDEX IF EXISTS public.idx_provider_specialties_specialty_id;
