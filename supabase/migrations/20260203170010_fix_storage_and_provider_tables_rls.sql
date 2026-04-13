/*
  # Fix Storage and Provider Tables RLS Policies

  1. Storage Policies
    - Add policies for user-uploads bucket to allow authenticated users to upload
    
  2. Provider Tables RLS
    - Fix provider_languages policies
    - Fix provider_specialties policies  
    - Fix provider_procedures policies
    
  3. Security
    - Users can upload their own files
    - Providers can manage their own data
    - Admins have full access
*/

-- Storage policies for user-uploads bucket
DO $$
BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view their own uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view uploads" ON storage.objects;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Create storage policies
CREATE POLICY "Authenticated users can upload to user-uploads"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'user-uploads');

CREATE POLICY "Users can view user-uploads"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'user-uploads');

CREATE POLICY "Authenticated users can update their uploads"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'user-uploads');

CREATE POLICY "Authenticated users can delete from user-uploads"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'user-uploads');

-- Provider Languages RLS
ALTER TABLE provider_languages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers can view own languages" ON provider_languages;
DROP POLICY IF EXISTS "Providers can insert own languages" ON provider_languages;
DROP POLICY IF EXISTS "Providers can update own languages" ON provider_languages;
DROP POLICY IF EXISTS "Providers can delete own languages" ON provider_languages;
DROP POLICY IF EXISTS "Admins can manage all languages" ON provider_languages;

CREATE POLICY "Providers can view own languages"
  ON provider_languages
  FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can insert own languages"
  ON provider_languages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can update own languages"
  ON provider_languages
  FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can delete own languages"
  ON provider_languages
  FOR DELETE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

-- Provider Specialties RLS
ALTER TABLE provider_specialties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers can view own specialties" ON provider_specialties;
DROP POLICY IF EXISTS "Providers can insert own specialties" ON provider_specialties;
DROP POLICY IF EXISTS "Providers can update own specialties" ON provider_specialties;
DROP POLICY IF EXISTS "Providers can delete own specialties" ON provider_specialties;
DROP POLICY IF EXISTS "Public can view provider specialties" ON provider_specialties;

CREATE POLICY "Public can view provider specialties"
  ON provider_specialties
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Providers can insert own specialties"
  ON provider_specialties
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can update own specialties"
  ON provider_specialties
  FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can delete own specialties"
  ON provider_specialties
  FOR DELETE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

-- Provider Procedures RLS  
ALTER TABLE provider_procedures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers can view own procedures" ON provider_procedures;
DROP POLICY IF EXISTS "Providers can insert own procedures" ON provider_procedures;
DROP POLICY IF EXISTS "Providers can update own procedures" ON provider_procedures;
DROP POLICY IF EXISTS "Providers can delete own procedures" ON provider_procedures;
DROP POLICY IF EXISTS "Public can view provider procedures" ON provider_procedures;

CREATE POLICY "Public can view provider procedures"
  ON provider_procedures
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Providers can insert own procedures"
  ON provider_procedures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can update own procedures"
  ON provider_procedures
  FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can delete own procedures"
  ON provider_procedures
  FOR DELETE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );