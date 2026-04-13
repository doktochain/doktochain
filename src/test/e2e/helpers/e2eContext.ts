import { MockDatabase, createSupabaseMock } from '../../integration/helpers/mockDb';

export const db = new MockDatabase();
export const mockSupabase = createSupabaseMock(db);

export function seedPlatformData() {
  db.seed('user_profiles', [
    {
      id: 'patient-user-1',
      email: 'jane.doe@test.com',
      first_name: 'Jane',
      last_name: 'Doe',
      full_name: 'Jane Doe',
      role: 'patient',
      phone: '+14165550001',
      date_of_birth: '1990-03-15',
    },
    {
      id: 'provider-user-1',
      email: 'dr.smith@test.com',
      first_name: 'John',
      last_name: 'Smith',
      full_name: 'Dr. John Smith',
      role: 'provider',
      phone: '+14165550002',
    },
    {
      id: 'pharmacy-user-1',
      email: 'medipharm@test.com',
      first_name: 'MediPharm',
      last_name: 'Owner',
      full_name: 'MediPharm Owner',
      role: 'pharmacy',
      phone: '+14165550003',
    },
    {
      id: 'admin-user-1',
      email: 'admin@doktochain.com',
      first_name: 'Platform',
      last_name: 'Admin',
      full_name: 'Platform Admin',
      role: 'admin',
    },
  ]);

  db.seed('patients', [
    {
      id: 'patient-1',
      user_id: 'patient-user-1',
      date_of_birth: '1990-03-15',
      blood_type: 'A+',
      gender: 'female',
      address: '123 Main St, Toronto, ON',
      emergency_contact_name: 'Bob Doe',
      emergency_contact_phone: '+14165559999',
      profile_completed: true,
    },
  ]);

  db.seed('providers', [
    {
      id: 'provider-1',
      user_id: 'provider-user-1',
      specialty: 'Dermatology',
      license_number: 'CPSO-12345',
      license_province: 'ON',
      provider_type: 'doctor',
      status: 'active',
      is_active: true,
      is_verified: true,
      accepts_new_patients: true,
      onboarding_status: 'completed',
      consultation_fee: 15000,
      years_of_experience: 15,
    },
  ]);

  db.seed('pharmacies', [
    {
      id: 'pharmacy-1',
      owner_id: 'pharmacy-user-1',
      user_id: 'pharmacy-user-1',
      pharmacy_name: 'MediPharm Toronto',
      license_number: 'PHARM-ON-001',
      status: 'active',
      city: 'Toronto',
      province: 'ON',
      address: '456 Health Ave, Toronto, ON',
      phone: '+14165550010',
      accepts_delivery: true,
      delivery_fee: 500,
    },
    {
      id: 'pharmacy-2',
      owner_id: 'pharmacy-user-2',
      pharmacy_name: 'CareRx Ottawa',
      license_number: 'PHARM-ON-002',
      status: 'active',
      city: 'Ottawa',
      province: 'ON',
      address: '789 Wellness Blvd, Ottawa, ON',
    },
  ]);

  db.seed('provider_time_slots', [
    {
      id: 'slot-1',
      provider_id: 'provider-1',
      slot_date: '2026-04-15',
      slot_time: '14:00',
      start_time: '14:00',
      end_time: '14:30',
      is_available: true,
      is_virtual: true,
    },
    {
      id: 'slot-2',
      provider_id: 'provider-1',
      slot_date: '2026-04-15',
      slot_time: '15:00',
      start_time: '15:00',
      end_time: '15:30',
      is_available: true,
      is_virtual: true,
    },
    {
      id: 'slot-3',
      provider_id: 'provider-1',
      slot_date: '2026-04-16',
      slot_time: '09:00',
      start_time: '09:00',
      end_time: '09:30',
      is_available: true,
      is_virtual: false,
    },
  ]);

  db.seed('medical_services', [
    {
      id: 'svc-derm-consult',
      provider_id: 'provider-1',
      service_name: 'Dermatology Consultation',
      service_type: 'consultation',
      base_price: 15000,
      duration_minutes: 30,
      is_active: true,
    },
  ]);

  db.seed('provider_specialties', [
    {
      id: 'ps-1',
      provider_id: 'provider-1',
      specialty_name: 'Dermatology',
    },
  ]);

  db.seed('pharmacy_inventory', [
    {
      id: 'inv-1',
      pharmacy_id: 'pharmacy-1',
      medication_name: 'Hydrocortisone Cream 1%',
      din_number: 'DIN-00012345',
      category: 'Topical',
      quantity_on_hand: 50,
      stock_quantity: 50,
      reorder_level: 10,
      unit_price: 1299,
      unit_price_cents: 1299,
      manufacturer: 'PharmaCo',
      form: 'cream',
      strength: '1%',
    },
    {
      id: 'inv-2',
      pharmacy_id: 'pharmacy-1',
      medication_name: 'Betamethasone Valerate 0.1%',
      din_number: 'DIN-00012346',
      category: 'Topical',
      quantity_on_hand: 30,
      stock_quantity: 30,
      reorder_level: 5,
      unit_price: 2499,
      unit_price_cents: 2499,
      manufacturer: 'DermLab',
      form: 'cream',
      strength: '0.1%',
    },
  ]);

  db.seed('patient_insurance_policies', [
    {
      id: 'ins-1',
      patient_id: 'patient-1',
      insurance_provider: 'OHIP',
      policy_number: 'ON-9876543210',
      group_number: 'GRP-001',
      is_active: true,
      coverage_percentage: 80,
    },
  ]);
}
