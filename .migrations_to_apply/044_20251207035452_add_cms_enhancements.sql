/*
  # CMS System Enhancements

  1. Updates
    - Add color field to cms_blog_tags for visual categorization
    - Add post_count computed column support

  2. Notes
    - These enhancements support the admin content management interface
*/

-- Add color field to blog tags
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cms_blog_tags' AND column_name = 'color'
  ) THEN
    ALTER TABLE cms_blog_tags ADD COLUMN color text DEFAULT '#3b82f6';
  END IF;
END $$;

-- Create view for category post counts
CREATE OR REPLACE VIEW cms_blog_categories_with_counts AS
SELECT
  c.*,
  COUNT(b.id) as post_count
FROM cms_blog_categories c
LEFT JOIN cms_blogs b ON b.category_id = c.id AND b.status = 'published'
GROUP BY c.id;

-- Create view for tag post counts
CREATE OR REPLACE VIEW cms_blog_tags_with_counts AS
SELECT
  t.*,
  COUNT(btj.blog_id) as post_count
FROM cms_blog_tags t
LEFT JOIN cms_blog_tags_junction btj ON btj.tag_id = t.id
LEFT JOIN cms_blogs b ON b.id = btj.blog_id AND b.status = 'published'
GROUP BY t.id;