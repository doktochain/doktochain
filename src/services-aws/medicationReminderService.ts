import { api } from '../lib/api-client';

export interface MedicationReminder {
  id: string;
  patient_id: string;
  prescription_id: string | null;
  medication_name: string;
  dosage: string;
  frequency: 'daily' | 'twice_daily' | 'three_times_daily' | 'four_times_daily' | 'weekly' | 'as_needed' | 'custom';
  reminder_times: string[];
  days_of_week: number[];
  start_date: string;
  end_date: string | null;
  with_food: boolean;
  special_instructions: string | null;
  enabled: boolean;
  snoozed_until: string | null;
  created_at: string;
}

export interface AdherenceLog {
  id: string;
  reminder_id: string;
  patient_id: string;
  scheduled_time: string;
  taken_time: string | null;
  status: 'taken' | 'missed' | 'skipped' | 'snoozed';
  notes: string | null;
  created_at: string;
}

export interface AdherenceStats {
  total_doses: number;
  taken_doses: number;
  missed_doses: number;
  adherence_percentage: number;
  current_streak: number;
  longest_streak: number;
}

export const medicationReminderService = {
  async createReminder(reminderData: Partial<MedicationReminder>): Promise<MedicationReminder> {
    const { data, error } = await api.post<MedicationReminder>('/medication-reminders', reminderData);

    if (error) throw new Error(error.message);
    return data!;
  },

  async getPatientReminders(patientId: string, activeOnly: boolean = false): Promise<MedicationReminder[]> {
    const params: Record<string, string> = {
      patient_id: patientId,
      order: 'created_at.desc',
    };

    if (activeOnly) {
      params.enabled = 'true';
    }

    const { data, error } = await api.get<MedicationReminder[]>('/medication-reminders', { params });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async updateReminder(reminderId: string, updates: Partial<MedicationReminder>): Promise<MedicationReminder> {
    const { data, error } = await api.put<MedicationReminder>(`/medication-reminders/${reminderId}`, updates);

    if (error) throw new Error(error.message);
    return data!;
  },

  async deleteReminder(reminderId: string): Promise<void> {
    const { error } = await api.delete(`/medication-reminders/${reminderId}`);

    if (error) throw new Error(error.message);
  },

  async toggleReminder(reminderId: string, enabled: boolean): Promise<void> {
    const { error } = await api.put(`/medication-reminders/${reminderId}`, { enabled });

    if (error) throw new Error(error.message);
  },

  async snoozeReminder(reminderId: string, minutes: number): Promise<void> {
    const snoozedUntil = new Date();
    snoozedUntil.setMinutes(snoozedUntil.getMinutes() + minutes);

    const { error } = await api.put(`/medication-reminders/${reminderId}`, {
      snoozed_until: snoozedUntil.toISOString(),
    });

    if (error) throw new Error(error.message);
  },

  async logMedicationTaken(
    reminderId: string,
    patientId: string,
    scheduledTime: string,
    status: 'taken' | 'missed' | 'skipped' | 'snoozed',
    notes?: string
  ): Promise<AdherenceLog> {
    const { data, error } = await api.post<AdherenceLog>('/medication-adherence-log', {
      reminder_id: reminderId,
      patient_id: patientId,
      scheduled_time: scheduledTime,
      taken_time: status === 'taken' ? new Date().toISOString() : null,
      status,
      notes,
    });

    if (error) throw new Error(error.message);
    return data!;
  },

  async getAdherenceLogs(
    patientId: string,
    reminderId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<AdherenceLog[]> {
    const params: Record<string, string> = {
      patient_id: patientId,
      order: 'scheduled_time.desc',
    };

    if (reminderId) {
      params.reminder_id = reminderId;
    }

    if (startDate) {
      params.scheduled_time_gte = startDate;
    }

    if (endDate) {
      params.scheduled_time_lte = endDate;
    }

    const { data, error } = await api.get<AdherenceLog[]>('/medication-adherence-log', { params });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async getAdherenceStats(patientId: string, reminderId?: string, days: number = 30): Promise<AdherenceStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.getAdherenceLogs(
      patientId,
      reminderId,
      startDate.toISOString()
    );

    const totalDoses = logs.length;
    const takenDoses = logs.filter((log) => log.status === 'taken').length;
    const missedDoses = logs.filter((log) => log.status === 'missed').length;
    const adherencePercentage = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

    const sortedLogs = logs.sort(
      (a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime()
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < sortedLogs.length; i++) {
      if (sortedLogs[i].status === 'taken') {
        tempStreak++;
        if (i === 0) currentStreak = tempStreak;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        if (i === 0) currentStreak = 0;
        tempStreak = 0;
      }
    }

    return {
      total_doses: totalDoses,
      taken_doses: takenDoses,
      missed_doses: missedDoses,
      adherence_percentage: Math.round(adherencePercentage),
      current_streak: currentStreak,
      longest_streak: longestStreak,
    };
  },

  async getTodayReminders(patientId: string): Promise<Array<MedicationReminder & { next_time: string }>> {
    const reminders = await this.getPatientReminders(patientId, true);
    const today = new Date().getDay();
    const currentTime = new Date().toTimeString().slice(0, 5);

    const todayReminders = reminders
      .filter((reminder) => {
        if (reminder.frequency === 'weekly' && !reminder.days_of_week.includes(today)) {
          return false;
        }
        return true;
      })
      .map((reminder) => {
        const upcomingTimes = reminder.reminder_times.filter((time) => time > currentTime);
        const nextTime = upcomingTimes.length > 0 ? upcomingTimes[0] : null;

        return {
          ...reminder,
          next_time: nextTime || reminder.reminder_times[0],
        };
      })
      .sort((a, b) => a.next_time.localeCompare(b.next_time));

    return todayReminders;
  },

  async createReminderFromPrescription(
    prescriptionId: string,
    patientId: string
  ): Promise<MedicationReminder> {
    const { data: prescription } = await api.get<any>(`/prescriptions/${prescriptionId}`, {
      params: { select: '*,prescription_items(*)' },
    });

    if (!prescription || !prescription.prescription_items || prescription.prescription_items.length === 0) {
      throw new Error('Prescription not found or has no items');
    }

    const item = prescription.prescription_items[0];

    const reminderTimes = this.parseFrequencyToTimes(item.frequency);

    const reminderData = {
      patient_id: patientId,
      prescription_id: prescriptionId,
      medication_name: item.medication_name,
      dosage: item.dosage_instructions,
      frequency: this.mapFrequencyToType(item.frequency),
      reminder_times: reminderTimes,
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      start_date: new Date().toISOString().split('T')[0],
      end_date: item.duration_days
        ? new Date(Date.now() + item.duration_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : null,
      with_food: false,
      special_instructions: item.special_instructions,
      enabled: true,
    };

    return this.createReminder(reminderData);
  },

  parseFrequencyToTimes(frequency: string): string[] {
    const lower = frequency.toLowerCase();

    if (lower.includes('once') || lower.includes('daily')) {
      return ['09:00'];
    } else if (lower.includes('twice') || lower.includes('bid')) {
      return ['09:00', '21:00'];
    } else if (lower.includes('three times') || lower.includes('tid')) {
      return ['09:00', '14:00', '21:00'];
    } else if (lower.includes('four times') || lower.includes('qid')) {
      return ['08:00', '12:00', '16:00', '20:00'];
    } else if (lower.includes('every') && lower.includes('hours')) {
      const hours = parseInt(lower.match(/\d+/)?.[0] || '8');
      const times = [];
      for (let hour = 8; hour < 24; hour += hours) {
        times.push(`${String(hour).padStart(2, '0')}:00`);
      }
      return times;
    }

    return ['09:00'];
  },

  mapFrequencyToType(
    frequency: string
  ): 'daily' | 'twice_daily' | 'three_times_daily' | 'four_times_daily' | 'weekly' | 'as_needed' | 'custom' {
    const lower = frequency.toLowerCase();

    if (lower.includes('twice') || lower.includes('bid')) return 'twice_daily';
    if (lower.includes('three times') || lower.includes('tid')) return 'three_times_daily';
    if (lower.includes('four times') || lower.includes('qid')) return 'four_times_daily';
    if (lower.includes('weekly')) return 'weekly';
    if (lower.includes('as needed') || lower.includes('prn')) return 'as_needed';

    return 'daily';
  },
};
