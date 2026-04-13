/*
  # Comprehensive Help Center Schema

  ## Overview
  This migration creates a complete help center system with articles, categories, FAQs, 
  support tickets, and chat functionality for the patient portal.

  ## 1. New Tables

  ### Help Categories
  - `help_categories` - Organize help content by topics
    - `id` (uuid, primary key)
    - `name` (text)
    - `slug` (text, unique)
    - `description` (text)
    - `icon` (text) - icon identifier
    - `color` (text) - color theme
    - `order_index` (integer) - display order
    - `parent_category_id` (uuid, nullable) - for nested categories
    - `is_active` (boolean) - default true
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Help Articles
  - `help_articles` - Detailed help articles and guides
    - `id` (uuid, primary key)
    - `category_id` (uuid, foreign key)
    - `title` (text)
    - `slug` (text, unique)
    - `content` (text) - markdown content
    - `summary` (text)
    - `author_id` (uuid, nullable)
    - `tags` (text[])
    - `is_featured` (boolean) - default false
    - `is_published` (boolean) - default true
    - `view_count` (integer) - default 0
    - `helpful_count` (integer) - default 0
    - `not_helpful_count` (integer) - default 0
    - `order_index` (integer)
    - `video_url` (text, nullable)
    - `attachments` (jsonb, nullable)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### FAQs
  - `faqs` - Frequently asked questions
    - `id` (uuid, primary key)
    - `category_id` (uuid, foreign key)
    - `question` (text)
    - `answer` (text)
    - `order_index` (integer)
    - `is_featured` (boolean) - default false
    - `view_count` (integer) - default 0
    - `helpful_count` (integer) - default 0
    - `not_helpful_count` (integer) - default 0
    - `tags` (text[])
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Support Tickets
  - `support_tickets` - Patient support requests
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key)
    - `ticket_number` (text, unique)
    - `subject` (text)
    - `description` (text)
    - `category` (text)
    - `priority` (text) - low, medium, high, urgent
    - `status` (text) - open, in_progress, waiting_response, resolved, closed
    - `assigned_to` (uuid, nullable)
    - `resolution` (text, nullable)
    - `resolved_at` (timestamptz, nullable)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Ticket Messages
  - `ticket_messages` - Messages within support tickets
    - `id` (uuid, primary key)
    - `ticket_id` (uuid, foreign key)
    - `user_id` (uuid, foreign key)
    - `message` (text)
    - `attachments` (jsonb, nullable)
    - `is_internal` (boolean) - default false
    - `created_at` (timestamptz)

  ### Chat Sessions
  - `chat_sessions` - Live chat support sessions
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key)
    - `agent_id` (uuid, nullable)
    - `status` (text) - waiting, active, ended
    - `started_at` (timestamptz)
    - `ended_at` (timestamptz, nullable)
    - `rating` (integer, nullable)
    - `feedback` (text, nullable)

  ### Chat Messages
  - `chat_messages` - Messages in live chat
    - `id` (uuid, primary key)
    - `session_id` (uuid, foreign key)
    - `sender_id` (uuid, foreign key)
    - `message` (text)
    - `created_at` (timestamptz)

  ### Article Feedback
  - `article_feedback` - Track article helpfulness
    - `id` (uuid, primary key)
    - `article_id` (uuid, foreign key)
    - `user_id` (uuid, foreign key)
    - `is_helpful` (boolean)
    - `comment` (text, nullable)
    - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Public read access for help content
  - Authenticated users can create tickets and chat
  - Users can only view their own tickets and chats

  ## 3. Indexes
  - Full-text search indexes on articles and FAQs
  - Category indexes
  - Status indexes for tickets
  - User indexes for personalized content

  ## 4. Important Notes
  - Comprehensive help system
  - Support for multimedia content
  - Real-time chat capability
  - Feedback and analytics tracking
*/

-- Help Categories Table
CREATE TABLE IF NOT EXISTS help_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text DEFAULT 'HelpCircle',
  color text DEFAULT 'blue',
  order_index integer DEFAULT 0,
  parent_category_id uuid REFERENCES help_categories(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_categories_slug ON help_categories(slug);
CREATE INDEX IF NOT EXISTS idx_help_categories_parent ON help_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_help_categories_active ON help_categories(is_active);

-- Help Articles Table
CREATE TABLE IF NOT EXISTS help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES help_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  summary text,
  author_id uuid REFERENCES user_profiles(id),
  tags text[] DEFAULT '{}',
  is_featured boolean DEFAULT false,
  is_published boolean DEFAULT true,
  view_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  not_helpful_count integer DEFAULT 0,
  order_index integer DEFAULT 0,
  video_url text,
  attachments jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_published ON help_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_help_articles_featured ON help_articles(is_featured);
CREATE INDEX IF NOT EXISTS idx_help_articles_tags ON help_articles USING gin(tags);

-- FAQs Table
CREATE TABLE IF NOT EXISTS faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES help_categories(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  order_index integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  view_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  not_helpful_count integer DEFAULT 0,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category_id);
CREATE INDEX IF NOT EXISTS idx_faqs_featured ON faqs(is_featured);
CREATE INDEX IF NOT EXISTS idx_faqs_tags ON faqs USING gin(tags);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  ticket_number text UNIQUE NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_response', 'resolved', 'closed')),
  assigned_to uuid REFERENCES user_profiles(id),
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);

-- Ticket Messages Table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  attachments jsonb,
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON ticket_messages(created_at DESC);

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES user_profiles(id),
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback text
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started ON chat_sessions(started_at DESC);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at ASC);

-- Article Feedback Table
CREATE TABLE IF NOT EXISTS article_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES help_articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_helpful boolean NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_article_feedback_article ON article_feedback(article_id);
CREATE INDEX IF NOT EXISTS idx_article_feedback_user ON article_feedback(user_id);

-- Enable Row Level Security
ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Help Categories (Public Read)
CREATE POLICY "Help categories are viewable by everyone"
  ON help_categories FOR SELECT
  USING (is_active = true);

-- RLS Policies for Help Articles (Public Read)
CREATE POLICY "Published help articles are viewable by everyone"
  ON help_articles FOR SELECT
  USING (is_published = true);

-- RLS Policies for FAQs (Public Read)
CREATE POLICY "FAQs are viewable by everyone"
  ON faqs FOR SELECT
  USING (true);

-- RLS Policies for Support Tickets
CREATE POLICY "Users can view own support tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own support tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own support tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Ticket Messages
CREATE POLICY "Users can view messages in their tickets"
  ON ticket_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their tickets"
  ON ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

-- RLS Policies for Chat Sessions
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions"
  ON chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Chat Messages
CREATE POLICY "Users can view messages in their chat sessions"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their chat sessions"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for Article Feedback
CREATE POLICY "Users can view own article feedback"
  ON article_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own article feedback"
  ON article_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own article feedback"
  ON article_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text AS $$
DECLARE
  new_number text;
BEGIN
  SELECT 'TKT-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 5) AS INTEGER)), 0) + 1)::text, 6, '0')
  INTO new_number
  FROM support_tickets;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();
