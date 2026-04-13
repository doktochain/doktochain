import { supabase } from '../lib/supabase';

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
  // Create medication reminder
  async createReminder(reminderData: Partial<MedicationReminder>): Promise<MedicationReminder> {
    const { data, error } = await supabase
      .from('medication_reminders')
      .insert(reminderData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get all reminders for a patient
  async getPatientReminders(patientId: string, activeOnly: boolean = false): Promise<MedicationReminder[]> {
    let query = supabase
      .from('medication_reminders')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('enabled', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Update reminder
  async updateReminder(reminderId: string, updates: Partial<MedicationReminder>): Promise<MedicationReminder> {
    const { data, error } = await supabase
      .from('medication_reminders')
      .update(updates)
      .eq('id', reminderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete reminder
  async deleteReminder(reminderId: string): Promise<void> {
    const { error } = await supabase
      .from('medication_reminders')
      .delete()
      .eq('id', reminderId);

    if (error) throw error;
  },

  // Toggle reminder enabled status
  async toggleReminder(reminderId: string, enabled: boolean): Promise<void> {
    const { error} = await supabase
      .from('medication_reminders')
      .update({ enabled })
      .eq('id', reminderId);

    if (error) throw error;
  },

  // Snooze reminder
  async snoozeReminder(reminderId: string, minutes: number): Promise<void> {
    const snoozedUntil = new Date();
    snoozedUntil.setMinutes(snoozedUntil.getMinutes() + minutes);

    const { error } = await supabase
      .from('medication_reminders')
      .update({ snoozed_until: snoozedUntil.toISOString() })
      .eq('id', reminderId);

    if (error) throw error;
  },

  // Log medication taken
  async logMedicationTaken(
    reminderId: string,
    patientId: string,
    scheduledTime: string,
    status: 'taken' | 'missed' | 'skipped' | 'snoozed',
    notes?: string
  ): Promise<AdherenceLog> {
    const { data, error } = await supabase
      .from('medication_adherence_log')
      .insert({
        reminder_id: reminderId,
        patient_id: patientId,
        scheduled_time: scheduledTime,
        taken_time: status === 'taken' ? new Date().toISOString() : null,
        status,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get adherence logs
  async getAdherenceLogs(
    patientId: string,
    reminderId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<AdherenceLog[]> {
    let query = supabase
      .from('medication_adherence_log')
      .select('*')
      .eq('patient_id', patientId)
      .order('scheduled_time', { ascending: false });

    if (reminderId) {
      query = query.eq('reminder_id', reminderId);
    }

    if (startDate) {
      query = query.gte('scheduled_time', startDate);
    }

    if (endDate) {
      query = query.lte('scheduled_time', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Calculate adherence statistics
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

    // Calculate streaks
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

  // Get upcoming reminders for today
  async getTodayReminders(patientId: string): Promise<Array<MedicationReminder & { next_time: string }>> {
    const reminders = await this.getPatientReminders(patientId, true);
    const today = new Date().getDay();
    const currentTime = new Date().toTimeString().slice(0, 5);

    const todayReminders = reminders
      .filter((reminder) => {
        // Check if reminder is active today
        if (reminder.frequency === 'weekly' && !reminder.days_of_week.includes(today)) {
          return false;
        }
        return true;
      })
      .map((reminder) => {
        // Find next reminder time
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

  // Create reminder from prescription
  async createReminderFromPrescription(
    prescriptionId: string,
    patientId: string
  ): Promise<MedicationReminder> {
    const { data: prescription } = await supabase
      .from('prescriptions')
      .select('*, prescription_items(*)')
      .eq('id', prescriptionId)
      .single();

    if (!prescription || !prescription.prescription_items || prescription.prescription_items.length === 0) {
      throw new Error('Prescription not found or has no items');
    }

    const item = prescription.prescription_items[0];

    // Parse frequency to generate reminder times
    const reminderTimes = this.parseFrequencyToTimes(item.frequency);

    const reminderData = {
      patient_id: patientId,
      prescription_id: prescriptionId,
      medication_name: item.medication_name,
      dosage: item.dosage_instructions,
      frequency: this.mapFrequencyToType(item.frequency),
      reminder_times: reminderTimes,
      days_of_week: [0, 1, 2, 3, 4, 5, 6], // All days by default
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

  // Helper: Parse frequency string to times
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

  // Helper: Map frequency to type
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
