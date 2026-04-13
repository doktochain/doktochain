/*
  # Doktochain Core Database Schema
  
  ## Overview
  This migration creates the foundational database schema for the Doktochain telemedicine platform,
  including support for patients, providers, pharmacies, appointments, prescriptions, insurance,
  payments, and FHIR interoperability.
  
  ## New Tables
  
  ### User Management
  - `user_profiles` - Extended user profile information for all user types
  - `user_roles` - Role assignments (patient, provider, pharmacy, admin)
  - `family_relationships` - Parent-child relationships for users under 18
  
  ### Patient Management
  - `patients` - Patient-specific information and medical history
  - `patient_insurance` - Insurance plans associated with patients
  - `patient_allergies` - Patient allergy records
  - `patient_medications` - Current medications list
  - `emergency_contacts` - Emergency contact information
  
  ### Provider Management
  - `providers` - Healthcare provider profiles (doctors, dentists, specialists)
  - `provider_credentials` - Licenses, certifications, and qualifications
  - `provider_specialties` - Specialties and areas of expertise
  - `provider_locations` - Clinic locations and addresses
  - `provider_schedules` - Availability schedules and time slots
  - `provider_reviews` - Patient reviews and ratings
  
  ### Pharmacy Management
  - `pharmacies` - Pharmacy profiles and information
  - `pharmacy_inventory` - Medication inventory and stock levels
  - `pharmacy_delivery_zones` - Service areas for delivery
  
  ### Appointment System
  - `appointments` - Appointment bookings (in-person and virtual)
  - `appointment_notes` - Clinical notes from appointments
  - `waitlist` - Waitlist for fully booked appointments
  
  ### Prescription System
  - `prescriptions` - Electronic prescriptions
  - `prescription_items` - Individual medications in prescriptions
  - `prescription_refills` - Refill requests and history
  
  ### Pharmacy Orders
  - `pharmacy_orders` - Medication orders from patients
  - `order_items` - Individual items in orders
  - `order_deliveries` - Delivery tracking information
  
  ### Medical Records (FHIR-compliant)
  - `medical_records` - Patient medical documents and records
  - `fhir_resources` - FHIR-formatted healthcare data
  
  ### Insurance and Billing
  - `insurance_plans` - Available insurance plans (public and private)
  - `insurance_claims` - Insurance claim submissions
  - `billing_transactions` - Payment and billing records
  
  ### Communication
  - `messages` - In-app messaging between users
  - `notifications` - System notifications
  
  ### Audit and Blockchain
  - `audit_logs` - Comprehensive audit trail
  - `blockchain_records` - Blockchain hash references for integrity
  
  ## Security
  - Enable Row Level Security (RLS) on all tables
  - Create policies for role-based access control
  - Implement secure defaults and constraints
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- USER MANAGEMENT
-- =============================================

-- User Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  profile_photo_url text,
  address_line1 text,
  address_line2 text,
  city text,
  province text,
  postal_code text,
  country text DEFAULT 'Canada',
  language_preference text DEFAULT 'en' CHECK (language_preference IN ('en', 'fr')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('patient', 'provider', 'pharmacy', 'admin')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Family Relationships (for parents managing children <18)
CREATE TABLE IF NOT EXISTS family_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  child_user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('parent', 'guardian', 'caregiver')),
  can_book_appointments boolean DEFAULT true,
  can_view_records boolean DEFAULT true,
  can_manage_prescriptions boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_user_id, child_user_id)
);

-- =============================================
-- PATIENT MANAGEMENT
-- =============================================

CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  health_card_number text, -- Encrypted
  health_card_province text,
  health_card_expiry date,
  blood_type text CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  height_cm numeric,
  weight_kg numeric,
  medical_history text,
  chronic_conditions text[],
  is_minor boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Patient Insurance
CREATE TABLE IF NOT EXISTS patient_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  insurance_plan_id uuid,
  policy_number text NOT NULL,
  group_number text,
  policy_holder_name text NOT NULL,
  relationship_to_holder text,
  is_primary boolean DEFAULT false,
  card_front_url text,
  card_back_url text,
  effective_date date,
  expiry_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Patient Allergies
CREATE TABLE IF NOT EXISTS patient_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  allergen text NOT NULL,
  reaction text,
  severity text CHECK (severity IN ('mild', 'moderate', 'severe', 'life-threatening')),
  diagnosed_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Patient Current Medications
CREATE TABLE IF NOT EXISTS patient_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  prescribing_provider text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Emergency Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text NOT NULL,
  phone text NOT NULL,
  email text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- PROVIDER MANAGEMENT
-- =============================================

CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider_type text NOT NULL CHECK (provider_type IN ('doctor', 'dentist', 'specialist', 'nurse', 'therapist')),
  license_number text UNIQUE NOT NULL,
  license_province text NOT NULL,
  license_expiry date,
  professional_title text,
  bio text,
  years_of_experience integer,
  languages_spoken text[] DEFAULT ARRAY['English'],
  accepts_new_patients boolean DEFAULT true,
  consultation_fee_cents integer,
  rating_average numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  verification_date timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Provider Credentials
CREATE TABLE IF NOT EXISTS provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  credential_type text NOT NULL CHECK (credential_type IN ('license', 'certification', 'degree', 'fellowship')),
  credential_name text NOT NULL,
  issuing_organization text NOT NULL,
  issue_date date,
  expiry_date date,
  credential_number text,
  document_url text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Provider Specialties
CREATE TABLE IF NOT EXISTS provider_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  specialty text NOT NULL,
  sub_specialty text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, specialty)
);

-- Provider Locations
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
  fax text,
  latitude numeric,
  longitude numeric,
  is_primary boolean DEFAULT false,
  accepts_in_person boolean DEFAULT true,
  accepts_virtual boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Provider Schedules
CREATE TABLE IF NOT EXISTS provider_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  location_id uuid REFERENCES provider_locations(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer DEFAULT 30,
  is_available boolean DEFAULT true,
  effective_from date,
  effective_until date,
  created_at timestamptz DEFAULT now()
);

-- Provider Reviews
CREATE TABLE IF NOT EXISTS provider_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  appointment_id uuid,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  is_anonymous boolean DEFAULT false,
  provider_response text,
  provider_response_date timestamptz,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- PHARMACY MANAGEMENT
-- =============================================

CREATE TABLE IF NOT EXISTS pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  pharmacy_name text NOT NULL,
  license_number text UNIQUE NOT NULL,
  phone text NOT NULL,
  fax text,
  email text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  province text NOT NULL,
  postal_code text NOT NULL,
  latitude numeric,
  longitude numeric,
  hours_of_operation jsonb,
  accepts_delivery boolean DEFAULT true,
  delivery_fee_cents integer,
  minimum_order_cents integer,
  rating_average numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Pharmacy Inventory
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  din_number text, -- Drug Identification Number (Canada)
  generic_name text,
  brand_name text,
  strength text,
  form text CHECK (form IN ('tablet', 'capsule', 'liquid', 'injection', 'cream', 'patch', 'inhaler')),
  manufacturer text,
  stock_quantity integer DEFAULT 0,
  reorder_level integer DEFAULT 10,
  unit_price_cents integer NOT NULL,
  requires_prescription boolean DEFAULT true,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pharmacy_id, din_number)
);

-- Pharmacy Delivery Zones
CREATE TABLE IF NOT EXISTS pharmacy_delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  postal_code_prefix text NOT NULL,
  delivery_time_hours integer DEFAULT 24,
  delivery_fee_cents integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- APPOINTMENT SYSTEM
-- =============================================

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  location_id uuid REFERENCES provider_locations(id),
  appointment_type text NOT NULL CHECK (appointment_type IN ('in-person', 'virtual')),
  visit_type text NOT NULL CHECK (visit_type IN ('initial', 'follow-up', 'urgent', 'routine')),
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show')),
  reason_for_visit text,
  chief_complaint text,
  insurance_id uuid REFERENCES patient_insurance(id),
  video_room_id text,
  video_started_at timestamptz,
  video_ended_at timestamptz,
  cancelled_by uuid REFERENCES user_profiles(id),
  cancellation_reason text,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Appointment Notes
CREATE TABLE IF NOT EXISTS appointment_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  subjective text,
  objective text,
  assessment text,
  plan text,
  vitals jsonb,
  diagnosis_codes text[],
  procedure_codes text[],
  is_signed boolean DEFAULT false,
  signed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Waitlist
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  preferred_date date,
  preferred_time_slot text CHECK (preferred_time_slot IN ('morning', 'afternoon', 'evening')),
  appointment_type text NOT NULL,
  reason text,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'offered', 'accepted', 'expired', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- PRESCRIPTION SYSTEM
-- =============================================

CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_number text UNIQUE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id),
  pharmacy_id uuid REFERENCES pharmacies(id),
  prescription_date date NOT NULL DEFAULT CURRENT_DATE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'filled', 'cancelled')),
  notes text,
  diagnosis text,
  is_controlled_substance boolean DEFAULT false,
  filled_date date,
  filled_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Prescription Items
CREATE TABLE IF NOT EXISTS prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid REFERENCES prescriptions(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  generic_name text,
  din_number text,
  strength text NOT NULL,
  dosage_form text NOT NULL,
  quantity integer NOT NULL,
  dosage_instructions text NOT NULL,
  frequency text NOT NULL,
  duration_days integer,
  refills_allowed integer DEFAULT 0,
  refills_remaining integer DEFAULT 0,
  substitution_allowed boolean DEFAULT true,
  special_instructions text,
  created_at timestamptz DEFAULT now()
);

-- Prescription Refills
CREATE TABLE IF NOT EXISTS prescription_refills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid REFERENCES prescriptions(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  request_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'filled')),
  approved_by uuid REFERENCES providers(id),
  approval_date timestamptz,
  denial_reason text,
  filled_date timestamptz,
  pharmacy_id uuid REFERENCES pharmacies(id),
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- PHARMACY ORDERS
-- =============================================

CREATE TABLE IF NOT EXISTS pharmacy_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES prescriptions(id),
  order_type text NOT NULL CHECK (order_type IN ('prescription', 'over-counter')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled')),
  subtotal_cents integer NOT NULL,
  delivery_fee_cents integer DEFAULT 0,
  tax_cents integer NOT NULL,
  total_cents integer NOT NULL,
  payment_method text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  delivery_address_line1 text,
  delivery_address_line2 text,
  delivery_city text,
  delivery_province text,
  delivery_postal_code text,
  delivery_instructions text,
  is_pickup boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
  inventory_id uuid REFERENCES pharmacy_inventory(id),
  medication_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price_cents integer NOT NULL,
  total_price_cents integer NOT NULL,
  prescription_item_id uuid REFERENCES prescription_items(id),
  created_at timestamptz DEFAULT now()
);

-- Order Deliveries
CREATE TABLE IF NOT EXISTS order_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid UNIQUE REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
  driver_name text,
  driver_phone text,
  tracking_number text,
  delivery_service text,
  estimated_delivery timestamptz,
  actual_delivery timestamptz,
  delivery_status text DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'assigned', 'picked-up', 'in-transit', 'delivered', 'failed')),
  delivery_notes text,
  signature_url text,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- MEDICAL RECORDS (FHIR-compliant)
-- =============================================

CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id),
  record_type text NOT NULL CHECK (record_type IN ('lab-result', 'imaging', 'document', 'report', 'note')),
  title text NOT NULL,
  description text,
  record_date date NOT NULL,
  file_url text,
  file_type text,
  file_size_bytes integer,
  category text,
  tags text[],
  is_shared boolean DEFAULT false,
  shared_with uuid[],
  created_at timestamptz DEFAULT now()
);

-- FHIR Resources
CREATE TABLE IF NOT EXISTS fhir_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id),
  resource_data jsonb NOT NULL,
  version integer DEFAULT 1,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(resource_type, resource_id)
);

-- =============================================
-- INSURANCE AND BILLING
-- =============================================

CREATE TABLE IF NOT EXISTS insurance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('public', 'private')),
  province text,
  carrier_name text,
  coverage_details jsonb,
  copay_amount_cents integer,
  deductible_cents integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text UNIQUE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id),
  insurance_id uuid REFERENCES patient_insurance(id) ON DELETE CASCADE,
  claim_date date DEFAULT CURRENT_DATE,
  service_date date NOT NULL,
  diagnosis_codes text[] NOT NULL,
  procedure_codes text[] NOT NULL,
  billed_amount_cents integer NOT NULL,
  approved_amount_cents integer,
  patient_responsibility_cents integer,
  status text DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'processing', 'approved', 'denied', 'paid')),
  submission_date timestamptz,
  response_date timestamptz,
  denial_reason text,
  remittance_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  related_type text NOT NULL CHECK (related_type IN ('appointment', 'pharmacy-order', 'subscription')),
  related_id uuid NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('charge', 'refund', 'payout')),
  amount_cents integer NOT NULL,
  currency text DEFAULT 'CAD',
  payment_method text CHECK (payment_method IN ('credit-card', 'debit-card', 'insurance', 'bank-transfer', 'cash')),
  payment_gateway text,
  gateway_transaction_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  failure_reason text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- COMMUNICATION
-- =============================================

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  related_type text CHECK (related_type IN ('appointment', 'prescription', 'order', 'general')),
  related_id uuid,
  subject text,
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  parent_message_id uuid REFERENCES messages(id),
  attachment_urls text[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('appointment', 'prescription', 'message', 'payment', 'reminder', 'system')),
  title text NOT NULL,
  message text NOT NULL,
  related_type text,
  related_id uuid,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  sent_via text[] DEFAULT ARRAY['in-app'],
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- AUDIT AND BLOCKCHAIN
-- =============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blockchain_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL CHECK (record_type IN ('prescription', 'medical-record', 'claim', 'transaction')),
  record_id uuid NOT NULL,
  data_hash text NOT NULL,
  blockchain_network text NOT NULL,
  transaction_hash text,
  block_number bigint,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'confirmed', 'failed')),
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON providers(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_license ON providers(license_number);
CREATE INDEX IF NOT EXISTS idx_pharmacies_user_id ON pharmacies(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_provider ON appointments(provider_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_provider ON prescriptions(provider_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_number ON prescriptions(prescription_number);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_patient ON pharmacy_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_pharmacy ON pharmacy_orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_status ON pharmacy_orders(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_refills ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_records ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User Roles Policies
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Patients Policies
CREATE POLICY "Patients can view own data"
  ON patients FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM family_relationships
      WHERE child_user_id = user_id
      AND parent_user_id = auth.uid()
      AND can_view_records = true
    )
  );

CREATE POLICY "Patients can update own data"
  ON patients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Providers can view their patients during appointments
CREATE POLICY "Providers can view patient data for appointments"
  ON patients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN providers p ON p.id = a.provider_id
      WHERE p.user_id = auth.uid()
      AND a.patient_id = patients.id
    )
  );

-- Appointments Policies
CREATE POLICY "Patients can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = appointments.provider_id
      AND providers.user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
      AND patients.user_id = auth.uid()
    )
  );

-- Prescriptions Policies
CREATE POLICY "Patients can view own prescriptions"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = prescriptions.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view their prescriptions"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = prescriptions.provider_id
      AND providers.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can create prescriptions"
  ON prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = prescriptions.provider_id
      AND providers.user_id = auth.uid()
    )
  );

-- Pharmacy Orders Policies
CREATE POLICY "Patients can view own orders"
  ON pharmacy_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = pharmacy_orders.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Pharmacies can view their orders"
  ON pharmacy_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pharmacies
      WHERE pharmacies.id = pharmacy_orders.pharmacy_id
      AND pharmacies.user_id = auth.uid()
    )
  );

-- Messages Policies
CREATE POLICY "Users can view sent messages"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can view received messages"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Notifications Policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read access for provider information
CREATE POLICY "Anyone can view active providers"
  ON providers FOR SELECT
  TO authenticated
  USING (is_active = true AND is_verified = true);

CREATE POLICY "Anyone can view provider locations"
  ON provider_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view provider schedules"
  ON provider_schedules FOR SELECT
  TO authenticated
  USING (is_available = true);

CREATE POLICY "Anyone can view provider reviews"
  ON provider_reviews FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Public read access for pharmacies
CREATE POLICY "Anyone can view active pharmacies"
  ON pharmacies FOR SELECT
  TO authenticated
  USING (is_active = true AND is_verified = true);

CREATE POLICY "Anyone can view pharmacy inventory"
  ON pharmacy_inventory FOR SELECT
  TO authenticated
  USING (is_available = true);

-- Admin policies (will be refined with specific admin role checks)
CREATE POLICY "Admins have full access to audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );