/*
  # Provider Notifications and Preferences System

  ## Overview
  Comprehensive notification management system for healthcare providers with granular
  preference controls, delivery channels, and notification history tracking.

  ## New Tables

  ### `provider_notification_preferences`
  Stores provider notification preferences across multiple categories and channels

  ### `provider_notifications`
  Stores all notifications sent to providers

  ### `notification_delivery_logs`
  Tracks notification delivery across channels

  ## Security
  - RLS enabled on all tables
  - Providers can only access their own notifications and preferences
  - Admin users can view all notifications for support purposes
*/

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS provider_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

  -- Master channel toggles
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  push_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,

  -- Appointment notifications
  appointment_new_booking_email boolean DEFAULT true,
  appointment_new_booking_sms boolean DEFAULT true,
  appointment_new_booking_push boolean DEFAULT true,
  appointment_cancellation_email boolean DEFAULT true,
  appointment_cancellation_sms boolean DEFAULT true,
  appointment_cancellation_push boolean DEFAULT true,
  appointment_reschedule_email boolean DEFAULT true,
  appointment_reschedule_sms boolean DEFAULT false,
  appointment_reschedule_push boolean DEFAULT true,
  appointment_reminder_email boolean DEFAULT true,
  appointment_reminder_sms boolean DEFAULT false,
  appointment_reminder_push boolean DEFAULT true,

  -- Patient communication
  patient_message_email boolean DEFAULT true,
  patient_message_sms boolean DEFAULT false,
  patient_message_push boolean DEFAULT true,
  patient_document_upload_email boolean DEFAULT true,
  patient_document_upload_sms boolean DEFAULT false,
  patient_document_upload_push boolean DEFAULT true,

  -- Clinical alerts
  critical_lab_result_email boolean DEFAULT true,
  critical_lab_result_sms boolean DEFAULT true,
  critical_lab_result_push boolean DEFAULT true,
  prescription_refill_request_email boolean DEFAULT true,
  prescription_refill_request_sms boolean DEFAULT false,
  prescription_refill_request_push boolean DEFAULT true,

  -- Administrative
  staff_schedule_change_email boolean DEFAULT true,
  staff_schedule_change_sms boolean DEFAULT false,
  staff_schedule_change_push boolean DEFAULT true,
  license_expiry_reminder_email boolean DEFAULT true,
  license_expiry_reminder_sms boolean DEFAULT false,
  license_expiry_reminder_push boolean DEFAULT true,

  -- Billing and payments
  payment_received_email boolean DEFAULT true,
  payment_received_sms boolean DEFAULT false,
  payment_received_push boolean DEFAULT false,
  insurance_claim_status_email boolean DEFAULT true,
  insurance_claim_status_sms boolean DEFAULT false,
  insurance_claim_status_push boolean DEFAULT false,

  -- Quiet hours
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time DEFAULT '22:00:00',
  quiet_hours_end time DEFAULT '08:00:00',

  -- Preferences
  timezone text DEFAULT 'America/Toronto',
  digest_frequency text DEFAULT 'daily' CHECK (digest_frequency IN ('realtime', 'hourly', 'daily', 'weekly')),
  digest_time time DEFAULT '09:00:00',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(provider_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS provider_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

  type text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),

  title text NOT NULL,
  message text NOT NULL,

  action_url text,
  action_label text DEFAULT 'View Details',

  metadata jsonb DEFAULT '{}'::jsonb,

  read_at timestamptz,
  archived_at timestamptz,
  expires_at timestamptz,

  created_at timestamptz DEFAULT now()
);

-- Create notification delivery logs table
CREATE TABLE IF NOT EXISTS notification_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES provider_notifications(id) ON DELETE CASCADE,

  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),

  recipient text NOT NULL,

  sent_at timestamptz,
  delivered_at timestamptz,

  error_message text,
  retry_count integer DEFAULT 0,

  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_provider_notifications_provider_id ON provider_notifications(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_type ON provider_notifications(type);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_priority ON provider_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_read_at ON provider_notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_provider_notifications_created_at ON provider_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_notification_id ON notification_delivery_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_channel ON notification_delivery_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_status ON notification_delivery_logs(status);

-- Enable Row Level Security
ALTER TABLE provider_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_notification_preferences

CREATE POLICY "Providers can view own notification preferences"
  ON provider_notification_preferences
  FOR SELECT
  TO authenticated
  USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can update own notification preferences"
  ON provider_notification_preferences
  FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can insert own notification preferences"
  ON provider_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

-- RLS Policies for provider_notifications

CREATE POLICY "Providers can view own notifications"
  ON provider_notifications
  FOR SELECT
  TO authenticated
  USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can update own notifications"
  ON provider_notifications
  FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert notifications"
  ON provider_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for notification_delivery_logs

CREATE POLICY "Providers can view own notification delivery logs"
  ON notification_delivery_logs
  FOR SELECT
  TO authenticated
  USING (
    notification_id IN (
      SELECT id FROM provider_notifications
      WHERE provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "System can insert delivery logs"
  ON notification_delivery_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_provider_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamp
DROP TRIGGER IF EXISTS trigger_update_provider_notification_preferences_updated_at ON provider_notification_preferences;
CREATE TRIGGER trigger_update_provider_notification_preferences_updated_at
  BEFORE UPDATE ON provider_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_notification_preferences_updated_at();

-- Create function to auto-create default preferences for new providers
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO provider_notification_preferences (provider_id)
  VALUES (NEW.id)
  ON CONFLICT (provider_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create preferences
DROP TRIGGER IF EXISTS trigger_create_default_notification_preferences ON providers;
CREATE TRIGGER trigger_create_default_notification_preferences
  AFTER INSERT ON providers
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();