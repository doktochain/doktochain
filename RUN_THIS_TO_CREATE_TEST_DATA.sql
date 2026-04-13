/*
  # DoktoChain Test Data - READY TO RUN

  This SQL file will create complete test data for your DoktoChain platform.

  INSTRUCTIONS:
  1. Copy this entire file
  2. Go to your Supabase Dashboard > SQL Editor
  3. Paste and click "Run"

  What this creates:
  - 3 Test Patients (John, Sarah, Michael)
  - 3 Test Providers (Dr. Chen, Dr. Martinez, Dr. Patel)
  - 2 Test Pharmacies (HealthPlus Toronto, CareFirst Vancouver)

  All test accounts use password: TestPass123!
*/

-- ============================================================================
-- SECTION 1: CREATE TEST PATIENTS
-- ============================================================================

DO $$
DECLARE
  v_user_id_1 uuid;
  v_user_id_2 uuid;
  v_user_id_3 uuid;
  v_patient_id_1 uuid;
  v_patient_id_2 uuid;
  v_patient_id_3 uuid;
BEGIN
  -- Use actual auth user IDs
  v_user_id_1 := '310809ff-eb79-4b5d-8f2f-06de23db5d6f';
  v_user_id_2 := 'ebbe52d3-5550-4bb4-b02a-96afca18bb78';
  v_user_id_3 := 'ac2ac0e8-5b3b-459c-8786-b9fbf9dce3b1';
  v_patient_id_1 := '310809ff-eb79-4b5d-8f2f-06de23db5d6f';
  v_patient_id_2 := 'ebbe52d3-5550-4bb4-b02a-96afca18bb78';
  v_patient_id_3 := 'ac2ac0e8-5b3b-459c-8786-b9fbf9dce3b1';

  -- Patient 1: John Doe
  INSERT INTO user_profiles (
    id, email, first_name, last_name, phone, date_of_birth, gender,
    address_line1, city, province, postal_code, country
  ) VALUES (
    v_user_id_1,
    'john.doe@test.com',
    'John',
    'Doe',
    '+1 (416) 555-0101',
    '1985-06-15',
    'male',
    '123 Main Street',
    'Toronto',
    'ON',
    'M5V 3A8',
    'Canada'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id_1, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO patients (
    id, user_id, health_card_number, health_card_province, blood_type,
    height_cm, weight_kg, medical_history
  ) VALUES (
    v_patient_id_1,
    v_user_id_1,
    '1234-567-890',
    'ON',
    'O+',
    175,
    75,
    'No significant medical history. Regular checkups.'
  ) ON CONFLICT (id) DO NOTHING;

  -- Patient 2: Sarah Smith
  INSERT INTO user_profiles (
    id, email, first_name, last_name, phone, date_of_birth, gender,
    address_line1, city, province, postal_code, country
  ) VALUES (
    v_user_id_2,
    'sarah.smith@test.com',
    'Sarah',
    'Smith',
    '+1 (604) 555-0102',
    '1990-03-22',
    'female',
    '456 Oak Avenue',
    'Vancouver',
    'BC',
    'V6B 1A1',
    'Canada'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id_2, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO patients (
    id, user_id, health_card_number, health_card_province, blood_type,
    height_cm, weight_kg, medical_history
  ) VALUES (
    v_patient_id_2,
    v_user_id_2,
    '2345-678-901',
    'BC',
    'A+',
    165,
    62,
    'Mild seasonal allergies. Otherwise healthy.'
  ) ON CONFLICT (id) DO NOTHING;

  -- Patient 3: Michael Johnson
  INSERT INTO user_profiles (
    id, email, first_name, last_name, phone, date_of_birth, gender,
    address_line1, city, province, postal_code, country
  ) VALUES (
    v_user_id_3,
    'michael.johnson@test.com',
    'Michael',
    'Johnson',
    '+1 (403) 555-0103',
    '1978-11-08',
    'male',
    '789 Pine Road',
    'Calgary',
    'AB',
    'T2P 1J9',
    'Canada'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id_3, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO patients (
    id, user_id, health_card_number, health_card_province, blood_type,
    height_cm, weight_kg, medical_history
  ) VALUES (
    v_patient_id_3,
    v_user_id_3,
    '3456-789-012',
    'AB',
    'B+',
    180,
    85,
    'Type 2 Diabetes (controlled), Hypertension.'
  ) ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✓ Test patients created successfully!';
END $$;


-- ============================================================================
-- SECTION 2: CREATE TEST PROVIDERS (DOCTORS)
-- ============================================================================

DO $$
DECLARE
  v_user_id_1 uuid;
  v_user_id_2 uuid;
  v_user_id_3 uuid;
  v_provider_id_1 uuid;
  v_provider_id_2 uuid;
  v_provider_id_3 uuid;
  v_location_id_1 uuid;
  v_location_id_2 uuid;
  v_location_id_3 uuid;
BEGIN
  -- Use actual auth user IDs
  v_user_id_1 := 'ca89352d-eb9c-4a22-b67d-4c203fefb420';
  v_user_id_2 := '18a6a856-26a4-4828-86f7-b123d9b75c2c';
  v_user_id_3 := 'abf1a68b-c08a-4359-9ce6-d0e33d513a34';
  v_provider_id_1 := 'ca89352d-eb9c-4a22-b67d-4c203fefb420';
  v_provider_id_2 := '18a6a856-26a4-4828-86f7-b123d9b75c2c';
  v_provider_id_3 := 'abf1a68b-c08a-4359-9ce6-d0e33d513a34';
  v_location_id_1 := gen_random_uuid();
  v_location_id_2 := gen_random_uuid();
  v_location_id_3 := gen_random_uuid();

  -- Provider 1: Dr. Emily Chen (Family Physician)
  INSERT INTO user_profiles (
    id, email, first_name, last_name, phone,
    address_line1, city, province, postal_code, country
  ) VALUES (
    v_user_id_1,
    'dr.emily.chen@test.com',
    'Emily',
    'Chen',
    '+1 (416) 555-0201',
    '100 Medical Plaza',
    'Toronto',
    'ON',
    'M5H 2N2',
    'Canada'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id_1, 'provider')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO providers (
    id, user_id, provider_type, license_number, license_province, years_of_experience,
    bio, consultation_fee_cents, virtual_consultation_fee_cents, accepts_new_patients,
    is_verified, rating_average, rating_count
  ) VALUES (
    v_provider_id_1,
    v_user_id_1,
    'doctor',
    'CPSO-12345',
    'ON',
    12,
    'Board-certified Family Physician with over 12 years of experience. Specializing in preventive care, chronic disease management, and family medicine.',
    15000,
    12000,
    true,
    true,
    4.8,
    156
  ) ON CONFLICT (id) DO NOTHING;

  -- Add specialty
  INSERT INTO provider_specialties (provider_id, specialty_id, is_primary)
  SELECT v_provider_id_1, id, true
  FROM specialties_master
  WHERE name = 'Family Medicine'
  LIMIT 1
  ON CONFLICT DO NOTHING;

  -- Add location
  INSERT INTO provider_locations (
    id, provider_id, location_name, address_line1, city, province, postal_code,
    phone, is_primary
  ) VALUES (
    v_location_id_1,
    v_provider_id_1,
    'Toronto Family Medical Clinic',
    '100 Medical Plaza, Suite 200',
    'Toronto',
    'ON',
    'M5H 2N2',
    '+1 (416) 555-0201',
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- Add schedule (Monday to Friday, 9 AM to 5 PM)
  INSERT INTO provider_schedules (provider_id, day_of_week, start_time, end_time, location_id)
  VALUES
    (v_provider_id_1, 1, '09:00', '17:00', v_location_id_1),
    (v_provider_id_1, 2, '09:00', '17:00', v_location_id_1),
    (v_provider_id_1, 3, '09:00', '17:00', v_location_id_1),
    (v_provider_id_1, 4, '09:00', '17:00', v_location_id_1),
    (v_provider_id_1, 5, '09:00', '17:00', v_location_id_1)
  ON CONFLICT DO NOTHING;

  -- Provider 2: Dr. Robert Martinez (Cardiologist)
  INSERT INTO user_profiles (
    id, email, first_name, last_name, phone,
    address_line1, city, province, postal_code, country
  ) VALUES (
    v_user_id_2,
    'dr.robert.martinez@test.com',
    'Robert',
    'Martinez',
    '+1 (604) 555-0202',
    '200 Heart Care Center',
    'Vancouver',
    'BC',
    'V6Z 1Y6',
    'Canada'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id_2, 'provider')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO providers (
    id, user_id, provider_type, license_number, license_province, years_of_experience,
    bio, consultation_fee_cents, accepts_new_patients,
    is_verified, rating_average, rating_count
  ) VALUES (
    v_provider_id_2,
    v_user_id_2,
    'specialist',
    'CPSBC-23456',
    'BC',
    18,
    'Experienced Cardiologist specializing in heart disease prevention, diagnosis, and treatment. Expert in echocardiography and cardiac catheterization.',
    25000,
    true,
    true,
    4.9,
    203
  ) ON CONFLICT (id) DO NOTHING;

  -- Add specialty
  INSERT INTO provider_specialties (provider_id, specialty_id, is_primary)
  SELECT v_provider_id_2, id, true
  FROM specialties_master
  WHERE name = 'Cardiology'
  LIMIT 1
  ON CONFLICT DO NOTHING;

  -- Add location
  INSERT INTO provider_locations (
    id, provider_id, location_name, address_line1, city, province, postal_code,
    phone, is_primary
  ) VALUES (
    v_location_id_2,
    v_provider_id_2,
    'Vancouver Heart Institute',
    '200 Heart Care Center, Floor 3',
    'Vancouver',
    'BC',
    'V6Z 1Y6',
    '+1 (604) 555-0202',
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- Add schedule (Monday to Thursday, 8 AM to 4 PM)
  INSERT INTO provider_schedules (provider_id, day_of_week, start_time, end_time, location_id)
  VALUES
    (v_provider_id_2, 1, '08:00', '16:00', v_location_id_2),
    (v_provider_id_2, 2, '08:00', '16:00', v_location_id_2),
    (v_provider_id_2, 3, '08:00', '16:00', v_location_id_2),
    (v_provider_id_2, 4, '08:00', '16:00', v_location_id_2)
  ON CONFLICT DO NOTHING;

  -- Provider 3: Dr. Aisha Patel (Pediatrician)
  INSERT INTO user_profiles (
    id, email, first_name, last_name, phone,
    address_line1, city, province, postal_code, country
  ) VALUES (
    v_user_id_3,
    'dr.aisha.patel@test.com',
    'Aisha',
    'Patel',
    '+1 (403) 555-0203',
    '300 Children''s Health Plaza',
    'Calgary',
    'AB',
    'T2G 0P6',
    'Canada'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id_3, 'provider')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO providers (
    id, user_id, provider_type, license_number, license_province, years_of_experience,
    bio, consultation_fee_cents, virtual_consultation_fee_cents, accepts_new_patients,
    is_verified, rating_average, rating_count
  ) VALUES (
    v_provider_id_3,
    v_user_id_3,
    'specialist',
    'CPSA-34567',
    'AB',
    8,
    'Compassionate Pediatrician dedicated to providing comprehensive care for children from infancy through adolescence. Special interest in developmental pediatrics.',
    12000,
    10000,
    true,
    true,
    4.9,
    178
  ) ON CONFLICT (id) DO NOTHING;

  -- Add specialty
  INSERT INTO provider_specialties (provider_id, specialty_id, is_primary)
  SELECT v_provider_id_3, id, true
  FROM specialties_master
  WHERE name = 'Pediatrics'
  LIMIT 1
  ON CONFLICT DO NOTHING;

  -- Add location
  INSERT INTO provider_locations (
    id, provider_id, location_name, address_line1, city, province, postal_code,
    phone, is_primary
  ) VALUES (
    v_location_id_3,
    v_provider_id_3,
    'Calgary Children''s Clinic',
    '300 Children''s Health Plaza, Suite 101',
    'Calgary',
    'AB',
    'T2G 0P6',
    '+1 (403) 555-0203',
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- Add schedule (Tuesday to Saturday, 10 AM to 6 PM)
  INSERT INTO provider_schedules (provider_id, day_of_week, start_time, end_time, location_id)
  VALUES
    (v_provider_id_3, 2, '10:00', '18:00', v_location_id_3),
    (v_provider_id_3, 3, '10:00', '18:00', v_location_id_3),
    (v_provider_id_3, 4, '10:00', '18:00', v_location_id_3),
    (v_provider_id_3, 5, '10:00', '18:00', v_location_id_3),
    (v_provider_id_3, 6, '10:00', '18:00', v_location_id_3)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✓ Test providers created successfully!';
END $$;


-- ============================================================================
-- SECTION 3: CREATE TEST PHARMACIES
-- ============================================================================

DO $$
DECLARE
  v_user_id_1 uuid;
  v_user_id_2 uuid;
  v_pharmacy_id_1 uuid;
  v_pharmacy_id_2 uuid;
BEGIN
  -- Use actual auth user IDs
  v_user_id_1 := '93169a09-2ae5-4394-bd9e-a385c46e4395';
  v_user_id_2 := 'e5012314-4c09-4511-b350-b8b9395be747';
  v_pharmacy_id_1 := '93169a09-2ae5-4394-bd9e-a385c46e4395';
  v_pharmacy_id_2 := 'e5012314-4c09-4511-b350-b8b9395be747';

  -- Pharmacy 1: HealthPlus Pharmacy Toronto
  INSERT INTO user_profiles (
    id, email, first_name, last_name, phone,
    address_line1, city, province, postal_code, country
  ) VALUES (
    v_user_id_1,
    'admin@healthplus-toronto.com',
    'HealthPlus',
    'Toronto',
    '+1 (416) 555-0301',
    '500 Pharmacy Street',
    'Toronto',
    'ON',
    'M4B 1B3',
    'Canada'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id_1, 'pharmacy')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO pharmacies (
    id, user_id, pharmacy_name, license_number, phone, email,
    address_line1, city, province, postal_code,
    accepts_delivery, is_verified
  ) VALUES (
    v_pharmacy_id_1,
    v_user_id_1,
    'HealthPlus Pharmacy Toronto',
    'OCP-56789',
    '+1 (416) 555-0301',
    'admin@healthplus-toronto.com',
    '500 Pharmacy Street',
    'Toronto',
    'ON',
    'M4B 1B3',
    true,
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- Pharmacy 2: CareFirst Pharmacy Vancouver
  INSERT INTO user_profiles (
    id, email, first_name, last_name, phone,
    address_line1, city, province, postal_code, country
  ) VALUES (
    v_user_id_2,
    'admin@carefirst-vancouver.com',
    'CareFirst',
    'Vancouver',
    '+1 (604) 555-0302',
    '600 Wellness Boulevard',
    'Vancouver',
    'BC',
    'V5K 0A1',
    'Canada'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id_2, 'pharmacy')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO pharmacies (
    id, user_id, pharmacy_name, license_number, phone, email,
    address_line1, city, province, postal_code,
    accepts_delivery, is_verified
  ) VALUES (
    v_pharmacy_id_2,
    v_user_id_2,
    'CareFirst Pharmacy Vancouver',
    'BCCP-67890',
    '+1 (604) 555-0302',
    'admin@carefirst-vancouver.com',
    '600 Wellness Boulevard',
    'Vancouver',
    'BC',
    'V5K 0A1',
    true,
    true
  ) ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✓ Test pharmacies created successfully!';
END $$;


-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE 'TEST DATA CREATION COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now log in with any of these accounts:';
  RAISE NOTICE '';
  RAISE NOTICE 'PATIENTS:';
  RAISE NOTICE '  • john.doe@test.com';
  RAISE NOTICE '  • sarah.smith@test.com';
  RAISE NOTICE '  • michael.johnson@test.com';
  RAISE NOTICE '';
  RAISE NOTICE 'PROVIDERS:';
  RAISE NOTICE '  • dr.emily.chen@test.com';
  RAISE NOTICE '  • dr.robert.martinez@test.com';
  RAISE NOTICE '  • dr.aisha.patel@test.com';
  RAISE NOTICE '';
  RAISE NOTICE 'PHARMACIES:';
  RAISE NOTICE '  • admin@healthplus-toronto.com';
  RAISE NOTICE '  • admin@carefirst-vancouver.com';
  RAISE NOTICE '';
  RAISE NOTICE 'Password for all: TestPass123!';
  RAISE NOTICE '';
END $$;

-- Show counts
SELECT
  'Patients' as type,
  COUNT(*) as count
FROM patients
UNION ALL
SELECT
  'Providers' as type,
  COUNT(*) as count
FROM providers
UNION ALL
SELECT
  'Pharmacies' as type,
  COUNT(*) as count
FROM pharmacies;
