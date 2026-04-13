import { vi } from 'vitest';
import { MockDatabase, createSupabaseMock } from './mockDb';

export const db = new MockDatabase();
export const mockSupabase = createSupabaseMock(db);

export function seedTestData() {
  db.seed('user_profiles', [
    {
      id: 'patient-user-1',
      email: 'patient@test.com',
      first_name: 'Jane',
      last_name: 'Doe',
      role: 'patient',
      phone: '555-0001',
      date_of_birth: '1990-01-15',
    },
    {
      id: 'provider-user-1',
      email: 'doctor@test.com',
      first_name: 'Dr. John',
      last_name: 'Smith',
      role: 'provider',
      phone: '555-0002',
    },
    {
      id: 'pharmacy-user-1',
      email: 'pharmacy@test.com',
      first_name: 'Pharmacy',
      last_name: 'Manager',
      role: 'pharmacy',
      phone: '555-0003',
    },
    {
      id: 'admin-user-1',
      email: 'admin@test.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
    },
  ]);

  db.seed('patients', [
    {
      id: 'patient-1',
      user_id: 'patient-user-1',
      date_of_birth: '1990-01-15',
      blood_type: 'O+',
      emergency_contact_name: 'John Doe',
      emergency_contact_phone: '555-9999',
    },
  ]);

  db.seed('providers', [
    {
      id: 'provider-1',
      user_id: 'provider-user-1',
      specialty: 'Family Medicine',
      license_number: 'LIC-12345',
      license_province: 'ON',
      provider_type: 'doctor',
      status: 'active',
      accepts_new_patients: true,
    },
  ]);

  db.seed('pharmacies', [
    {
      id: 'pharmacy-1',
      owner_id: 'pharmacy-user-1',
      pharmacy_name: 'Test Pharmacy',
      license_number: 'PHARM-001',
      status: 'active',
      city: 'Toronto',
      province: 'ON',
    },
    {
      id: 'pharmacy-2',
      owner_id: 'pharmacy-user-2',
      pharmacy_name: 'Alternate Pharmacy',
      license_number: 'PHARM-002',
      status: 'active',
      city: 'Ottawa',
      province: 'ON',
    },
  ]);

  db.seed('provider_time_slots', [
    {
      id: 'slot-1',
      provider_id: 'provider-1',
      date: '2026-04-15',
      start_time: '09:00',
      end_time: '09:30',
      is_available: true,
    },
    {
      id: 'slot-2',
      provider_id: 'provider-1',
      date: '2026-04-15',
      start_time: '10:00',
      end_time: '10:30',
      is_available: true,
    },
  ]);

  db.seed('medical_services', [
    {
      id: 'service-1',
      provider_id: 'provider-1',
      service_name: 'General Consultation',
      service_type: 'consultation',
      base_price: 150,
      duration_minutes: 30,
      is_active: true,
    },
  ]);
}

export function resetTestData() {
  db.clear();
}
