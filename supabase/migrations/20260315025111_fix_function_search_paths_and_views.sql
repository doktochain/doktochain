/*
  # Fix Function Search Paths and Security Definer Views

  ## Summary
  This migration addresses two categories of security issues:

  1. **Mutable Search Path**: All functions in the public schema are updated to
     include `SET search_path = public, pg_catalog` to prevent search_path injection
     attacks where a malicious schema could shadow built-in functions.

  2. **Security Definer Views**: The views `cms_blog_tags_with_counts` and
     `cms_blog_categories_with_counts` are recreated with `security_invoker = true`
     (or as regular views) so they run with the caller's permissions instead of the
     view creator's, preventing potential privilege escalation.

  ## Changes
  - All 33 public schema functions get `SET search_path = public, pg_catalog`
  - Views recreated without SECURITY DEFINER (PostgreSQL views are invoker security by default)
*/

-- Fix views: recreate as regular views (invoker security by default)
CREATE OR REPLACE VIEW public.cms_blog_categories_with_counts AS
 SELECT c.id,
    c.name,
    c.slug,
    c.description,
    c.parent_category_id,
    c.display_order,
    c.created_at,
    count(b.id) AS post_count
   FROM (cms_blog_categories c
     LEFT JOIN cms_blogs b ON (((b.category_id = c.id) AND (b.status = 'published'::text))))
  GROUP BY c.id;

CREATE OR REPLACE VIEW public.cms_blog_tags_with_counts AS
 SELECT t.id,
    t.name,
    t.slug,
    t.created_at,
    t.color,
    count(btj.blog_id) AS post_count
   FROM ((cms_blog_tags t
     LEFT JOIN cms_blog_tags_junction btj ON ((btj.tag_id = t.id)))
     LEFT JOIN cms_blogs b ON (((b.id = btj.blog_id) AND (b.status = 'published'::text))))
  GROUP BY t.id;

-- Fix function search paths
ALTER FUNCTION public.calculate_age_months(date) SET search_path = public, pg_catalog;

ALTER FUNCTION public.calculate_profile_completion(uuid) SET search_path = public, pg_catalog;

ALTER FUNCTION public.calculate_work_hours(timestamp with time zone, timestamp with time zone) SET search_path = public, pg_catalog;

ALTER FUNCTION public.check_user_permission(uuid, text, text) SET search_path = public, pg_catalog;

ALTER FUNCTION public.cleanup_expired_verification_codes() SET search_path = public, pg_catalog;

ALTER FUNCTION public.create_default_notification_preferences() SET search_path = public, pg_catalog;

ALTER FUNCTION public.current_user_role() SET search_path = public, pg_catalog;

ALTER FUNCTION public.ensure_single_primary_insurance_card() SET search_path = public, pg_catalog;

ALTER FUNCTION public.exec_sql(text) SET search_path = public, pg_catalog;

ALTER FUNCTION public.generate_prescription_number() SET search_path = public, pg_catalog;

ALTER FUNCTION public.generate_ticket_number() SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_user_accessible_paths(uuid) SET search_path = public, pg_catalog;

ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;

ALTER FUNCTION public.has_active_consent(uuid, uuid, text) SET search_path = public, pg_catalog;

ALTER FUNCTION public.is_eligible_for_independence(uuid) SET search_path = public, pg_catalog;

ALTER FUNCTION public.log_appointment_status_change() SET search_path = public, pg_catalog;

ALTER FUNCTION public.notify_appointment_created() SET search_path = public, pg_catalog;

ALTER FUNCTION public.notify_appointment_updated() SET search_path = public, pg_catalog;

ALTER FUNCTION public.populate_procedure_details() SET search_path = public, pg_catalog;

ALTER FUNCTION public.populate_specialty_name() SET search_path = public, pg_catalog;

ALTER FUNCTION public.prevent_audit_log_modification() SET search_path = public, pg_catalog;

ALTER FUNCTION public.reserve_leave_balance_on_request() SET search_path = public, pg_catalog;

ALTER FUNCTION public.schedule_appointment_reminder(uuid) SET search_path = public, pg_catalog;

ALTER FUNCTION public.set_prescription_defaults() SET search_path = public, pg_catalog;

ALTER FUNCTION public.set_ticket_number() SET search_path = public, pg_catalog;

ALTER FUNCTION public.sync_avatar_url() SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_custom_table_updated_at() SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_leave_balance_on_approval() SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_patient_insurance_cards_updated_at() SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_provider_notification_preferences_updated_at() SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_session_duration() SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_waiting_room_positions() SET search_path = public, pg_catalog;
