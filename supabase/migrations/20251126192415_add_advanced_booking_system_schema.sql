/*
  # Advanced Appointment Booking System Schema

  ## Overview
  This migration creates all tables and relationships needed for the comprehensive
  appointment booking system with enhanced search, provider profiles, and booking workflow.

  ## New Tables Created

  ### 1. Provider Enhanced Profiles
    - `provider_credentials` - Medical degrees, certifications, licenses
    - `provider_locations` - Multiple clinic locations per provider
    - `provider_services` - Services offered with pricing
    - `provider_languages` - Languages spoken by providers
    - `provider_insurance_accepted` - Insurance plans accepted
    - `provider_availability_templates` - Weekly availability templates
    - `provider_time_slots` - Specific available time slots

  ### 2. Reviews & Ratings
    - `provider_reviews` - Patient reviews and ratings
    - `provider_review_responses` - Provider responses to reviews

  ### 3. Appointment Enhancements
    - `appointment_services` - Service types and procedures
    - `appointment_consent_forms` - Digital consent forms
    - `appointment_questionnaires` - Pre-visit questionnaires
    - `appointment_questionnaire_responses` - Patient responses
    - `appointment_documents` - Uploaded documents
    - `appointment_insurance_verification` - Insurance verification records
    - `appointment_reminders` - SMS/Email reminder preferences

  ### 4. User Preferences
    - `patient_insurance_policies` - Saved insurance information
    - `patient_favorite_providers` - Favorite providers list
    - `patient_search_history` - Recent searches

  ## Security
  - RLS enabled on all tables
  - Policies restrict access based on user roles
  - Patient can only see their own data
  - Providers can only see their own profile data and patient appointments
*/

-- Provider Enhanced Profile Tables
CREATE TABLE IF NOT EXISTS provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  credential_type text NOT NULL CHECK (credential_type IN ('degree', 'board_certification', 'license', 'fellowship', 'residency')),
  institution text NOT NULL,
  field_of_study text,
  year_obtained integer,
  license_number text,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'expired')),
  expiration_date date,
  issuing_organization text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  location_name text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  province text NOT NULL,
  postal_code text NOT NULL,
  phone text,
  is_primary boolean DEFAULT false,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  hours_monday text,
  hours_tuesday text,
  hours_wednesday text,
  hours_thursday text,
  hours_friday text,
  hours_saturday text,
  hours_sunday text,
  parking_available boolean DEFAULT false,
  wheelchair_accessible boolean DEFAULT false,
  public_transit_nearby boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('consultation', 'procedure', 'diagnostic', 'vaccination', 'therapy', 'screening')),
  description text,
  duration_minutes integer NOT NULL DEFAULT 30,
  base_price decimal(10, 2),
  virtual_available boolean DEFAULT false,
  in_person_available boolean DEFAULT true,
  requires_referral boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  language text NOT NULL,
  proficiency text DEFAULT 'fluent' CHECK (proficiency IN ('basic', 'intermediate', 'fluent', 'native')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_insurance_accepted (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  insurance_provider text NOT NULL,
  plan_types text[] DEFAULT ARRAY[]::text[],
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_availability_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  location_id uuid REFERENCES provider_locations(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer DEFAULT 30,
  is_virtual boolean DEFAULT false,
  effective_from date DEFAULT CURRENT_DATE,
  effective_until date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  location_id uuid REFERENCES provider_locations(id),
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  duration_minutes integer DEFAULT 30,
  is_available boolean DEFAULT true,
  is_virtual boolean DEFAULT false,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Reviews & Ratings Tables
CREATE TABLE IF NOT EXISTS provider_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_title text,
  review_text text,
  would_recommend boolean DEFAULT true,
  wait_time_rating integer CHECK (wait_time_rating BETWEEN 1 AND 5),
  bedside_manner_rating integer CHECK (bedside_manner_rating BETWEEN 1 AND 5),
  helpful_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES provider_reviews(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  response_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Appointment Enhancement Tables
CREATE TABLE IF NOT EXISTS appointment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('consultation', 'procedure', 'diagnostic', 'vaccination', 'therapy', 'screening', 'urgent_care')),
  description text,
  typical_duration integer DEFAULT 30,
  requires_questionnaire boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_consent_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  form_type text NOT NULL CHECK (form_type IN ('ehr_access', 'telemedicine', 'privacy_policy', 'treatment', 'photo_video')),
  form_title text NOT NULL,
  form_content text NOT NULL,
  patient_signature text,
  signed_at timestamptz,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES appointment_services(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('text', 'textarea', 'single_choice', 'multiple_choice', 'rating', 'date', 'boolean')),
  options jsonb,
  is_required boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  questionnaire_id uuid REFERENCES appointment_questionnaires(id) ON DELETE CASCADE,
  response_text text,
  response_data jsonb,
  is_draft boolean DEFAULT false,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('lab_result', 'imaging', 'referral', 'insurance_card', 'medical_history', 'other')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  shared_with_provider boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_insurance_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  insurance_policy_id uuid,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'requires_auth')),
  coverage_details jsonb,
  estimated_copay decimal(10, 2),
  deductible_remaining decimal(10, 2),
  requires_preauth boolean DEFAULT false,
  preauth_number text,
  verified_at timestamptz,
  verified_by text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('24_hour', '2_hour', '30_min')),
  send_via text[] DEFAULT ARRAY['email']::text[] CHECK (send_via <@ ARRAY['email', 'sms', 'push']::text[]),
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Patient Preference Tables
CREATE TABLE IF NOT EXISTS patient_insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  insurance_provider text NOT NULL,
  policy_number text NOT NULL,
  group_number text,
  policy_holder_name text,
  policy_holder_dob date,
  relationship_to_patient text DEFAULT 'self',
  effective_date date,
  expiration_date date,
  front_card_image_path text,
  back_card_image_path text,
  is_primary boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient_favorite_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(patient_id, provider_id)
);

CREATE TABLE IF NOT EXISTS patient_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  search_query text,
  search_filters jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_provider_credentials_provider ON provider_credentials(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_locations_provider ON provider_locations(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_locations_postal ON provider_locations(postal_code);
CREATE INDEX IF NOT EXISTS idx_provider_services_provider ON provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_type ON provider_services(service_type);
CREATE INDEX IF NOT EXISTS idx_provider_languages_provider ON provider_languages(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_insurance_provider ON provider_insurance_accepted(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_time_slots_date ON provider_time_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_provider_time_slots_available ON provider_time_slots(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_provider_reviews_provider ON provider_reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_reviews_rating ON provider_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_appointment_documents_appointment ON appointment_documents(appointment_id);
CREATE INDEX IF NOT EXISTS idx_patient_favorite_providers_patient ON patient_favorite_providers(patient_id);

-- Enable Row Level Security
ALTER TABLE provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_insurance_accepted ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_consent_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_insurance_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_favorite_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Provider Tables (Public Read, Provider Write)
CREATE POLICY "Provider credentials are viewable by everyone"
  ON provider_credentials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their own credentials"
  ON provider_credentials FOR ALL
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Provider locations are viewable by everyone"
  ON provider_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their own locations"
  ON provider_locations FOR ALL
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Provider services are viewable by everyone"
  ON provider_services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their own services"
  ON provider_services FOR ALL
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Provider languages are viewable by everyone"
  ON provider_languages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their own languages"
  ON provider_languages FOR ALL
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Provider insurance accepted is viewable by everyone"
  ON provider_insurance_accepted FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their own insurance acceptance"
  ON provider_insurance_accepted FOR ALL
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Provider availability templates are viewable by everyone"
  ON provider_availability_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their own availability"
  ON provider_availability_templates FOR ALL
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Provider time slots are viewable by everyone"
  ON provider_time_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their own time slots"
  ON provider_time_slots FOR ALL
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for Reviews
CREATE POLICY "Reviews are viewable by everyone"
  ON provider_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Patients can create reviews for their appointments"
  ON provider_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can update their own reviews"
  ON provider_reviews FOR UPDATE
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Review responses are viewable by everyone"
  ON provider_review_responses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can respond to their reviews"
  ON provider_review_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for Appointment Services (Public Read)
CREATE POLICY "Appointment services are viewable by everyone"
  ON appointment_services FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for Consent Forms
CREATE POLICY "Users can view consent forms for their appointments"
  ON appointment_consent_forms FOR SELECT
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can sign consent forms for their appointments"
  ON appointment_consent_forms FOR ALL
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for Questionnaires
CREATE POLICY "Questionnaires are viewable by everyone"
  ON appointment_questionnaires FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view questionnaire responses for their appointments"
  ON appointment_questionnaire_responses FOR SELECT
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage questionnaire responses for their appointments"
  ON appointment_questionnaire_responses FOR ALL
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for Documents
CREATE POLICY "Users can view documents for their appointments"
  ON appointment_documents FOR SELECT
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can upload documents for their appointments"
  ON appointment_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    appointment_id IN (
      SELECT id FROM appointments WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for Insurance Verification
CREATE POLICY "Users can view insurance verification for their appointments"
  ON appointment_insurance_verification FOR SELECT
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create insurance verification for their appointments"
  ON appointment_insurance_verification FOR INSERT
  TO authenticated
  WITH CHECK (
    appointment_id IN (
      SELECT id FROM appointments WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for Reminders
CREATE POLICY "Users can view reminders for their appointments"
  ON appointment_reminders FOR SELECT
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for Patient Insurance Policies
CREATE POLICY "Users can view their own insurance policies"
  ON patient_insurance_policies FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own insurance policies"
  ON patient_insurance_policies FOR ALL
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for Favorite Providers
CREATE POLICY "Users can view their own favorite providers"
  ON patient_favorite_providers FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own favorite providers"
  ON patient_favorite_providers FOR ALL
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for Search History
CREATE POLICY "Users can view their own search history"
  ON patient_search_history FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add to their search history"
  ON patient_search_history FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );
