/*
  # Pharmacy Onboarding & Verification Tables

  ## New Tables
    - pharmacy_licenses - License documentation and verification
    - pharmacy_staff - Staff members and roles
    - pharmacy_business_hours - Operating hours
    - verification_documents - Document uploads
*/

CREATE TABLE IF NOT EXISTS pharmacy_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  license_type text NOT NULL CHECK (license_type IN ('pharmacy', 'business', 'controlled-substances', 'narcotics')),
  license_number text NOT NULL,
  issuing_authority text NOT NULL,
  issue_date date NOT NULL,
  expiry_date date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'revoked')),
  document_url text,
  verified_by uuid REFERENCES user_profiles(id),
  verified_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pharmacy_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id),
  staff_role text NOT NULL CHECK (staff_role IN ('pharmacist', 'pharmacy-manager', 'pharmacy-technician', 'cashier', 'delivery-personnel', 'admin')),
  license_number text,
  license_expiry date,
  certifications jsonb DEFAULT '[]'::jsonb,
  employment_status text DEFAULT 'active' CHECK (employment_status IN ('active', 'inactive', 'on-leave', 'terminated')),
  hire_date date,
  is_pharmacist_in_charge boolean DEFAULT false,
  can_approve_prescriptions boolean DEFAULT false,
  can_manage_inventory boolean DEFAULT false,
  can_process_payments boolean DEFAULT false,
  can_manage_staff boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pharmacy_business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open boolean DEFAULT true,
  opening_time time,
  closing_time time,
  break_start_time time,
  break_end_time time,
  is_24_hours boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pharmacy_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('license', 'insurance', 'tax-certificate', 'business-permit', 'id-verification', 'other')),
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_size_bytes integer,
  mime_type text,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verified_by uuid REFERENCES user_profiles(id),
  verified_at timestamptz,
  rejection_reason text,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_staff_pharmacy_id ON pharmacy_staff(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_staff_user_id ON pharmacy_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_licenses_pharmacy_id ON pharmacy_licenses(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_licenses_expiry ON pharmacy_licenses(expiry_date);
