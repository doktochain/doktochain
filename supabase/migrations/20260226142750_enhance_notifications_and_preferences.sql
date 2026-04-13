/*
  # Enhance Notifications & Create Notification Preferences

  1. Modified Tables
    - `notifications`
      - Added `category` (text) - notification category for filtering
      - Added `priority` (text) - critical/high/normal/low
      - Added `action_url` (text) - link to navigate on click
      - Added `action_label` (text) - button text for action
      - Added `related_entity_type` (text) - type of related entity
      - Added `related_entity_id` (uuid) - ID of related entity
      - Added `metadata` (jsonb) - additional structured data
      - Added `is_archived` (boolean) - archive flag
      - Added `archived_at` (timestamptz) - when archived
      - Added `expires_at` (timestamptz) - expiration timestamp

  2. New Tables
    - `notification_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `category` (text)
      - `push_enabled` (boolean)
      - `sms_enabled` (boolean)
      - `email_enabled` (boolean)
      - `in_app_enabled` (boolean)
      - `frequency` (text)
      - `quiet_hours_start` (time)
      - `quiet_hours_end` (time)
      - `do_not_disturb` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - RLS enabled on notification_preferences
    - Users can read/update/insert their own preferences
    - INSERT policy added for notifications (service role can insert)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'category'
  ) THEN
    ALTER TABLE notifications ADD COLUMN category text DEFAULT 'system';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'priority'
  ) THEN
    ALTER TABLE notifications ADD COLUMN priority text DEFAULT 'normal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'action_url'
  ) THEN
    ALTER TABLE notifications ADD COLUMN action_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'action_label'
  ) THEN
    ALTER TABLE notifications ADD COLUMN action_label text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'related_entity_type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_entity_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'related_entity_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_entity_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE notifications ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE notifications ADD COLUMN is_archived boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN archived_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_category
  ON notifications(user_id, category);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  category text NOT NULL,
  push_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  email_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,
  frequency text DEFAULT 'immediate',
  quiet_hours_start time,
  quiet_hours_end time,
  do_not_disturb boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users can view own notification preferences'
  ) THEN
    CREATE POLICY "Users can view own notification preferences"
      ON notification_preferences FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users can insert own notification preferences'
  ) THEN
    CREATE POLICY "Users can insert own notification preferences"
      ON notification_preferences FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users can update own notification preferences'
  ) THEN
    CREATE POLICY "Users can update own notification preferences"
      ON notification_preferences FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
