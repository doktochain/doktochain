import { api } from '../lib/api-client';

export interface DashboardStats {
  todayAppointments: {
    total: number;
    confirmed: number;
    pending: number;
    completed: number;
    virtual: number;
    inPerson: number;
  };
  earnings: {
    today: number;
    week: number;
    month: number;
    pending: number;
  };
  patientQueue: {
    waiting: number;
    checkedIn: number;
    inProgress: number;
    estimatedWaitTime: number;
  };
  recentActivity: ActivityItem[];
  unreadMessageCount: number;
  telemedicineSystemStatus: {
    camera: boolean;
    microphone: boolean;
    connection: boolean;
  };
}

export interface ActivityItem {
  id: string;
  type: 'appointment' | 'message' | 'prescription' | 'payment';
  title: string;
  description: string;
  timestamp: string;
  patient_name?: string;
}

export interface AppointmentMetrics {
  byDayOfWeek: { day: string; count: number }[];
  byType: { type: string; count: number; percentage: number }[];
  trends: { date: string; appointments: number }[];
  noShowRate: number;
  avgDuration: number;
  avgResponseTime: number;
  avgPrescriptionTurnaround: number;
}

export interface FinancialMetrics {
  revenueByService: { service: string; amount: number; percentage: number }[];
  insuranceVsSelfPay: { type: string; amount: number; percentage: number }[];
  outstandingPayments: { amount: number; count: number };
  monthlyComparison: { month: string; revenue: number; change: number }[];
  earningsTrend: { period: string; amount: number }[];
}

export interface PatientInsights {
  newVsReturning: { type: string; count: number; percentage: number }[];
  demographics: { ageGroup: string; count: number }[];
  commonComplaints: { complaint: string; count: number }[];
  satisfactionScore: number;
}

export const providerDashboardService = {
  async getDashboardStats(providerId: string, date: string = new Date().toISOString().split('T')[0]): Promise<DashboardStats> {
    const { data: appointments } = await api.get<any[]>('/appointments', {
      params: {
        provider_id: providerId,
        appointment_date: date,
        include: 'patients,user_profiles',
      },
    });

    const todayAppointments = {
      total: appointments?.length || 0,
      confirmed: appointments?.filter(a => a.status === 'confirmed').length || 0,
      pending: appointments?.filter(a => a.status === 'scheduled').length || 0,
      completed: appointments?.filter(a => a.status === 'completed').length || 0,
      virtual: appointments?.filter(a => a.appointment_type === 'virtual').length || 0,
      inPerson: appointments?.filter(a => a.appointment_type === 'in-person').length || 0,
    };

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date();
    monthStart.setDate(1);

    const { data: todayTransactions } = await api.get<any[]>('/billing-transactions', {
      params: {
        provider_id: providerId,
        transaction_date: date,
        status: 'completed',
        select: 'total_cents',
      },
    });

    const { data: weekTransactions } = await api.get<any[]>('/billing-transactions', {
      params: {
        provider_id: providerId,
        transaction_date_gte: weekStart.toISOString().split('T')[0],
        status: 'completed',
        select: 'total_cents',
      },
    });

    const { data: monthTransactions } = await api.get<any[]>('/billing-transactions', {
      params: {
        provider_id: providerId,
        transaction_date_gte: monthStart.toISOString().split('T')[0],
        status: 'completed',
        select: 'total_cents',
      },
    });

    const { data: pendingTransactions } = await api.get<any[]>('/billing-transactions', {
      params: {
        provider_id: providerId,
        status: 'pending',
        select: 'total_cents',
      },
    });

    const earnings = {
      today: (todayTransactions?.reduce((sum, t) => sum + t.total_cents, 0) || 0) / 100,
      week: (weekTransactions?.reduce((sum, t) => sum + t.total_cents, 0) || 0) / 100,
      month: (monthTransactions?.reduce((sum, t) => sum + t.total_cents, 0) || 0) / 100,
      pending: (pendingTransactions?.reduce((sum, t) => sum + t.total_cents, 0) || 0) / 100,
    };

    const { data: waitingPatients } = await api.get<any[]>('/video-consultations', {
      params: { provider_id: providerId, status: 'waiting' },
    });

    const avgWaitTime = waitingPatients && waitingPatients.length > 0
      ? waitingPatients.reduce((sum, p) => {
          const waitMinutes = Math.floor((new Date().getTime() - new Date(p.created_at).getTime()) / 60000);
          return sum + waitMinutes;
        }, 0) / waitingPatients.length
      : 0;

    const patientQueue = {
      waiting: waitingPatients?.length || 0,
      checkedIn: appointments?.filter(a => a.check_in_time && !a.check_out_time).length || 0,
      inProgress: appointments?.filter(a => a.status === 'in-progress').length || 0,
      estimatedWaitTime: Math.round(avgWaitTime),
    };

    const recentActivity = await providerDashboardService.getRecentActivity(providerId, 10);

    const { data: unreadMessages } = await api.get<any[]>('/secure-messages', {
      params: { provider_id: providerId, read: false, select: 'id' },
    });

    const telemedicineSystemStatus = {
      camera: true,
      microphone: true,
      connection: true,
    };

    return {
      todayAppointments,
      earnings,
      patientQueue,
      recentActivity,
      unreadMessageCount: unreadMessages?.length || 0,
      telemedicineSystemStatus,
    };
  },

  async getRecentActivity(providerId: string, limit: number = 10): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = [];

    const { data: appointments } = await api.get<any[]>('/appointments', {
      params: {
        provider_id: providerId,
        include: 'patients,user_profiles',
        order_by: 'created_at:desc',
        limit,
      },
    });

    appointments?.forEach(apt => {
      activities.push({
        id: apt.id,
        type: 'appointment',
        title: 'New Appointment',
        description: `${apt.appointment_type} appointment scheduled`,
        timestamp: apt.created_at,
        patient_name: `${apt.patients?.user_profiles?.first_name} ${apt.patients?.user_profiles?.last_name}`,
      });
    });

    const { data: messages } = await api.get<any[]>('/secure-messages', {
      params: {
        provider_id: providerId,
        include: 'patients,user_profiles',
        order_by: 'created_at:desc',
        limit,
      },
    });

    messages?.forEach(msg => {
      activities.push({
        id: msg.id,
        type: 'message',
        title: 'New Message',
        description: msg.subject,
        timestamp: msg.created_at,
        patient_name: `${msg.patient?.user_profiles?.first_name} ${msg.patient?.user_profiles?.last_name}`,
      });
    });

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  },

  async getAppointmentMetrics(providerId: string, days: number = 30): Promise<AppointmentMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: appointments } = await api.get<any[]>('/appointments', {
      params: {
        provider_id: providerId,
        appointment_date_gte: startDate.toISOString().split('T')[0],
      },
    });

    const dayOfWeekCounts: { [key: string]: number } = {
      Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0
    };

    const typeCounts: { [key: string]: number } = {};
    const dateCounts: { [key: string]: number } = {};
    let totalDuration = 0;
    let noShows = 0;

    appointments?.forEach(apt => {
      const date = new Date(apt.appointment_date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      dayOfWeekCounts[dayName]++;

      typeCounts[apt.appointment_type] = (typeCounts[apt.appointment_type] || 0) + 1;

      const dateKey = apt.appointment_date;
      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;

      if (apt.status === 'no-show') noShows++;
      if (apt.duration_minutes) totalDuration += apt.duration_minutes;
    });

    const byDayOfWeek = Object.entries(dayOfWeekCounts).map(([day, count]) => ({ day, count }));

    const total = appointments?.length || 1;
    const byType = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100)
    }));

    const trends = Object.entries(dateCounts)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, appointments]) => ({ date, appointments }));

    const { data: messages } = await api.get<any[]>('/secure-messages', {
      params: {
        provider_id: providerId,
        updated_at_not_null: true,
        created_at_gte: startDate.toISOString(),
        select: 'created_at,updated_at',
      },
    });

    let totalResponseTime = 0;
    messages?.forEach(msg => {
      const responseMinutes = Math.floor((new Date(msg.updated_at).getTime() - new Date(msg.created_at).getTime()) / 60000);
      totalResponseTime += responseMinutes;
    });

    const { data: prescriptions } = await api.get<any[]>('/prescriptions', {
      params: {
        provider_id: providerId,
        issued_date_not_null: true,
        created_at_gte: startDate.toISOString(),
        select: 'created_at,issued_date',
      },
    });

    let totalPrescriptionTime = 0;
    prescriptions?.forEach(rx => {
      const turnaroundMinutes = Math.floor((new Date(rx.issued_date).getTime() - new Date(rx.created_at).getTime()) / 60000);
      totalPrescriptionTime += turnaroundMinutes;
    });

    return {
      byDayOfWeek,
      byType,
      trends,
      noShowRate: total > 0 ? Math.round((noShows / total) * 100) : 0,
      avgDuration: total > 0 ? Math.round(totalDuration / total) : 0,
      avgResponseTime: messages && messages.length > 0 ? Math.round(totalResponseTime / messages.length) : 0,
      avgPrescriptionTurnaround: prescriptions && prescriptions.length > 0 ? Math.round(totalPrescriptionTime / prescriptions.length) : 0,
    };
  },

  async getFinancialMetrics(providerId: string, days: number = 30): Promise<FinancialMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: transactions } = await api.get<any[]>('/billing-transactions', {
      params: {
        provider_id: providerId,
        transaction_date_gte: startDate.toISOString().split('T')[0],
        status: 'completed',
      },
    });

    const serviceRevenue: { [key: string]: number } = {};
    let insuranceTotal = 0;
    let selfPayTotal = 0;

    transactions?.forEach(txn => {
      const service = txn.service_type || 'other';
      serviceRevenue[service] = (serviceRevenue[service] || 0) + txn.total_cents;

      if (txn.insurance_policy_id) {
        insuranceTotal += txn.total_cents;
      } else {
        selfPayTotal += txn.total_cents;
      }
    });

    const totalRevenue = insuranceTotal + selfPayTotal || 1;

    const revenueByService = Object.entries(serviceRevenue).map(([service, amount]) => ({
      service,
      amount: amount / 100,
      percentage: Math.round((amount / totalRevenue) * 100)
    }));

    const insuranceVsSelfPay = [
      { type: 'Insurance', amount: insuranceTotal / 100, percentage: Math.round((insuranceTotal / totalRevenue) * 100) },
      { type: 'Self-Pay', amount: selfPayTotal / 100, percentage: Math.round((selfPayTotal / totalRevenue) * 100) }
    ];

    const { data: outstanding } = await api.get<any[]>('/billing-transactions', {
      params: {
        provider_id: providerId,
        status: 'pending',
        select: 'total_cents',
      },
    });

    const outstandingPayments = {
      amount: (outstanding?.reduce((sum, t) => sum + t.total_cents, 0) || 0) / 100,
      count: outstanding?.length || 0
    };

    const monthlyRevenue: { [key: string]: number } = {};
    transactions?.forEach(txn => {
      const month = new Date(txn.transaction_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + txn.total_cents;
    });

    const monthlyEntries = Object.entries(monthlyRevenue).sort(([a], [b]) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const monthlyComparison = monthlyEntries.map(([month, revenue], index) => {
      const previousRevenue = index > 0 ? monthlyEntries[index - 1][1] : revenue;
      const change = previousRevenue > 0 ? Math.round(((revenue - previousRevenue) / previousRevenue) * 100) : 0;
      return {
        month,
        revenue: revenue / 100,
        change
      };
    });

    const { data: earningsData } = await api.get<any[]>('/billing-transactions', {
      params: {
        provider_id: providerId,
        transaction_date_gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'completed',
        select: 'transaction_date,total_cents',
        order_by: 'transaction_date:asc',
      },
    });

    const earningsByPeriod: { [key: string]: number } = {};
    earningsData?.forEach(txn => {
      const period = txn.transaction_date;
      earningsByPeriod[period] = (earningsByPeriod[period] || 0) + txn.total_cents;
    });

    const earningsTrend = Object.entries(earningsByPeriod).map(([period, amount]) => ({
      period,
      amount: amount / 100
    }));

    return {
      revenueByService,
      insuranceVsSelfPay,
      outstandingPayments,
      monthlyComparison,
      earningsTrend
    };
  },

  async getPatientInsights(providerId: string, days: number = 30): Promise<PatientInsights> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: appointments } = await api.get<any[]>('/appointments', {
      params: {
        provider_id: providerId,
        appointment_date_gte: startDate.toISOString().split('T')[0],
        include: 'patients,user_profiles',
      },
    });

    const patientIds = new Set();
    const newPatients = new Set();
    const complaints: { [key: string]: number } = {};
    const ageGroups: { [key: string]: number } = {
      '0-17': 0,
      '18-34': 0,
      '35-54': 0,
      '55-74': 0,
      '75+': 0
    };

    appointments?.forEach(apt => {
      const patientId = apt.patient_id;
      if (!patientIds.has(patientId)) {
        patientIds.add(patientId);

        const previousAppointments = appointments.filter(a =>
          a.patient_id === patientId &&
          new Date(a.appointment_date) < new Date(apt.appointment_date)
        );

        if (previousAppointments.length === 0) {
          newPatients.add(patientId);
        }
      }

      if (apt.chief_complaint) {
        complaints[apt.chief_complaint] = (complaints[apt.chief_complaint] || 0) + 1;
      }

      if (apt.patients?.user_profiles?.date_of_birth) {
        const age = new Date().getFullYear() - new Date(apt.patients.user_profiles.date_of_birth).getFullYear();
        if (age < 18) ageGroups['0-17']++;
        else if (age < 35) ageGroups['18-34']++;
        else if (age < 55) ageGroups['35-54']++;
        else if (age < 75) ageGroups['55-74']++;
        else ageGroups['75+']++;
      }
    });

    const totalPatients = patientIds.size || 1;
    const newPatientCount = newPatients.size;
    const returningPatientCount = totalPatients - newPatientCount;

    const newVsReturning = [
      { type: 'New', count: newPatientCount, percentage: Math.round((newPatientCount / totalPatients) * 100) },
      { type: 'Returning', count: returningPatientCount, percentage: Math.round((returningPatientCount / totalPatients) * 100) }
    ];

    const demographics = Object.entries(ageGroups).map(([ageGroup, count]) => ({ ageGroup, count }));

    const commonComplaints = Object.entries(complaints)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5)
      .map(([complaint, count]) => ({ complaint, count }));

    const { data: reviews } = await api.get<any[]>('/provider-reviews', {
      params: { provider_id: providerId, select: 'rating' },
    });

    const satisfactionScore = reviews?.length
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

    return {
      newVsReturning,
      demographics,
      commonComplaints,
      satisfactionScore
    };
  }
};
