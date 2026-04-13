/*
  # Provider Messaging System
  
  Adds conversation threading, templates, automation, and staff chat
  to the existing messages table structure.
*/

-- Message Conversations (threads on top of existing messages)
CREATE TABLE IF NOT EXISTS message_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) NOT NULL,
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  subject text NOT NULL,
  conversation_type text DEFAULT 'general',
  status text DEFAULT 'active',
  priority text DEFAULT 'normal',
  last_message_at timestamptz DEFAULT now(),
  unread_count_provider int DEFAULT 0,
  unread_count_patient int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_msg_conv_provider ON message_conversations(provider_id);
CREATE INDEX idx_msg_conv_patient ON message_conversations(patient_id);

ALTER TABLE message_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers manage conversations" ON message_conversations 
  FOR ALL TO authenticated 
  USING (auth.uid() = provider_id);

CREATE POLICY "Patients view conversations" ON message_conversations 
  FOR SELECT TO authenticated 
  USING (auth.uid() = patient_id);

-- Message Templates
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id),
  template_name text NOT NULL,
  template_category text NOT NULL,
  subject text,
  content text NOT NULL,
  is_system_template boolean DEFAULT false,
  usage_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_msg_templates_provider ON message_templates(provider_id);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage templates" ON message_templates 
  FOR ALL TO authenticated 
  USING (auth.uid() = provider_id OR is_system_template = true);

-- Automated Messages
CREATE TABLE IF NOT EXISTS automated_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) NOT NULL,
  message_type text NOT NULL,
  target_patient_id uuid REFERENCES auth.users(id),
  subject text,
  content text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'scheduled',
  delivery_channels text[] DEFAULT ARRAY['email'],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_auto_msg_provider ON automated_messages(provider_id);
CREATE INDEX idx_auto_msg_scheduled ON automated_messages(scheduled_for);

ALTER TABLE automated_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage automated messages" ON automated_messages 
  FOR ALL TO authenticated 
  USING (auth.uid() = provider_id);

-- Staff Chat Channels
CREATE TABLE IF NOT EXISTS staff_chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) NOT NULL,
  channel_name text NOT NULL,
  channel_type text NOT NULL,
  description text,
  member_ids uuid[] DEFAULT '{}',
  admin_ids uuid[] DEFAULT '{}',
  is_archived boolean DEFAULT false,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_staff_channels_members ON staff_chat_channels USING gin(member_ids);

ALTER TABLE staff_chat_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View channels" ON staff_chat_channels 
  FOR SELECT TO authenticated 
  USING (auth.uid() = ANY(member_ids));

CREATE POLICY "Manage channels" ON staff_chat_channels 
  FOR ALL TO authenticated 
  USING (auth.uid() = ANY(admin_ids));

-- Staff Chat Messages
CREATE TABLE IF NOT EXISTS staff_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES staff_chat_channels(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text',
  attachments jsonb DEFAULT '[]'::jsonb,
  read_by uuid[] DEFAULT '{}',
  patient_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_staff_msg_channel ON staff_chat_messages(channel_id);
CREATE INDEX idx_staff_msg_sender ON staff_chat_messages(sender_id);

ALTER TABLE staff_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View staff messages" ON staff_chat_messages 
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM staff_chat_channels 
      WHERE id = staff_chat_messages.channel_id 
      AND auth.uid() = ANY(member_ids)
    )
  );

CREATE POLICY "Send staff messages" ON staff_chat_messages 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = sender_id);
