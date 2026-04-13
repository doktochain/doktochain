/*
  # Add conversation_id to messages and fix RLS policies

  1. Modified Tables
    - `messages`
      - Added `conversation_id` (uuid) - links message to a conversation thread

  2. Security Changes
    - Added UPDATE policy on messages for recipients to mark as read
    - Added INSERT policy on message_conversations for patients
    - Added UPDATE policy on message_conversations for patients (unread count)

  3. Indexes
    - Index on messages(conversation_id, created_at) for efficient thread queries
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN conversation_id uuid REFERENCES message_conversations(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON messages(conversation_id, created_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Recipients can update messages'
  ) THEN
    CREATE POLICY "Recipients can update messages"
      ON messages FOR UPDATE
      TO authenticated
      USING (auth.uid() = recipient_id)
      WITH CHECK (auth.uid() = recipient_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'message_conversations' AND policyname = 'Patients can create conversations'
  ) THEN
    CREATE POLICY "Patients can create conversations"
      ON message_conversations FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = patient_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'message_conversations' AND policyname = 'Patients can update own conversations'
  ) THEN
    CREATE POLICY "Patients can update own conversations"
      ON message_conversations FOR UPDATE
      TO authenticated
      USING (auth.uid() = patient_id)
      WITH CHECK (auth.uid() = patient_id);
  END IF;
END $$;
