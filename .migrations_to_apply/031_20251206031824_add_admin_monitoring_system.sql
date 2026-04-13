/*
  # Admin Monitoring and Moderation System

  ## Overview
  This migration creates a comprehensive admin monitoring and moderation system for overseeing 
  all activities across patient, provider, and pharmacy portals.

  ## New Tables

  ### Core Admin Tables
  1. admin_flags - Flagged items requiring admin attention
  2. moderation_logs - Audit trail of admin actions  
  3. system_analytics - Aggregated metrics
  4. audit_trail - Comprehensive compliance logging
  5. admin_activity_log - Admin user activity tracking
  6. content_moderation_queue - Content review workflow

  ### Feature-Specific Monitoring Tables
  7. admin_chat_overview - Chat monitoring overview
  8. admin_call_monitoring - Call oversight
  9. admin_system_events - Calendar management
  10. admin_contacts_directory - Contact directory
  11. admin_email_monitoring - Email logs
  12. admin_user_notes - Notes oversight
  13. admin_kanban_overview - Project board monitoring
  14. admin_file_monitoring - File storage control
  15. admin_social_feed - Content moderation
  16. admin_search_analytics - Search analytics

  ## Security
  - All tables have RLS enabled
  - Only admin role can access these tables
*/

-- Core Admin Tables

CREATE TABLE IF NOT EXISTS admin_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flagged_table text NOT NULL,
  flagged_record_id uuid NOT NULL,
  flag_type text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  flagged_by uuid REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  reason text,
  notes text,
  metadata jsonb DEFAULT '{}',
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  action_type text NOT NULL,
  target_table text NOT NULL,
  target_record_id uuid NOT NULL,
  action_description text,
  before_state jsonb,
  after_state jsonb,
  reason text,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_category text NOT NULL,
  portal_type text,
  metric_value numeric NOT NULL DEFAULT 0,
  metric_unit text,
  time_period text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(metric_name, portal_type, time_period, start_date)
);

CREATE TABLE IF NOT EXISTS audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_role text,
  event_type text NOT NULL,
  event_category text NOT NULL,
  table_name text,
  record_id uuid,
  action text NOT NULL,
  description text,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  session_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  activity_type text NOT NULL,
  page_visited text,
  action_performed text,
  search_query text,
  filters_applied jsonb,
  items_viewed text[],
  duration_seconds integer,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  content_table text NOT NULL,
  content_preview text,
  author_id uuid REFERENCES auth.users(id),
  author_role text,
  portal_type text,
  flag_reason text,
  flag_count integer DEFAULT 1,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  moderation_action text,
  moderation_notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Feature-Specific Monitoring (using views from existing tables where possible)

CREATE TABLE IF NOT EXISTS admin_system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_title text NOT NULL,
  event_description text,
  organizer_id uuid REFERENCES auth.users(id),
  organizer_role text,
  participants uuid[],
  participant_roles text[],
  portal_type text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  location text,
  is_virtual boolean DEFAULT false,
  virtual_link text,
  is_flagged boolean DEFAULT false,
  flag_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_contacts_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  user_role text NOT NULL,
  contact_user_id uuid NOT NULL REFERENCES auth.users(id),
  contact_role text NOT NULL,
  relationship_type text,
  portal_type text,
  is_favorite boolean DEFAULT false,
  notes text,
  tags text[],
  is_flagged boolean DEFAULT false,
  flag_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, contact_user_id)
);

CREATE TABLE IF NOT EXISTS admin_email_monitoring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type text NOT NULL,
  sender_id uuid REFERENCES auth.users(id),
  sender_role text,
  recipient_id uuid REFERENCES auth.users(id),
  recipient_role text,
  portal_type text,
  subject text NOT NULL,
  content_preview text,
  status text NOT NULL DEFAULT 'sent',
  delivery_status text,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced boolean DEFAULT false,
  bounce_reason text,
  is_flagged boolean DEFAULT false,
  flag_reason text,
  contains_phi boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  user_role text NOT NULL,
  portal_type text,
  title text NOT NULL,
  content text NOT NULL,
  note_type text,
  tags text[],
  is_shared boolean DEFAULT false,
  shared_with uuid[],
  is_flagged boolean DEFAULT false,
  flag_reason text,
  contains_sensitive_info boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_kanban_overview (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_name text NOT NULL,
  board_description text,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  owner_role text NOT NULL,
  portal_type text,
  team_members uuid[],
  status text DEFAULT 'active',
  task_count integer DEFAULT 0,
  completed_task_count integer DEFAULT 0,
  is_flagged boolean DEFAULT false,
  flag_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_file_monitoring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  uploader_id uuid NOT NULL REFERENCES auth.users(id),
  uploader_role text NOT NULL,
  portal_type text,
  category text,
  is_public boolean DEFAULT false,
  shared_with uuid[],
  scan_status text DEFAULT 'pending',
  virus_scan_result text,
  contains_phi boolean DEFAULT false,
  is_flagged boolean DEFAULT false,
  flag_reason text,
  access_count integer DEFAULT 0,
  last_accessed_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_social_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id),
  author_role text NOT NULL,
  portal_type text,
  post_type text DEFAULT 'text',
  content text NOT NULL,
  media_urls text[],
  tags text[],
  mentions uuid[],
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  is_flagged boolean DEFAULT false,
  flag_count integer DEFAULT 0,
  flag_reasons text[],
  moderation_status text DEFAULT 'approved',
  visibility text DEFAULT 'public',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_role text,
  portal_type text,
  search_query text NOT NULL,
  search_category text,
  filters_applied jsonb,
  result_count integer DEFAULT 0,
  results_clicked integer DEFAULT 0,
  search_duration_ms integer,
  is_successful boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_flags_status ON admin_flags(status, priority);
CREATE INDEX IF NOT EXISTS idx_admin_flags_table_record ON admin_flags(flagged_table, flagged_record_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_admin ON moderation_logs(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_target ON moderation_logs(target_table, target_record_id);
CREATE INDEX IF NOT EXISTS idx_system_analytics_metric ON system_analytics(metric_name, portal_type, time_period);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_event ON audit_trail(event_type, event_category);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin ON admin_activity_log(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_moderation_status ON content_moderation_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_admin_system_events_time ON admin_system_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_admin_email_monitoring_flagged ON admin_email_monitoring(is_flagged, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_user_notes_flagged ON admin_user_notes(is_flagged, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_file_monitoring_flagged ON admin_file_monitoring(is_flagged, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_social_feed_flagged ON admin_social_feed(is_flagged, moderation_status);
CREATE INDEX IF NOT EXISTS idx_admin_search_analytics_user ON admin_search_analytics(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE admin_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_contacts_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_email_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_kanban_overview ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_file_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_social_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_search_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only access

CREATE POLICY "Admin full access to flags"
  ON admin_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin view moderation logs"
  ON moderation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin create moderation logs"
  ON moderation_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin view analytics"
  ON system_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin view audit trail"
  ON audit_trail FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to activity logs"
  ON admin_activity_log FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to moderation queue"
  ON content_moderation_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin view all system events"
  ON admin_system_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin view all contacts"
  ON admin_contacts_directory FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin view all emails"
  ON admin_email_monitoring FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin view all notes"
  ON admin_user_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin view kanban boards"
  ON admin_kanban_overview FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin view all files"
  ON admin_file_monitoring FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to social feed"
  ON admin_social_feed FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin view search analytics"
  ON admin_search_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );