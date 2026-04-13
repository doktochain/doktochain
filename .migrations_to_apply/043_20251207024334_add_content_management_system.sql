/*
  # Content Management System

  1. New Tables
    - `cms_pages`
      - Website pages with SEO and content
    - `cms_blogs`
      - Blog posts with categories and tags
    - `cms_blog_categories`
      - Blog categories
    - `cms_blog_tags`
      - Blog tags
    - `cms_locations_content`
      - Location-specific content pages
    - `cms_testimonials`
      - Customer testimonials and reviews
    - `cms_faqs`
      - Frequently asked questions
    - `cms_faq_categories`
      - FAQ categories
    - `cms_content_blocks`
      - Reusable content blocks
    - `cms_media_library`
      - Media assets management

  2. Security
    - Enable RLS on all tables
    - Admins can manage all content
    - Public can view published content
*/

-- CMS Pages
CREATE TABLE IF NOT EXISTS cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text,
  excerpt text,
  featured_image_url text,
  template text DEFAULT 'default',
  meta_title text,
  meta_description text,
  meta_keywords text[],
  og_image text,
  custom_css text,
  custom_js text,
  status text DEFAULT 'draft',
  published_at timestamptz,
  parent_page_id uuid REFERENCES cms_pages(id),
  display_order int DEFAULT 0,
  is_homepage boolean DEFAULT false,
  show_in_nav boolean DEFAULT true,
  nav_label text,
  author_id uuid REFERENCES auth.users(id),
  views_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CMS Blog Categories
CREATE TABLE IF NOT EXISTS cms_blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  parent_category_id uuid REFERENCES cms_blog_categories(id),
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- CMS Blog Tags
CREATE TABLE IF NOT EXISTS cms_blog_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- CMS Blogs
CREATE TABLE IF NOT EXISTS cms_blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  excerpt text,
  featured_image_url text,
  category_id uuid REFERENCES cms_blog_categories(id),
  author_id uuid REFERENCES auth.users(id),
  meta_title text,
  meta_description text,
  meta_keywords text[],
  status text DEFAULT 'draft',
  published_at timestamptz,
  allow_comments boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  views_count int DEFAULT 0,
  reading_time_minutes int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CMS Blog Tags Junction
CREATE TABLE IF NOT EXISTS cms_blog_tags_junction (
  blog_id uuid REFERENCES cms_blogs(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES cms_blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_id, tag_id)
);

-- CMS Locations Content
CREATE TABLE IF NOT EXISTS cms_locations_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES clinic_locations(id),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  content text,
  featured_image_url text,
  gallery_images text[],
  services_offered text[],
  special_features text[],
  meta_title text,
  meta_description text,
  status text DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CMS Testimonials
CREATE TABLE IF NOT EXISTS cms_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  author_title text,
  author_location text,
  author_image_url text,
  content text NOT NULL,
  rating int DEFAULT 5,
  category text,
  is_featured boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  status text DEFAULT 'pending',
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  display_order int DEFAULT 0,
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CMS FAQ Categories
CREATE TABLE IF NOT EXISTS cms_faq_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- CMS FAQs
CREATE TABLE IF NOT EXISTS cms_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES cms_faq_categories(id),
  question text NOT NULL,
  answer text NOT NULL,
  display_order int DEFAULT 0,
  helpful_count int DEFAULT 0,
  not_helpful_count int DEFAULT 0,
  is_featured boolean DEFAULT false,
  status text DEFAULT 'published',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CMS Content Blocks
CREATE TABLE IF NOT EXISTS cms_content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  block_type text NOT NULL,
  content text,
  settings jsonb DEFAULT '{}',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CMS Media Library
CREATE TABLE IF NOT EXISTS cms_media_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  original_filename text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  mime_type text,
  file_size_bytes bigint,
  width int,
  height int,
  alt_text text,
  caption text,
  folder text DEFAULT 'general',
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Seed default blog categories
INSERT INTO cms_blog_categories (name, slug, description) VALUES
  ('Health Tips', 'health-tips', 'General health and wellness tips'),
  ('Medical News', 'medical-news', 'Latest medical news and updates'),
  ('Patient Stories', 'patient-stories', 'Real patient experiences'),
  ('Provider Insights', 'provider-insights', 'Insights from healthcare providers')
ON CONFLICT (name) DO NOTHING;

-- Seed default FAQ categories
INSERT INTO cms_faq_categories (name, slug, description, display_order) VALUES
  ('General', 'general', 'General questions about Doktochain', 1),
  ('Booking', 'booking', 'Questions about booking appointments', 2),
  ('Insurance', 'insurance', 'Insurance and billing questions', 3),
  ('Telemedicine', 'telemedicine', 'Video consultation questions', 4),
  ('Prescriptions', 'prescriptions', 'Prescription and pharmacy questions', 5),
  ('Account', 'account', 'Account management questions', 6)
ON CONFLICT (name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pages_slug ON cms_pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON cms_pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_author ON cms_pages(author_id);
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON cms_blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON cms_blogs(status);
CREATE INDEX IF NOT EXISTS idx_blogs_category ON cms_blogs(category_id);
CREATE INDEX IF NOT EXISTS idx_blogs_author ON cms_blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_blogs_published ON cms_blogs(published_at);
CREATE INDEX IF NOT EXISTS idx_locations_content_slug ON cms_locations_content(slug);
CREATE INDEX IF NOT EXISTS idx_testimonials_status ON cms_testimonials(status);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON cms_testimonials(is_featured);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON cms_faqs(category_id);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON cms_media_library(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_folder ON cms_media_library(folder);

-- Enable RLS
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_blog_tags_junction ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_locations_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_media_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Pages
CREATE POLICY "Anyone can view published pages"
  ON cms_pages FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage pages"
  ON cms_pages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for Blogs
CREATE POLICY "Anyone can view published blogs"
  ON cms_blogs FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage blogs"
  ON cms_blogs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for Blog Categories
CREATE POLICY "Anyone can view blog categories"
  ON cms_blog_categories FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage blog categories"
  ON cms_blog_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for Blog Tags
CREATE POLICY "Anyone can view blog tags"
  ON cms_blog_tags FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage blog tags"
  ON cms_blog_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for Location Content
CREATE POLICY "Anyone can view published location content"
  ON cms_locations_content FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage location content"
  ON cms_locations_content FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for Testimonials
CREATE POLICY "Anyone can view approved testimonials"
  ON cms_testimonials FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Admins can manage testimonials"
  ON cms_testimonials FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for FAQs
CREATE POLICY "Anyone can view published FAQs"
  ON cms_faqs FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage FAQs"
  ON cms_faqs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for FAQ Categories
CREATE POLICY "Anyone can view FAQ categories"
  ON cms_faq_categories FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage FAQ categories"
  ON cms_faq_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for Content Blocks
CREATE POLICY "Anyone can view active content blocks"
  ON cms_content_blocks FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage content blocks"
  ON cms_content_blocks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for Media Library
CREATE POLICY "Admins can manage media library"
  ON cms_media_library FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policy for Blog Tags Junction
CREATE POLICY "Admins can manage blog tag associations"
  ON cms_blog_tags_junction FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
