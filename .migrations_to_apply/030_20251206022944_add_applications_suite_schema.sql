/*
  # Applications Suite Schema

  This migration adds comprehensive tables for the Applications suite including:
  - Communication tools (Chat, Calls, Email)
  - Productivity tools (Calendar, Contacts, Notes, Invoices)
  - Collaboration tools (Kanban Board, File Manager, Social Feed)

  ## New Tables

  ### Communication
  1. `calls`
     - Call history and management
     - Tracks voice/video calls with duration, status, participants
  
  2. `call_participants`
     - Many-to-many relationship for call participants
  
  3. `emails`
     - Email messages with threading support
  
  4. `email_attachments`
     - File attachments for emails

  ### Productivity
  5. `contacts`
     - Contact management with organizations
  
  6. `contact_groups`
     - Contact organization groups
  
  7. `calendar_events`
     - Calendar events and appointments
  
  8. `event_attendees`
     - Event participants and RSVP status
  
  9. `notes`
     - Rich text notes with tagging
  
  10. `note_tags`
      - Tags for note organization
  
  11. `invoices`
      - Invoice management
  
  12. `invoice_items`
      - Line items for invoices

  ### Collaboration
  13. `kanban_boards`
      - Project boards
  
  14. `kanban_columns`
      - Board columns/swimlanes
  
  15. `kanban_cards`
      - Cards/tasks within columns
  
  16. `file_storage`
      - File and folder metadata
  
  17. `file_shares`
      - File sharing permissions
  
  18. `social_posts`
      - Social feed posts
  
  19. `post_reactions`
      - Likes/reactions to posts
  
  20. `post_comments`
      - Comments on posts

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users to manage their own data
  - Sharing policies for collaborative features
*/

-- =============================================
-- COMMUNICATION: CALLS
-- =============================================

CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid REFERENCES auth.users(id) NOT NULL,
  call_type varchar(20) NOT NULL CHECK (call_type IN ('voice', 'video')),
  call_direction varchar(10) NOT NULL CHECK (call_direction IN ('incoming', 'outgoing')),
  status varchar(20) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'active', 'completed', 'missed', 'declined', 'failed')),
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  duration_seconds integer DEFAULT 0,
  recording_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES calls(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  joined_at timestamptz,
  left_at timestamptz,
  status varchar(20) DEFAULT 'invited' CHECK (status IN ('invited', 'joined', 'left', 'declined')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calls"
  ON calls FOR SELECT
  TO authenticated
  USING (
    caller_id = auth.uid() OR
    id IN (SELECT call_id FROM call_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create calls"
  ON calls FOR INSERT
  TO authenticated
  WITH CHECK (caller_id = auth.uid());

CREATE POLICY "Users can update their own calls"
  ON calls FOR UPDATE
  TO authenticated
  USING (caller_id = auth.uid())
  WITH CHECK (caller_id = auth.uid());

CREATE POLICY "Users can view call participants"
  ON call_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    call_id IN (SELECT id FROM calls WHERE caller_id = auth.uid())
  );

CREATE POLICY "Call creators can add participants"
  ON call_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    call_id IN (SELECT id FROM calls WHERE caller_id = auth.uid())
  );

-- =============================================
-- COMMUNICATION: EMAIL
-- =============================================

CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) NOT NULL,
  recipient_ids uuid[] NOT NULL,
  cc_ids uuid[],
  bcc_ids uuid[],
  subject text NOT NULL,
  body text NOT NULL,
  thread_id uuid REFERENCES emails(id),
  folder varchar(20) DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent', 'drafts', 'trash', 'spam', 'archive')),
  is_read boolean DEFAULT false,
  is_starred boolean DEFAULT false,
  is_draft boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES emails(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their emails"
  ON emails FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR
    auth.uid() = ANY(recipient_ids) OR
    auth.uid() = ANY(cc_ids) OR
    auth.uid() = ANY(bcc_ids)
  );

CREATE POLICY "Users can create emails"
  ON emails FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own emails"
  ON emails FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can delete their own emails"
  ON emails FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Users can view attachments of their emails"
  ON email_attachments FOR SELECT
  TO authenticated
  USING (
    email_id IN (
      SELECT id FROM emails WHERE sender_id = auth.uid() OR
      auth.uid() = ANY(recipient_ids) OR
      auth.uid() = ANY(cc_ids) OR
      auth.uid() = ANY(bcc_ids)
    )
  );

-- =============================================
-- PRODUCTIVITY: CONTACTS
-- =============================================

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  organization text,
  job_title text,
  address text,
  notes text,
  avatar_url text,
  is_favorite boolean DEFAULT false,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  description text,
  contact_ids uuid[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their contact groups"
  ON contact_groups FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- PRODUCTIVITY: CALENDAR
-- =============================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  event_type varchar(50) DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'appointment', 'reminder', 'task', 'personal', 'work')),
  is_all_day boolean DEFAULT false,
  recurrence_rule text,
  color varchar(7) DEFAULT '#3B82F6',
  reminder_minutes integer,
  status varchar(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES calendar_events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  rsvp_status varchar(20) DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'accepted', 'declined', 'tentative')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their calendar events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    id IN (SELECT event_id FROM event_attendees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create calendar events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own events"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own events"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view event attendees"
  ON event_attendees FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    event_id IN (SELECT id FROM calendar_events WHERE user_id = auth.uid())
  );

CREATE POLICY "Event creators can manage attendees"
  ON event_attendees FOR ALL
  TO authenticated
  USING (
    event_id IN (SELECT id FROM calendar_events WHERE user_id = auth.uid())
  )
  WITH CHECK (
    event_id IN (SELECT id FROM calendar_events WHERE user_id = auth.uid())
  );

-- =============================================
-- PRODUCTIVITY: NOTES
-- =============================================

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  tags text[],
  is_pinned boolean DEFAULT false,
  color varchar(7) DEFAULT '#FFFFFF',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS note_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  color varchar(7) DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notes"
  ON notes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their note tags"
  ON note_tags FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- PRODUCTIVITY: INVOICES
-- =============================================

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  invoice_number text NOT NULL,
  client_name text NOT NULL,
  client_email text,
  client_address text,
  status varchar(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date date NOT NULL,
  due_date date NOT NULL,
  subtotal numeric(10, 2) DEFAULT 0,
  tax_rate numeric(5, 2) DEFAULT 0,
  tax_amount numeric(10, 2) DEFAULT 0,
  total_amount numeric(10, 2) DEFAULT 0,
  notes text,
  payment_terms text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  unit_price numeric(10, 2) NOT NULL,
  amount numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their invoice items"
  ON invoice_items FOR ALL
  TO authenticated
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
  )
  WITH CHECK (
    invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
  );

-- =============================================
-- COLLABORATION: KANBAN BOARDS
-- =============================================

CREATE TABLE IF NOT EXISTS kanban_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  description text,
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES kanban_boards(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  color varchar(7) DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kanban_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid REFERENCES kanban_columns(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES auth.users(id),
  priority varchar(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  position integer NOT NULL DEFAULT 0,
  tags text[],
  checklist jsonb DEFAULT '[]'::jsonb,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their kanban boards"
  ON kanban_boards FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage columns in their boards"
  ON kanban_columns FOR ALL
  TO authenticated
  USING (
    board_id IN (SELECT id FROM kanban_boards WHERE user_id = auth.uid())
  )
  WITH CHECK (
    board_id IN (SELECT id FROM kanban_boards WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage cards in their boards"
  ON kanban_cards FOR ALL
  TO authenticated
  USING (
    column_id IN (
      SELECT kc.id FROM kanban_columns kc
      JOIN kanban_boards kb ON kb.id = kc.board_id
      WHERE kb.user_id = auth.uid()
    )
  )
  WITH CHECK (
    column_id IN (
      SELECT kc.id FROM kanban_columns kc
      JOIN kanban_boards kb ON kb.id = kc.board_id
      WHERE kb.user_id = auth.uid()
    )
  );

-- =============================================
-- COLLABORATION: FILE MANAGER
-- =============================================

CREATE TABLE IF NOT EXISTS file_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  parent_id uuid REFERENCES file_storage(id) ON DELETE CASCADE,
  name text NOT NULL,
  type varchar(10) NOT NULL CHECK (type IN ('file', 'folder')),
  file_size bigint,
  mime_type text,
  storage_path text,
  is_starred boolean DEFAULT false,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS file_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES file_storage(id) ON DELETE CASCADE NOT NULL,
  shared_with_user_id uuid REFERENCES auth.users(id) NOT NULL,
  permission varchar(10) DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'admin')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(file_id, shared_with_user_id)
);

ALTER TABLE file_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own files and shared files"
  ON file_storage FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    id IN (SELECT file_id FROM file_shares WHERE shared_with_user_id = auth.uid())
  );

CREATE POLICY "Users can create files"
  ON file_storage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own files"
  ON file_storage FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    id IN (SELECT file_id FROM file_shares WHERE shared_with_user_id = auth.uid() AND permission IN ('edit', 'admin'))
  )
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own files"
  ON file_storage FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage file shares for their files"
  ON file_shares FOR ALL
  TO authenticated
  USING (
    file_id IN (SELECT id FROM file_storage WHERE user_id = auth.uid())
  )
  WITH CHECK (
    file_id IN (SELECT id FROM file_storage WHERE user_id = auth.uid())
  );

-- =============================================
-- COLLABORATION: SOCIAL FEED
-- =============================================

CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL,
  media_urls text[],
  visibility varchar(20) DEFAULT 'public' CHECK (visibility IN ('public', 'connections', 'private')),
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  reaction_type varchar(20) DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'celebrate', 'support', 'insightful')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public posts and their own posts"
  ON social_posts FOR SELECT
  TO authenticated
  USING (visibility = 'public' OR user_id = auth.uid());

CREATE POLICY "Users can create posts"
  ON social_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own posts"
  ON social_posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own posts"
  ON social_posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view reactions on visible posts"
  ON post_reactions FOR SELECT
  TO authenticated
  USING (
    post_id IN (SELECT id FROM social_posts WHERE visibility = 'public' OR user_id = auth.uid())
  );

CREATE POLICY "Users can manage their own reactions"
  ON post_reactions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view comments on visible posts"
  ON post_comments FOR SELECT
  TO authenticated
  USING (
    post_id IN (SELECT id FROM social_posts WHERE visibility = 'public' OR user_id = auth.uid())
  );

CREATE POLICY "Users can create comments on visible posts"
  ON post_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    post_id IN (SELECT id FROM social_posts WHERE visibility = 'public' OR user_id = auth.uid())
  );

CREATE POLICY "Users can update their own comments"
  ON post_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON post_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_start_time ON calls(start_time);
CREATE INDEX IF NOT EXISTS idx_call_participants_call_id ON call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_sender_id ON emails(sender_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_boards_user_id ON kanban_boards(user_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_user_id ON file_storage(user_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_parent_id ON file_storage(parent_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_posts(created_at DESC);
