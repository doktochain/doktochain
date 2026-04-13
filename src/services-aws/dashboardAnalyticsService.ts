import { api } from '../lib/api-client';

export interface DashboardAnalytics {
  id: string;
  date: string;
  total_revenue: number;
  total_appointments: number;
  total_users: number;
  active_users: number;
  total_providers: number;
  conversion_rate: number;
  avg_session_duration: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialTransaction {
  id: string;
  transaction_type: 'payment' | 'refund' | 'withdrawal' | 'transfer' | 'fee' | 'bonus';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  user_id?: string;
  provider_id?: string;
  pharmacy_id?: string;
  appointment_id?: string;
  payment_method?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface SalesMetric {
  id: string;
  period_start: string;
  period_end: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  total_sales: number;
  total_transactions: number;
  conversion_rate: number;
  average_order_value: number;
  customer_acquisition_cost: number;
  customer_lifetime_value: number;
  new_customers: number;
  returning_customers: number;
  revenue_by_category?: any;
  created_at: string;
  updated_at: string;
}

export interface SystemMetric {
  id: string;
  metric_type: string;
  value: number;
  unit?: string;
  status: 'healthy' | 'warning' | 'critical';
  metadata?: any;
  timestamp: string;
}

export const getDashboardAnalytics = async (startDate?: string, endDate?: string) => {
  const params: any = { order: 'date.desc' };
  if (startDate) params.date_gte = startDate;
  if (endDate) params.date_lte = endDate;

  const { data, error } = await api.get<DashboardAnalytics[]>('/dashboard-analytics', { params });

  if (error) throw error;
  return data as DashboardAnalytics[];
};

export const getLatestAnalytics = async () => {
  const { data, error } = await api.get<DashboardAnalytics>('/dashboard-analytics', {
    params: { order: 'date.desc', limit: 1, single: true },
  });

  if (error) throw error;
  return data as DashboardAnalytics | null;
};

export const getFinancialTransactions = async (
  limit = 50,
  offset = 0,
  status?: string,
  transactionType?: string
) => {
  const params: any = {
    order: 'created_at.desc',
    limit,
    offset,
    count: true,
  };

  if (status) params.status = status;
  if (transactionType) params.transaction_type = transactionType;

  const { data, error } = await api.get<any>('/financial-transactions', { params });

  if (error) throw error;
  return { data: (data?.items || data) as FinancialTransaction[], count: data?.count || 0 };
};

export const getTransactionsSummary = async (startDate?: string, endDate?: string) => {
  const params: any = { select: 'amount,transaction_type,status' };
  if (startDate) params.created_at_gte = startDate;
  if (endDate) params.created_at_lte = endDate;

  const { data, error } = await api.get<any[]>('/financial-transactions', { params });

  if (error) throw error;

  const summary = {
    totalRevenue: 0,
    totalRefunds: 0,
    totalTransactions: data?.length || 0,
    pendingAmount: 0,
    completedAmount: 0,
  };

  data?.forEach((transaction) => {
    if (transaction.status === 'completed') {
      summary.completedAmount += transaction.amount;
      if (transaction.transaction_type === 'payment') {
        summary.totalRevenue += transaction.amount;
      } else if (transaction.transaction_type === 'refund') {
        summary.totalRefunds += transaction.amount;
      }
    } else if (transaction.status === 'pending') {
      summary.pendingAmount += transaction.amount;
    }
  });

  return summary;
};

export const getSalesMetrics = async (periodType?: string) => {
  const params: any = { order: 'period_start.desc' };
  if (periodType) params.period_type = periodType;

  const { data, error } = await api.get<SalesMetric[]>('/sales-metrics', { params });

  if (error) throw error;
  return data as SalesMetric[];
};

export const getLatestSalesMetrics = async (periodType = 'monthly') => {
  const { data, error } = await api.get<SalesMetric>('/sales-metrics', {
    params: { period_type: periodType, order: 'period_start.desc', limit: 1, single: true },
  });

  if (error) throw error;
  return data as SalesMetric | null;
};

export const getRevenueByPeriod = async (periodType: 'day' | 'week' | 'month' | 'year' = 'month') => {
  const { data, error } = await api.get<any[]>('/dashboard-analytics', {
    params: { select: 'date,total_revenue', order: 'date.asc' },
  });

  if (error) throw error;
  return data;
};

export const getTransactionsByPaymentMethod = async () => {
  const { data, error } = await api.get<any[]>('/financial-transactions', {
    params: { status: 'completed', select: 'payment_method,amount' },
  });

  if (error) throw error;

  const summary: { [key: string]: { count: number; total: number } } = {};

  data?.forEach((transaction) => {
    const method = transaction.payment_method || 'unknown';
    if (!summary[method]) {
      summary[method] = { count: 0, total: 0 };
    }
    summary[method].count++;
    summary[method].total += transaction.amount;
  });

  return Object.entries(summary).map(([method, stats]) => ({
    method,
    ...stats,
  }));
};
