import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  patientService,
  Patient,
  PatientAllergy,
  PatientMedication,
  EmergencyContact,
} from '../services/patientService';
import { useSupabaseQuery } from './useSupabaseQuery';
import { useSupabaseMutation } from './useSupabaseMutation';

export function usePatientProfile() {
  const { user } = useAuth();

  const queryFn = useCallback(
    () => (user ? patientService.getPatientByUserId(user.id) : Promise.resolve(null)),
    [user?.id]
  );

  return useSupabaseQuery<Patient | null>(user ? queryFn : null, [user?.id]);
}

export function usePatientAllergies(patientId: string | null) {
  const queryFn = useCallback(
    () => (patientId ? patientService.getAllergies(patientId) : Promise.resolve([])),
    [patientId]
  );

  return useSupabaseQuery<PatientAllergy[]>(patientId ? queryFn : null, [patientId]);
}

export function usePatientMedications(patientId: string | null) {
  const queryFn = useCallback(
    () => (patientId ? patientService.getCurrentMedications(patientId) : Promise.resolve([])),
    [patientId]
  );

  return useSupabaseQuery<PatientMedication[]>(patientId ? queryFn : null, [patientId]);
}

export function useEmergencyContacts(patientId: string | null) {
  const queryFn = useCallback(
    () => (patientId ? patientService.getEmergencyContacts(patientId) : Promise.resolve([])),
    [patientId]
  );

  return useSupabaseQuery<EmergencyContact[]>(patientId ? queryFn : null, [patientId]);
}

export function useUpdatePatient() {
  return useSupabaseMutation<Patient, { id: string; updates: Partial<Patient> }>(
    ({ id, updates }) => patientService.updatePatient(id, updates)
  );
}

export function useAddAllergy() {
  return useSupabaseMutation<PatientAllergy, { patientId: string; data: Partial<PatientAllergy> }>(
    ({ patientId, data }) => patientService.addAllergy(patientId, data)
  );
}

export function useAddMedication() {
  return useSupabaseMutation<PatientMedication, { patientId: string; data: Partial<PatientMedication> }>(
    ({ patientId, data }) => patientService.addMedication(patientId, data)
  );
}

export function useAddEmergencyContact() {
  return useSupabaseMutation<EmergencyContact, { patientId: string; data: Partial<EmergencyContact> }>(
    ({ patientId, data }) => patientService.addEmergencyContact(patientId, data)
  );
}
