import { api } from '../lib/api-client';

export interface PatientMedication {
  id: string;
  patient_id: string;
  prescription_id?: string;
  medication_name: string;
  generic_name?: string;
  brand_name?: string;
  dosage: string;
  form?: string;
  frequency: string;
  frequency_times_per_day: number;
  route?: string;
  indication?: string;
  prescribing_provider_id?: string;
  pharmacy_id?: string;
  refills_remaining: number;
  last_filled_date?: string;
  next_refill_due_date?: string;
  expiration_date?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  is_as_needed: boolean;
  special_instructions?: string;
  food_instructions?: string;
  source: 'prescription' | 'pharmacy' | 'manual' | 'otc';
  created_at: string;
  updated_at: string;
}

export interface MedicationReminder {
  id: string;
  patient_medication_id: string;
  patient_id: string;
  reminder_time: string;
  days_of_week: number[];
  is_enabled: boolean;
  notification_channels: string[];
  snooze_duration_minutes: number;
  meal_timing?: 'before' | 'with' | 'after' | 'anytime';
  minutes_before_after_meal?: number;
  special_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MedicationLog {
  id: string;
  patient_medication_id: string;
  reminder_id?: string;
  patient_id: string;
  scheduled_time: string;
  actual_time?: string;
  status: 'taken' | 'missed' | 'skipped' | 'snoozed';
  notes?: string;
  logged_at: string;
}

export interface AdherenceStats {
  total_doses: number;
  taken_doses: number;
  missed_doses: number;
  adherence_percentage: number;
  current_streak_days: number;
}

export const medicationManagementService = {
  async getPatientMedications(patientId: string, activeOnly: boolean = true): Promise<{
    data: PatientMedication[] | null;
    error: Error | null;
  }> {
    try {
      const params: Record<string, string> = {
        patient_id: patientId,
        order: 'medication_name',
      };

      if (activeOnly) {
        params.is_active = 'true';
      }

      const { data, error } = await api.get<PatientMedication[]>('/patient-medications', { params });

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getMedicationById(medicationId: string): Promise<{
    data: PatientMedication | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<PatientMedication>(`/patient-medications/${medicationId}`);

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async addMedication(medication: Partial<PatientMedication>): Promise<{
    data: PatientMedication | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.post<PatientMedication>('/patient-medications', medication);

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async updateMedication(
    medicationId: string,
    updates: Partial<PatientMedication>
  ): Promise<{
    data: PatientMedication | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.put<PatientMedication>(`/patient-medications/${medicationId}`, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async discontinueMedication(
    medicationId: string,
    reason?: string
  ): Promise<{ data: boolean; error: Error | null }> {
    try {
      const { data: medication } = await this.getMedicationById(medicationId);

      if (medication) {
        await api.post('/medication-history', {
          patient_id: medication.patient_id,
          medication_name: medication.medication_name,
          generic_name: medication.generic_name,
          dosage: medication.dosage,
          frequency: medication.frequency,
          start_date: medication.start_date,
          end_date: new Date().toISOString().split('T')[0],
          discontinuation_reason: reason,
          prescribing_provider_id: medication.prescribing_provider_id,
        });
      }

      const { error } = await api.put(`/patient-medications/${medicationId}`, {
        is_active: false,
        end_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      });

      if (error) throw new Error(error.message);
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  async getRemindersForMedication(medicationId: string): Promise<{
    data: MedicationReminder[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<MedicationReminder[]>('/medication-reminders', {
        params: { patient_medication_id: medicationId, order: 'reminder_time' },
      });

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async addReminder(reminder: Partial<MedicationReminder>): Promise<{
    data: MedicationReminder | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.post<MedicationReminder>('/medication-reminders', reminder);

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async updateReminder(
    reminderId: string,
    updates: Partial<MedicationReminder>
  ): Promise<{
    data: MedicationReminder | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.put<MedicationReminder>(`/medication-reminders/${reminderId}`, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async deleteReminder(reminderId: string): Promise<{
    data: boolean;
    error: Error | null;
  }> {
    try {
      const { error } = await api.delete(`/medication-reminders/${reminderId}`);

      if (error) throw new Error(error.message);
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  async logMedicationTaken(
    medicationId: string,
    patientId: string,
    reminderId?: string,
    notes?: string
  ): Promise<{ data: MedicationLog | null; error: Error | null }> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await api.post<MedicationLog>('/medication-logs', {
        patient_medication_id: medicationId,
        patient_id: patientId,
        reminder_id: reminderId,
        scheduled_time: now,
        actual_time: now,
        status: 'taken',
        notes,
      });

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getAdherenceStats(
    patientId: string,
    medicationId: string,
    days: number = 30
  ): Promise<{ data: AdherenceStats | null; error: Error | null }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: logs, error } = await api.get<MedicationLog[]>('/medication-logs', {
        params: {
          patient_id: patientId,
          patient_medication_id: medicationId,
          scheduled_time_gte: startDate.toISOString(),
        },
      });

      if (error) throw new Error(error.message);

      if (!logs || (logs as any[]).length === 0) {
        return {
          data: {
            total_doses: 0,
            taken_doses: 0,
            missed_doses: 0,
            adherence_percentage: 0,
            current_streak_days: 0,
          },
          error: null,
        };
      }

      const logList = logs as MedicationLog[];
      const total_doses = logList.length;
      const taken_doses = logList.filter((log) => log.status === 'taken').length;
      const missed_doses = logList.filter((log) => log.status === 'missed').length;
      const adherence_percentage = (taken_doses / total_doses) * 100;

      let current_streak_days = 0;
      const sortedLogs = logList.sort(
        (a, b) =>
          new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime()
      );

      for (const log of sortedLogs) {
        if (log.status === 'taken') {
          current_streak_days++;
        } else {
          break;
        }
      }

      return {
        data: {
          total_doses,
          taken_doses,
          missed_doses,
          adherence_percentage: Math.round(adherence_percentage * 100) / 100,
          current_streak_days,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getMedicationsNeedingRefill(patientId: string, daysAhead: number = 7): Promise<{
    data: PatientMedication[] | null;
    error: Error | null;
  }> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await api.get<PatientMedication[]>('/patient-medications', {
        params: {
          patient_id: patientId,
          is_active: 'true',
          next_refill_due_date_lte: futureDate.toISOString().split('T')[0],
          order: 'next_refill_due_date',
        },
      });

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  formatFrequency(frequency: string, timesPerDay: number): string {
    if (frequency === 'as_needed') return 'As needed';
    if (frequency === 'daily') return `${timesPerDay}x daily`;
    if (frequency === 'weekly') return `${timesPerDay}x weekly`;
    if (frequency === 'monthly') return `${timesPerDay}x monthly`;
    return frequency;
  },

  getDaysOfWeekString(days: number[]): string {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (days.length === 7) return 'Every day';
    return days.map((d) => dayNames[d]).join(', ');
  },
};
