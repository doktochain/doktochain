/*
  # Provider Onboarding & Verification System

  ## Overview
  This migration creates the comprehensive provider onboarding and verification system
  including application tracking, document management, approval workflows, and credential monitoring.

  ## New Tables Created

  ### 1. Provider Onboarding Applications
    - `provider_onboarding_applications` - Track provider registration applications with status
    - Includes personal info, professional details, and application progress
    - Links to user_profiles and will create providers record upon approval

  ### 2. Verification Documents
    - `provider_verification_documents` - Store uploaded credentials and licenses securely
    - Supports multiple document types per provider
    - Tracks verification status for each document

  ### 3. Verification History
    - `provider_verification_history` - Audit trail of all verification steps and changes
    - Records who made changes and when
    - Immutable audit log for compliance

  ### 4. Admin Approvals
    - `provider_admin_approvals` - Approval workflow management with notes
    - Multi-step approval process
    - Rejection reasons and resubmission tracking

  ### 5. Credential Alerts
    - `provider_credential_alerts` - Automated alerts for expiring licenses and credentials
    - Email notification system for renewals
    - Configurable alert thresholds

  ## Enhanced Provider Table
  - Adds onboarding_status, verification_level, and admin notes to providers table

  ## Security
  - RLS enabled on all tables
  - Providers can only view their own applications
  - Admins can view and approve all applications
  - Audit logs are read-only
*/

-- Enhance providers table with onboarding fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers' AND column_name = 'onboarding_status'
  ) THEN
    ALTER TABLE providers ADD COLUMN onboarding_status text DEFAULT 'pending' 
      CHECK (onboarding_status IN ('pending', 'documents_submitted', 'under_review', 'approved', 'rejected', 'resubmission_required'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers' AND column_name = 'verification_level'
  ) THEN
    ALTER TABLE providers ADD COLUMN verification_level text DEFAULT 'basic' 
      CHECK (verification_level IN ('basic', 'standard', 'premium'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE providers ADD COLUMN rejection_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE providers ADD COLUMN admin_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE providers ADD COLUMN approved_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE providers ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- Provider Onboarding Applications
CREATE TABLE IF NOT EXISTS provider_onboarding_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  date_of_birth date NOT NULL,
  
  -- Provider Type
  provider_type text NOT NULL CHECK (provider_type IN ('doctor', 'dentist', 'specialist', 'nurse', 'therapist', 'pharmacist', 'other')),
  specialty text,
  sub_specialty text,
  
  -- Professional Information
  professional_title text,
  license_number text NOT NULL,
  license_province text NOT NULL CHECK (license_province IN ('AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
  license_expiry date NOT NULL,
  years_of_experience integer DEFAULT 0,
  
  -- Practice Information
  practice_name text,
  practice_address_line1 text,
  practice_address_line2 text,
  practice_city text,
  practice_province text,
  practice_postal_code text,
  practice_phone text,
  
  -- Additional Info
  languages_spoken text[] DEFAULT ARRAY['en'],
  accepts_new_patients boolean DEFAULT true,
  bio text,
  professional_website text,
  
  -- Application Status
  application_status text DEFAULT 'draft' CHECK (application_status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'resubmission_required')),
  submission_date timestamptz,
  review_started_at timestamptz,
  review_completed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  
  -- Rejection/Resubmission
  rejection_reason text,
  resubmission_notes text,
  resubmission_date timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Provider Verification Documents
CREATE TABLE IF NOT EXISTS provider_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  application_id uuid REFERENCES provider_onboarding_applications(id) ON DELETE CASCADE,
  
  -- Document Details
  document_type text NOT NULL CHECK (document_type IN (
    'government_id', 'medical_license', 'professional_liability_insurance', 
    'educational_certificate', 'board_certification', 'cv_resume', 
    'reference_letter', 'practice_permit', 'dea_certificate', 'other'
  )),
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  
  -- Verification
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  expiry_date date,
  rejection_reason text,
  
  -- Metadata
  uploaded_at timestamptz DEFAULT now(),
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Provider Verification History (Audit Trail)
CREATE TABLE IF NOT EXISTS provider_verification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  application_id uuid REFERENCES provider_onboarding_applications(id) ON DELETE CASCADE,
  
  -- Action Details
  action_type text NOT NULL CHECK (action_type IN (
    'application_submitted', 'application_reviewed', 'application_approved', 
    'application_rejected', 'document_uploaded', 'document_verified', 
    'document_rejected', 'license_renewed', 'status_changed', 'resubmission_requested'
  )),
  action_description text NOT NULL,
  
  -- Actor
  performed_by uuid REFERENCES auth.users(id),
  performed_by_role text,
  
  -- Previous and New Values (for audit)
  previous_value jsonb,
  new_value jsonb,
  
  -- Metadata
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Provider Admin Approvals
CREATE TABLE IF NOT EXISTS provider_admin_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES provider_onboarding_applications(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  
  -- Approval Details
  approval_step text NOT NULL CHECK (approval_step IN (
    'identity_verification', 'license_verification', 'credential_verification', 
    'practice_verification', 'final_approval'
  )),
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'on_hold')),
  
  -- Reviewer Info
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  
  -- Notes and Feedback
  admin_notes text,
  internal_notes text,
  rejection_reason text,
  required_actions text[],
  
  -- Follow-up
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Provider Credential Alerts
CREATE TABLE IF NOT EXISTS provider_credential_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  
  -- Alert Details
  alert_type text NOT NULL CHECK (alert_type IN (
    'license_expiring', 'insurance_expiring', 'certification_expiring', 
    'credential_expired', 'renewal_required', 'verification_needed'
  )),
  credential_type text NOT NULL,
  credential_name text NOT NULL,
  
  -- Timing
  expiry_date date NOT NULL,
  alert_date date NOT NULL,
  days_until_expiry integer,
  
  -- Status
  alert_status text DEFAULT 'pending' CHECK (alert_status IN ('pending', 'sent', 'acknowledged', 'resolved', 'expired')),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  
  -- Notification
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamptz,
  email_sent boolean DEFAULT false,
  sms_sent boolean DEFAULT false,
  
  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON provider_onboarding_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON provider_onboarding_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_onboarding_submission_date ON provider_onboarding_applications(submission_date);

CREATE INDEX IF NOT EXISTS idx_verification_docs_provider ON provider_verification_documents(provider_id);
CREATE INDEX IF NOT EXISTS idx_verification_docs_application ON provider_verification_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_verification_docs_status ON provider_verification_documents(verification_status);

CREATE INDEX IF NOT EXISTS idx_verification_history_provider ON provider_verification_history(provider_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_action ON provider_verification_history(action_type);
CREATE INDEX IF NOT EXISTS idx_verification_history_date ON provider_verification_history(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_approvals_application ON provider_admin_approvals(application_id);
CREATE INDEX IF NOT EXISTS idx_admin_approvals_status ON provider_admin_approvals(approval_status);

CREATE INDEX IF NOT EXISTS idx_credential_alerts_provider ON provider_credential_alerts(provider_id);
CREATE INDEX IF NOT EXISTS idx_credential_alerts_status ON provider_credential_alerts(alert_status);
CREATE INDEX IF NOT EXISTS idx_credential_alerts_expiry ON provider_credential_alerts(expiry_date);

-- Enable Row Level Security
ALTER TABLE provider_onboarding_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_admin_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_credential_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Provider Onboarding Applications
CREATE POLICY "Users can view own applications"
  ON provider_onboarding_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own applications"
  ON provider_onboarding_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own draft applications"
  ON provider_onboarding_applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND application_status IN ('draft', 'resubmission_required'))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
  ON provider_onboarding_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all applications"
  ON provider_onboarding_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for Verification Documents
CREATE POLICY "Providers can view own documents"
  ON provider_verification_documents FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR
    application_id IN (
      SELECT id FROM provider_onboarding_applications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can upload documents"
  ON provider_verification_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    application_id IN (
      SELECT id FROM provider_onboarding_applications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all documents"
  ON provider_verification_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update document verification"
  ON provider_verification_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for Verification History (Read-only for non-admins)
CREATE POLICY "Providers can view own history"
  ON provider_verification_history FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR
    application_id IN (
      SELECT id FROM provider_onboarding_applications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all history"
  ON provider_verification_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "System can create history records"
  ON provider_verification_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for Admin Approvals
CREATE POLICY "Providers can view own approvals"
  ON provider_admin_approvals FOR SELECT
  TO authenticated
  USING (
    application_id IN (
      SELECT id FROM provider_onboarding_applications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all approvals"
  ON provider_admin_approvals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for Credential Alerts
CREATE POLICY "Providers can view own alerts"
  ON provider_credential_alerts FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can acknowledge own alerts"
  ON provider_credential_alerts FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all alerts"
  ON provider_credential_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "System can create alerts"
  ON provider_credential_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);
