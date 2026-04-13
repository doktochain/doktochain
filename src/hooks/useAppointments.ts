import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { appointmentService, Appointment } from '../services/appointmentService';
import { useSupabaseQuery } from './useSupabaseQuery';
import { useSupabaseMutation } from './useSupabaseMutation';

export function usePatientAppointments(status?: Appointment['status']) {
  const { userProfile } = useAuth();
  const patientId = userProfile?.id;

  const queryFn = useCallback(
    () => (patientId ? appointmentService.getPatientAppointments(patientId, status) : Promise.resolve([])),
    [patientId, status]
  );

  return useSupabaseQuery<Appointment[]>(patientId ? queryFn : null, [patientId, status]);
}

export function useProviderAppointments(date?: string, status?: Appointment['status']) {
  const { userProfile } = useAuth();
  const providerId = userProfile?.id;

  const queryFn = useCallback(
    () =>
      providerId
        ? appointmentService.getProviderAppointments(providerId, date, status)
        : Promise.resolve([]),
    [providerId, date, status]
  );

  return useSupabaseQuery<Appointment[]>(providerId ? queryFn : null, [providerId, date, status]);
}

export function useAppointment(appointmentId: string | null) {
  const queryFn = useCallback(
    () => (appointmentId ? appointmentService.getAppointment(appointmentId) : Promise.resolve(null)),
    [appointmentId]
  );

  return useSupabaseQuery<Appointment | null>(appointmentId ? queryFn : null, [appointmentId]);
}

export function useCancelAppointment() {
  const { user } = useAuth();
  return useSupabaseMutation<Appointment, { id: string; reason?: string }>(
    ({ id, reason }) => appointmentService.cancelAppointment(id, user?.id ?? '', reason)
  );
}

export function useRescheduleAppointment() {
  return useSupabaseMutation<
    Appointment,
    { id: string; newDate: string; newStartTime: string; newEndTime: string }
  >(({ id, newDate, newStartTime, newEndTime }) =>
    appointmentService.rescheduleAppointment(id, newDate, newStartTime, newEndTime)
  );
}
