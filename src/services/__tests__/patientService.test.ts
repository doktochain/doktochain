import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), or: vi.fn(), order: vi.fn(), limit: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

const { patientService } = await import('../patientService');

describe('patientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPatientByUserId', () => {
    it('returns patient for valid user_id', async () => {
      const patient = { id: 'pat-1', user_id: 'u1', health_card_number: 'HC123' };
      const chain = chainMock({ data: patient, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await patientService.getPatientByUserId('u1');
      expect(result).toEqual(patient);
      expect(supabase.from).toHaveBeenCalledWith('patients');
    });

    it('returns null when no patient found', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await patientService.getPatientByUserId('unknown');
      expect(result).toBeNull();
    });
  });

  describe('createPatient', () => {
    it('inserts a new patient record', async () => {
      const patient = { id: 'pat-1', user_id: 'u1' };
      const chain = chainMock({ data: patient, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await patientService.createPatient({ user_id: 'u1' });
      expect(result).toEqual(patient);
    });
  });

  describe('getAllergies', () => {
    it('queries patient_allergies table', async () => {
      const allergies = [{ id: 'a1', allergen: 'Penicillin', severity: 'severe' }];
      const chain = chainMock({ data: allergies, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await patientService.getAllergies('pat-1');
      expect(result).toEqual(allergies);
      expect(supabase.from).toHaveBeenCalledWith('patient_allergies');
    });
  });

  describe('addAllergy', () => {
    it('inserts allergy and returns data', async () => {
      const allergy = { id: 'a1', patient_id: 'pat-1', allergen: 'Shellfish', severity: 'moderate' };
      const chain = chainMock({ data: allergy, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await patientService.addAllergy('pat-1', {
        allergen: 'Shellfish',
        severity: 'moderate',
        reaction: 'Hives',
      });

      expect(result).toEqual(allergy);
    });
  });

  describe('getCurrentMedications', () => {
    it('filters for active medications', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await patientService.getCurrentMedications('pat-1');
      expect(supabase.from).toHaveBeenCalledWith('patient_medications');
      expect(chain.eq).toHaveBeenCalledWith('is_active', true);
    });
  });

  describe('getEmergencyContacts', () => {
    it('queries emergency_contacts table', async () => {
      const contacts = [{ id: 'ec-1', name: 'Jane Doe', relationship: 'Spouse' }];
      const chain = chainMock({ data: contacts, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await patientService.getEmergencyContacts('pat-1');
      expect(result).toEqual(contacts);
      expect(supabase.from).toHaveBeenCalledWith('emergency_contacts');
    });
  });

  describe('addEmergencyContact', () => {
    it('inserts contact with patient_id', async () => {
      const contact = { id: 'ec-1', patient_id: 'pat-1', name: 'John' };
      const chain = chainMock({ data: contact, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await patientService.addEmergencyContact('pat-1', {
        name: 'John',
        relationship: 'Brother',
        phone: '555-1234',
      });

      expect(result).toEqual(contact);
    });
  });

  describe('deleteEmergencyContact', () => {
    it('deletes contact by id', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await patientService.deleteEmergencyContact('ec-1');
      expect(supabase.from).toHaveBeenCalledWith('emergency_contacts');
    });
  });
});
