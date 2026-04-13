import { api } from '../lib/api-client';
import { medicationReminderService } from './medicationReminderService';
import { appointmentService } from './appointmentService';
import { fhirService } from './fhirService';

export interface HealthScore {
  overall_score: number;
  appointment_adherence_score: number;
  medication_compliance_score: number;
  lab_results_score: number;
  vital_signs_score: number;
  last_calculated: string;
}

export interface HealthTimeline {
  date: string;
  events: Array<{
    type: 'appointment' | 'lab' | 'medication' | 'diagnosis' | 'immunization';
    title: string;
    description: string;
    status?: string;
  }>;
}

export interface CareRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'preventive' | 'follow-up' | 'screening' | 'medication';
  title: string;
  description: string;
  action_required: string;
  due_date?: string;
}

export const healthAnalyticsService = {
  async calculateHealthScore(patientId: string): Promise<HealthScore> {
    const [appointmentScore, medicationScore, labScore, vitalScore] = await Promise.all([
      this.calculateAppointmentAdherence(patientId),
      this.calculateMedicationCompliance(patientId),
      this.calculateLabResultsScore(patientId),
      this.calculateVitalSignsScore(patientId),
    ]);

    const overallScore = Math.round(
      (appointmentScore * 0.25 +
        medicationScore * 0.35 +
        labScore * 0.2 +
        vitalScore * 0.2)
    );

    return {
      overall_score: overallScore,
      appointment_adherence_score: appointmentScore,
      medication_compliance_score: medicationScore,
      lab_results_score: labScore,
      vital_signs_score: vitalScore,
      last_calculated: new Date().toISOString(),
    };
  },

  async calculateAppointmentAdherence(patientId: string): Promise<number> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: appointments } = await api.get<Array<{ status: string; appointment_date: string }>>('/appointments', {
      params: {
        patient_id: patientId,
        appointment_date_gte: sixMonthsAgo.toISOString().split('T')[0],
        select: 'status,appointment_date',
      },
    });

    if (!appointments || (appointments as any[]).length === 0) return 100;

    const appointmentList = appointments as Array<{ status: string; appointment_date: string }>;
    const completed = appointmentList.filter(
      (a) => a.status === 'completed'
    ).length;
    const noShow = appointmentList.filter((a) => a.status === 'no-show').length;
    const cancelled = appointmentList.filter(
      (a) => a.status === 'cancelled'
    ).length;

    const total = appointmentList.length;
    const adherenceRate = ((completed / total) * 100) - (noShow / total * 20) - (cancelled / total * 10);

    return Math.max(0, Math.min(100, Math.round(adherenceRate)));
  },

  async calculateMedicationCompliance(patientId: string): Promise<number> {
    const stats = await medicationReminderService.getAdherenceStats(patientId);

    return stats.adherence_percentage;
  },

  async calculateLabResultsScore(patientId: string): Promise<number> {
    const labs = await fhirService.getLabResults(patientId, 10);

    if (labs.length === 0) return 80;

    const normalCount = labs.filter((l) => l.status === 'normal').length;
    const abnormalCount = labs.filter((l) => l.status === 'abnormal').length;
    const criticalCount = labs.filter((l) => l.status === 'critical').length;

    const score =
      (normalCount * 100 +
        abnormalCount * 70 +
        criticalCount * 30) /
      labs.length;

    return Math.round(score);
  },

  async calculateVitalSignsScore(patientId: string): Promise<number> {
    const vitals = await fhirService.getVitalSigns(patientId, undefined, 10);

    if (vitals.length === 0) return 80;

    const improvingCount = vitals.filter((v) => v.trend === 'down' && (v.type === 'blood_pressure' || v.type === 'weight')).length +
                          vitals.filter((v) => v.trend === 'up' && v.type === 'heart_rate').length;
    const stableCount = vitals.filter((v) => v.trend === 'stable').length;
    const decliningCount = vitals.length - improvingCount - stableCount;

    const score =
      (improvingCount * 100 + stableCount * 85 + decliningCount * 60) /
      vitals.length;

    return Math.round(score);
  },

  async generateHealthTimeline(
    patientId: string,
    days: number = 90
  ): Promise<HealthTimeline[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [appointments, labs, meds, diagnoses, immunizations] = await Promise.all([
      appointmentService.getPatientAppointments(patientId),
      fhirService.getLabResults(patientId, 20),
      medicationReminderService.getAdherenceLogs(patientId, undefined, startDate.toISOString()),
      fhirService.getDiagnoses(patientId),
      fhirService.getImmunizations(patientId),
    ]);

    const timeline: Map<string, HealthTimeline> = new Map();

    appointments
      .filter((a) => new Date(a.appointment_date) >= startDate)
      .forEach((appointment) => {
        const date = appointment.appointment_date;
        if (!timeline.has(date)) {
          timeline.set(date, { date, events: [] });
        }
        timeline.get(date)!.events.push({
          type: 'appointment',
          title: `Appointment with Dr. ${appointment.providers?.user_profiles?.last_name}`,
          description: appointment.reason_for_visit || appointment.visit_type,
          status: appointment.status,
        });
      });

    labs
      .filter((l) => new Date(l.date) >= startDate)
      .forEach((lab) => {
        const date = lab.date.split('T')[0];
        if (!timeline.has(date)) {
          timeline.set(date, { date, events: [] });
        }
        timeline.get(date)!.events.push({
          type: 'lab',
          title: `Lab: ${lab.test_name}`,
          description: `Result: ${lab.value} ${lab.unit}`,
          status: lab.status,
        });
      });

    meds
      .filter((m) => m.status === 'taken' && new Date(m.taken_time!) >= startDate)
      .forEach((med) => {
        const date = med.taken_time!.split('T')[0];
        if (!timeline.has(date)) {
          timeline.set(date, { date, events: [] });
        }
        const existingMedEvent = timeline.get(date)!.events.find(e => e.type === 'medication');
        if (existingMedEvent) {
          existingMedEvent.description += ', medication taken';
        } else {
          timeline.get(date)!.events.push({
            type: 'medication',
            title: 'Medication taken',
            description: 'Daily medications',
            status: 'taken',
          });
        }
      });

    diagnoses
      .filter((d) => new Date(d.onset_date) >= startDate)
      .forEach((diagnosis) => {
        const date = diagnosis.onset_date.split('T')[0];
        if (!timeline.has(date)) {
          timeline.set(date, { date, events: [] });
        }
        timeline.get(date)!.events.push({
          type: 'diagnosis',
          title: `Diagnosis: ${diagnosis.condition}`,
          description: `Status: ${diagnosis.status}`,
          status: diagnosis.status,
        });
      });

    immunizations
      .filter((i) => new Date(i.date_administered) >= startDate)
      .forEach((imm) => {
        const date = imm.date_administered.split('T')[0];
        if (!timeline.has(date)) {
          timeline.set(date, { date, events: [] });
        }
        timeline.get(date)!.events.push({
          type: 'immunization',
          title: `Vaccine: ${imm.vaccine_name}`,
          description: `Administered by ${imm.provider}`,
          status: 'completed',
        });
      });

    return Array.from(timeline.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },

  async generateCareRecommendations(patientId: string): Promise<CareRecommendation[]> {
    const recommendations: CareRecommendation[] = [];

    const { data: patient } = await api.get<any>(`/patients/${patientId}`, {
      params: { select: '*,user_profiles(*)' },
    });

    if (patient) {
      const age = this.calculateAge(patient.user_profiles.date_of_birth);

      if (age >= 50) {
        recommendations.push({
          id: 'colonoscopy',
          priority: 'high',
          category: 'screening',
          title: 'Colonoscopy Screening',
          description: 'Adults 50+ should have regular colorectal cancer screening',
          action_required: 'Schedule a colonoscopy appointment',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      if (age >= 40 && patient.user_profiles.gender === 'female') {
        recommendations.push({
          id: 'mammogram',
          priority: 'high',
          category: 'screening',
          title: 'Mammogram Screening',
          description: 'Annual mammogram recommended for women 40+',
          action_required: 'Schedule a mammogram',
          due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    const medicationStats = await medicationReminderService.getAdherenceStats(patientId);
    if (medicationStats.adherence_percentage < 80) {
      recommendations.push({
        id: 'medication-adherence',
        priority: 'high',
        category: 'medication',
        title: 'Improve Medication Adherence',
        description: `Current adherence: ${medicationStats.adherence_percentage}%. Consistent medication taking is important.`,
        action_required: 'Review medication schedule and set reminders',
      });
    }

    const labs = await fhirService.getLabResults(patientId, 5);
    const criticalLabs = labs.filter((l) => l.status === 'critical');
    if (criticalLabs.length > 0) {
      recommendations.push({
        id: 'critical-labs',
        priority: 'high',
        category: 'follow-up',
        title: 'Follow-up on Critical Lab Results',
        description: `You have ${criticalLabs.length} critical lab result(s) requiring attention`,
        action_required: 'Schedule follow-up appointment with your doctor',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    const lastAppointment = await this.getLastPhysicalExam(patientId);
    if (!lastAppointment || this.daysSince(lastAppointment) > 365) {
      recommendations.push({
        id: 'annual-physical',
        priority: 'medium',
        category: 'preventive',
        title: 'Annual Physical Exam',
        description: 'Its time for your annual physical examination',
        action_required: 'Schedule annual physical',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    const currentMonth = new Date().getMonth();
    if (currentMonth >= 8 && currentMonth <= 11) {
      const immunizations = await fhirService.getImmunizations(patientId);
      const recentFluShot = immunizations.find(
        (i) =>
          i.vaccine_name.toLowerCase().includes('influenza') &&
          this.daysSince(i.date_administered) < 365
      );

      if (!recentFluShot) {
        recommendations.push({
          id: 'flu-shot',
          priority: 'medium',
          category: 'preventive',
          title: 'Annual Flu Vaccine',
          description: 'Get your annual flu shot for protection this season',
          action_required: 'Schedule flu vaccine appointment',
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  },

  calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  },

  daysSince(date: string): number {
    const then = new Date(date);
    const now = new Date();
    return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
  },

  async getLastPhysicalExam(patientId: string): Promise<string | null> {
    const { data } = await api.get<{ appointment_date: string }>('/appointments', {
      params: {
        patient_id: patientId,
        visit_type: 'routine',
        status: 'completed',
        order: 'appointment_date.desc',
        limit: '1',
        select: 'appointment_date',
      },
    });

    return (data as any)?.appointment_date || null;
  },
};
