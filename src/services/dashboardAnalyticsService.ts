import { supabase } from '../lib/supabase';

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
  let query = supabase
    .from('dashboard_analytics')
    .select('*')
    .order('date', { ascending: false });

  if (startDate) {
    query = query.gte('date', startDate);
  }

  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as DashboardAnalytics[];
};

export const getLatestAnalytics = async () => {
  const { data, error } = await supabase
    .from('dashboard_analytics')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as DashboardAnalytics | null;
};

export const getFinancialTransactions = async (
  limit = 50,
  offset = 0,
  status?: string,
  transactionType?: string
) => {
  let query = supabase
    .from('financial_transactions')
    .select('*, user_profiles(first_name, last_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (transactionType) {
    query = query.eq('transaction_type', transactionType);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as FinancialTransaction[], count: count || 0 };
};

export const getTransactionsSummary = async (startDate?: string, endDate?: string) => {
  let query = supabase.from('financial_transactions').select('amount, transaction_type, status');

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;

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
  let query = supabase
    .from('sales_metrics')
    .select('*')
    .order('period_start', { ascending: false });

  if (periodType) {
    query = query.eq('period_type', periodType);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as SalesMetric[];
};

export const getLatestSalesMetrics = async (periodType = 'monthly') => {
  const { data, error } = await supabase
    .from('sales_metrics')
    .select('*')
    .eq('period_type', periodType)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as SalesMetric | null;
};

export const getRevenueByPeriod = async (periodType: 'day' | 'week' | 'month' | 'year' = 'month') => {
  const { data, error } = await supabase
    .from('dashboard_analytics')
    .select('date, total_revenue')
    .order('date', { ascending: true });

  if (error) throw error;
  return data;
};

export const getTransactionsByPaymentMethod = async () => {
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('payment_method, amount')
    .eq('status', 'completed');

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

