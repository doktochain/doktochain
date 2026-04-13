/*
  # Create missing user settings tables

  1. New Tables
    - `user_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique)
      - `language` (text, default 'en')
      - `timezone` (text, default 'America/Toronto')
      - `date_format` (text, default 'YYYY-MM-DD')
      - `time_format` (text, default '12h')
      - `preferred_providers` (text array)
      - `preferred_pharmacies` (text array)
      - `calendar_sync_enabled` (boolean, default false)
      - `calendar_provider` (text)
      - `appointment_reminder_email` (boolean, default true)
      - `appointment_reminder_sms` (boolean, default true)
      - `appointment_reminder_push` (boolean, default true)
      - `reminder_advance_hours` (integer, default 24)
      - `session_timeout_minutes` (integer, default 30)

    - `user_privacy_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique)
      - `profile_visibility` (text, default 'private')
      - `share_health_records_with_providers` (boolean, default true)
      - `allow_research_participation` (boolean, default false)
      - `marketing_emails` (boolean, default false)
      - `marketing_sms` (boolean, default false)
      - `third_party_data_sharing` (boolean, default false)
      - `anonymous_usage_analytics` (boolean, default true)
      - `show_online_status` (boolean, default true)

    - `user_accessibility_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique)
      - `font_size` (text, default 'medium')
      - `high_contrast_mode` (boolean, default false)
      - `screen_reader_optimized` (boolean, default false)
      - `reduced_motion` (boolean, default false)
      - `simplified_interface` (boolean, default false)
      - `voice_commands_enabled` (boolean, default false)
      - `keyboard_shortcuts_enabled` (boolean, default true)

  2. Security
    - Enable RLS on all tables
    - Users can only read/write their own settings
*/

-- user_settings
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'en',
  timezone text NOT NULL DEFAULT 'America/Toronto',
  date_format text NOT NULL DEFAULT 'YYYY-MM-DD',
  time_format text NOT NULL DEFAULT '12h',
  preferred_providers text[] DEFAULT '{}',
  preferred_pharmacies text[] DEFAULT '{}',
  calendar_sync_enabled boolean NOT NULL DEFAULT false,
  calendar_provider text,
  appointment_reminder_email boolean NOT NULL DEFAULT true,
  appointment_reminder_sms boolean NOT NULL DEFAULT true,
  appointment_reminder_push boolean NOT NULL DEFAULT true,
  reminder_advance_hours integer NOT NULL DEFAULT 24,
  session_timeout_minutes integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_settings_user_id_key UNIQUE (user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_privacy_settings
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_visibility text NOT NULL DEFAULT 'private',
  share_health_records_with_providers boolean NOT NULL DEFAULT true,
  allow_research_participation boolean NOT NULL DEFAULT false,
  marketing_emails boolean NOT NULL DEFAULT false,
  marketing_sms boolean NOT NULL DEFAULT false,
  third_party_data_sharing boolean NOT NULL DEFAULT false,
  anonymous_usage_analytics boolean NOT NULL DEFAULT true,
  show_online_status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_privacy_settings_user_id_key UNIQUE (user_id)
);

ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own privacy settings"
  ON user_privacy_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings"
  ON user_privacy_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
  ON user_privacy_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_accessibility_settings
CREATE TABLE IF NOT EXISTS user_accessibility_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  font_size text NOT NULL DEFAULT 'medium',
  high_contrast_mode boolean NOT NULL DEFAULT false,
  screen_reader_optimized boolean NOT NULL DEFAULT false,
  reduced_motion boolean NOT NULL DEFAULT false,
  simplified_interface boolean NOT NULL DEFAULT false,
  voice_commands_enabled boolean NOT NULL DEFAULT false,
  keyboard_shortcuts_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_accessibility_settings_user_id_key UNIQUE (user_id)
);

ALTER TABLE user_accessibility_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accessibility settings"
  ON user_accessibility_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accessibility settings"
  ON user_accessibility_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accessibility settings"
  ON user_accessibility_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
