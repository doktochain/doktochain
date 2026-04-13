/*
  # Create Insurance Cards Storage Bucket
  
  1. Storage
    - Create bucket for insurance card images
    - Set up RLS policies for secure access
    - Patients can upload/view their own cards
    - Providers can view cards for their patients
    
  2. Security
    - Enable RLS on bucket
    - Restrict access to card owners and authorized providers
*/

-- Create storage bucket for insurance cards
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'insurance-cards',
  'insurance-cards',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies

-- Patients can upload their own insurance card images
CREATE POLICY "Patients can upload own insurance cards"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'insurance-cards' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Patients can view their own insurance card images
CREATE POLICY "Patients can view own insurance cards"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'insurance-cards' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Patients can update their own insurance card images
CREATE POLICY "Patients can update own insurance cards"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'insurance-cards' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Patients can delete their own insurance card images
CREATE POLICY "Patients can delete own insurance cards"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'insurance-cards' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Providers can view insurance cards for their patients
CREATE POLICY "Providers can view patient insurance cards"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'insurance-cards' AND
    EXISTS (
      SELECT 1 
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN providers pr ON pr.id = a.provider_id
      WHERE pr.user_id = auth.uid()
        AND p.user_id::text = (storage.foldername(name))[1]
    )
  );

-- Admins can manage all insurance card images
CREATE POLICY "Admins can manage all insurance cards"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'insurance-cards' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );
