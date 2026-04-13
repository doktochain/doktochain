import { api } from '../lib/api-client';
import { FinanceService } from './financeService';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ProfitLossStatement {
  revenue: {
    providerCommission: number;
    pharmacyCommission: number;
    subscriptionFees: number;
    premiumFeatures: number;
    other: number;
    total: number;
  };
  expenses: {
    server: number;
    marketing: number;
    staffSalaries: number;
    thirdPartyServices: number;
    operational: number;
    other: number;
    total: number;
  };
  grossProfit: number;
  grossProfitMargin: number;
  netIncome: number;
  netProfitMargin: number;
}

export interface AppointmentAnalytics {
  totalAppointments: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byProvider: Array<{ providerId: string; providerName: string; count: number }>;
  averageDuration: number;
  cancellationRate: number;
  noShowRate: number;
  peakHours: Record<string, number>;
  peakDays: Record<string, number>;
  appointmentTrend: Array<{ date: string; count: number }>;
}

export interface PatientAnalytics {
  totalPatients: number;
  newPatients: number;
  activePatients: number;
  inactivePatients: number;
  demographics: {
    byAge: Record<string, number>;
    byGender: Record<string, number>;
    byProvince: Record<string, number>;
  };
  engagement: {
    averageVisitsPerPatient: number;
    retentionRate: number;
  };
  registrationTrend: Array<{ date: string; count: number }>;
}

export class ReportsService {
  static async getProfitLossStatement(dateRange?: DateRange): Promise<ProfitLossStatement> {
    const incomeSummary = await FinanceService.getIncomeSummary(
      dateRange?.startDate,
      dateRange?.endDate
    );
    const expenseSummary = await FinanceService.getExpenseSummary(
      dateRange?.startDate,
      dateRange?.endDate
    );

    const revenue = {
      providerCommission: incomeSummary.bySource.provider_commission || 0,
      pharmacyCommission: incomeSummary.bySource.pharmacy_commission || 0,
      subscriptionFees: incomeSummary.bySource.subscription_fees || 0,
      premiumFeatures: incomeSummary.bySource.premium_features || 0,
      other: incomeSummary.bySource.other || 0,
      total: incomeSummary.totalIncome,
    };

    const expenses = {
      server: expenseSummary.byCategory.server || 0,
      marketing: expenseSummary.byCategory.marketing || 0,
      staffSalaries: expenseSummary.byCategory.staff_salaries || 0,
      thirdPartyServices: expenseSummary.byCategory.third_party_services || 0,
      operational: expenseSummary.byCategory.operational || 0,
      other: expenseSummary.byCategory.other || 0,
      total: expenseSummary.totalExpenses,
    };

    const grossProfit = revenue.total - expenses.total;
    const grossProfitMargin = revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0;
    const netIncome = grossProfit;
    const netProfitMargin = revenue.total > 0 ? (netIncome / revenue.total) * 100 : 0;

    return {
      revenue,
      expenses,
      grossProfit,
      grossProfitMargin,
      netIncome,
      netProfitMargin,
    };
  }

  static async getAppointmentAnalytics(dateRange?: DateRange): Promise<AppointmentAnalytics> {
    const params: Record<string, any> = { deleted_at: null };

    if (dateRange) {
      params.start_date = dateRange.startDate;
      params.end_date = dateRange.endDate;
    }

    const { data: appointments, error } = await api.get<any[]>('/appointments', { params });
    if (error) throw error;

    const totalAppointments = appointments?.length || 0;

    const byStatus = appointments?.reduce((acc: Record<string, number>, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {}) || {};

    const byType = appointments?.reduce((acc: Record<string, number>, apt) => {
      acc[apt.appointment_type] = (acc[apt.appointment_type] || 0) + 1;
      return acc;
    }, {}) || {};

    const providerCounts = appointments?.reduce((acc: Record<string, any>, apt) => {
      const providerId = apt.provider_id;
      if (!acc[providerId]) {
        acc[providerId] = {
          providerId,
          providerName: apt.provider
            ? `Dr. ${apt.provider.first_name} ${apt.provider.last_name}`
            : 'Unknown',
          count: 0,
        };
      }
      acc[providerId].count += 1;
      return acc;
    }, {}) || {};

    const byProvider = Object.values(providerCounts).sort((a: any, b: any) => b.count - a.count);

    const cancelled = byStatus.cancelled || 0;
    const noShow = byStatus.no_show || 0;
    const cancellationRate = totalAppointments > 0 ? (cancelled / totalAppointments) * 100 : 0;
    const noShowRate = totalAppointments > 0 ? (noShow / totalAppointments) * 100 : 0;

    const peakHours = appointments?.reduce((acc: Record<string, number>, apt) => {
      if (apt.start_time) {
        const hour = apt.start_time.split(':')[0];
        acc[hour] = (acc[hour] || 0) + 1;
      }
      return acc;
    }, {}) || {};

    const peakDays = appointments?.reduce((acc: Record<string, number>, apt) => {
      const date = new Date(apt.appointment_date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      acc[dayName] = (acc[dayName] || 0) + 1;
      return acc;
    }, {}) || {};

    const appointmentTrend = appointments?.reduce((acc: Array<any>, apt) => {
      const date = apt.appointment_date;
      const existing = acc.find((item) => item.date === date);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, []) || [];

    appointmentTrend.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      totalAppointments,
      byStatus,
      byType,
      byProvider: byProvider as any,
      averageDuration: 30,
      cancellationRate,
      noShowRate,
      peakHours,
      peakDays,
      appointmentTrend,
    };
  }

  static async getPatientAnalytics(dateRange?: DateRange): Promise<PatientAnalytics> {
    const { data: allPatients, error: allError } = await api.get<any[]>('/user-profiles', {
      params: { role: 'patient', deleted_at: null },
    });
    if (allError) throw allError;

    const newPatientsParams: Record<string, any> = { role: 'patient', deleted_at: null };

    if (dateRange) {
      newPatientsParams.created_from = dateRange.startDate;
      newPatientsParams.created_to = dateRange.endDate;
    }

    const { data: newPatients } = await api.get<any[]>('/user-profiles', { params: newPatientsParams });

    const totalPatients = allPatients?.length || 0;
    const newPatientsCount = newPatients?.length || 0;

    const byAge = allPatients?.reduce((acc: Record<string, number>, patient) => {
      if (patient.date_of_birth) {
        const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
        let ageGroup = '65+';
        if (age < 18) ageGroup = '0-17';
        else if (age < 30) ageGroup = '18-29';
        else if (age < 45) ageGroup = '30-44';
        else if (age < 65) ageGroup = '45-64';
        acc[ageGroup] = (acc[ageGroup] || 0) + 1;
      }
      return acc;
    }, {}) || {};

    const byGender = allPatients?.reduce((acc: Record<string, number>, patient) => {
      const gender = patient.gender || 'not_specified';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {}) || {};

    const byProvince = allPatients?.reduce((acc: Record<string, number>, patient) => {
      const province = patient.province || 'Not specified';
      acc[province] = (acc[province] || 0) + 1;
      return acc;
    }, {}) || {};

    const { data: appointments } = await api.get<any[]>('/appointments', {
      params: { deleted_at: null, fields: 'patient_id,appointment_date' },
    });

    const patientAppointmentCounts = appointments?.reduce((acc: Record<string, number>, apt) => {
      acc[apt.patient_id] = (acc[apt.patient_id] || 0) + 1;
      return acc;
    }, {}) || {};

    const totalVisits = Object.values(patientAppointmentCounts).reduce(
      (sum: number, count: any) => sum + count,
      0
    );
    const averageVisitsPerPatient =
      totalPatients > 0 ? totalVisits / totalPatients : 0;

    const activePatients = Object.keys(patientAppointmentCounts).length;
    const inactivePatients = totalPatients - activePatients;

    const registrationTrend = allPatients?.reduce((acc: Array<any>, patient) => {
      const date = patient.created_at.split('T')[0];
      const existing = acc.find((item) => item.date === date);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, []) || [];

    registrationTrend.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      totalPatients,
      newPatients: newPatientsCount,
      activePatients,
      inactivePatients,
      demographics: {
        byAge,
        byGender,
        byProvince,
      },
      engagement: {
        averageVisitsPerPatient,
        retentionRate: totalPatients > 0 ? (activePatients / totalPatients) * 100 : 0,
      },
      registrationTrend,
    };
  }

  static async exportToPDF(reportName: string, content: any): Promise<Blob> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
          <h1>${reportName}</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          ${JSON.stringify(content, null, 2)}
        </body>
      </html>
    `;

    return new Blob([htmlContent], { type: 'text/html' });
  }

  static exportToCSV(headers: string[], rows: any[][]): Blob {
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv' });
  }

  static async getComparativeProfitLoss(
    currentRange: DateRange,
    previousRange: DateRange
  ): Promise<{
    current: ProfitLossStatement;
    previous: ProfitLossStatement;
    changes: any;
  }> {
    const current = await this.getProfitLossStatement(currentRange);
    const previous = await this.getProfitLossStatement(previousRange);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const changes = {
      revenue: calculateChange(current.revenue.total, previous.revenue.total),
      expenses: calculateChange(current.expenses.total, previous.expenses.total),
      netIncome: calculateChange(current.netIncome, previous.netIncome),
    };

    return { current, previous, changes };
  }
}
