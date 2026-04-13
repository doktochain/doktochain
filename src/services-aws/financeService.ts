import { api } from '../lib/api-client';
import { blockchainAuditService } from './blockchainAuditService';

export interface PlatformExpense {
  id: string;
  expense_category: 'server' | 'marketing' | 'staff_salaries' | 'third_party_services' | 'operational' | 'other';
  amount: number;
  currency: string;
  description: string;
  expense_date: string;
  vendor_name?: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  department?: string;
  submitted_by?: string;
  approved_by?: string;
  approval_notes?: string;
  is_recurring: boolean;
  recurrence_interval?: 'monthly' | 'quarterly' | 'yearly';
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface PlatformIncome {
  id: string;
  income_source: 'provider_commission' | 'pharmacy_commission' | 'subscription_fees' | 'premium_features' | 'other';
  amount: number;
  currency: string;
  description?: string;
  income_date: string;
  related_user_id?: string;
  related_user_type?: 'provider' | 'pharmacy' | 'patient';
  related_transaction_id?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface PlatformInvoice {
  id: string;
  invoice_number: string;
  client_id?: string;
  client_type?: 'provider' | 'pharmacy' | 'patient' | 'other';
  client_name: string;
  client_email: string;
  billing_address?: any;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_terms?: string;
  notes?: string;
  paid_amount: number;
  paid_date?: string;
  payment_method?: string;
  reminder_sent_at?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_order: number;
  metadata?: any;
  created_at: string;
}

export interface BillingConfig {
  id: string;
  config_key: string;
  user_type: 'provider' | 'pharmacy' | 'patient';
  is_active: boolean;
  billing_model: 'fixed' | 'percentage';
  fixed_amount?: number;
  percentage_rate?: number;
  minimum_charge?: number;
  maximum_charge?: number;
  billing_cycle: 'monthly' | 'weekly' | 'biweekly' | 'custom';
  payout_threshold: number;
  description?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface RefundRequest {
  id: string;
  refund_type: 'provider_refund' | 'pharmacy_refund' | 'patient_refund';
  original_transaction_id?: string;
  requester_id: string;
  requester_type: 'provider' | 'pharmacy' | 'patient' | 'admin';
  recipient_id?: string;
  recipient_type?: 'provider' | 'pharmacy' | 'patient';
  refund_amount: number;
  currency: string;
  refund_reason: 'cancelled_service' | 'quality_issue' | 'billing_error' | 'customer_request' | 'other';
  detailed_reason?: string;
  supporting_documents?: any[];
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  reviewed_by?: string;
  review_notes?: string;
  reviewed_at?: string;
  processed_at?: string;
  gateway_refund_id?: string;
  failure_reason?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceTransactionLog {
  id: string;
  transaction_id?: string;
  transaction_type: 'provider_payment' | 'pharmacy_payment' | 'platform_fee' | 'refund' | 'payout' | 'adjustment';
  actor_id?: string;
  actor_type?: 'provider' | 'pharmacy' | 'patient' | 'admin' | 'system';
  target_id?: string;
  target_type?: 'provider' | 'pharmacy' | 'patient';
  amount: number;
  currency: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payment_method?: string;
  gateway_name?: string;
  gateway_transaction_id?: string;
  description?: string;
  ip_address?: string;
  user_agent?: string;
  related_entity_type?: 'appointment' | 'prescription' | 'order' | 'subscription';
  related_entity_id?: string;
  metadata?: any;
  error_message?: string;
  created_at: string;
}

export interface DeliveryCostAnalytics {
  id: string;
  period_date: string;
  pharmacy_id?: string;
  delivery_provider?: string;
  region?: string;
  total_deliveries: number;
  total_cost: number;
  average_cost: number;
  average_distance_km?: number;
  average_duration_minutes?: number;
  cost_per_km?: number;
  revenue_from_deliveries: number;
  profit_margin?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface ProviderSettlement {
  id: string;
  provider_id: string;
  amount_cents: number;
  commission_cents: number;
  net_paid_cents: number;
  payment_method: 'e-transfer' | 'cheque' | 'wire' | 'other';
  reference_number: string;
  notes: string;
  settled_by: string | null;
  settled_at: string;
  period_start: string;
  period_end: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  provider?: {
    id: string;
    user_id: string;
    user_profiles?: {
      full_name: string;
      email: string;
    };
  };
}

export interface ProviderUnsettledBalance {
  provider_id: string;
  full_name: string;
  email: string;
  business_name?: string;
  total_earned_cents: number;
  total_settled_cents: number;
  unsettled_cents: number;
  last_settlement_date: string | null;
}

export class FinanceService {
  static async getExpenses(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      status?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const params: any = {
      order: 'expense_date.desc',
      limit,
      offset,
      count: true,
    };
    if (filters?.status) params.status = filters.status;
    if (filters?.category) params.expense_category = filters.category;
    if (filters?.startDate) params.expense_date_gte = filters.startDate;
    if (filters?.endDate) params.expense_date_lte = filters.endDate;

    const { data, error } = await api.get<any>('/platform-expenses', { params });
    if (error) throw error;
    return { data: (data?.items || data) as PlatformExpense[], count: data?.count || 0 };
  }

  static async createExpense(expense: Partial<PlatformExpense>) {
    const { data, error } = await api.post<PlatformExpense>('/platform-expenses', expense);

    if (error) throw error;
    return data as PlatformExpense;
  }

  static async updateExpense(id: string, updates: Partial<PlatformExpense>) {
    const { data, error } = await api.put<PlatformExpense>(`/platform-expenses/${id}`, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data as PlatformExpense;
  }

  static async deleteExpense(id: string) {
    const { error } = await api.delete(`/platform-expenses/${id}`);

    if (error) throw error;
  }

  static async getExpenseSummary(startDate?: string, endDate?: string) {
    const params: any = { select: 'amount,status,expense_category' };
    if (startDate) params.expense_date_gte = startDate;
    if (endDate) params.expense_date_lte = endDate;

    const { data, error } = await api.get<any[]>('/platform-expenses', { params });
    if (error) throw error;

    const totalExpenses = (data || []).reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
    const approvedExpenses = (data || []).filter(e => e.status === 'approved' || e.status === 'paid')
      .reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
    const pendingExpenses = (data || []).filter(e => e.status === 'pending')
      .reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

    const byCategory = (data || []).reduce((acc: any, exp) => {
      if (!acc[exp.expense_category]) {
        acc[exp.expense_category] = 0;
      }
      acc[exp.expense_category] += parseFloat(exp.amount.toString());
      return acc;
    }, {});

    return {
      totalExpenses,
      approvedExpenses,
      pendingExpenses,
      byCategory,
    };
  }

  static async getIncome(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      source?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const params: any = {
      order: 'income_date.desc',
      limit,
      offset,
      count: true,
    };
    if (filters?.source) params.income_source = filters.source;
    if (filters?.startDate) params.income_date_gte = filters.startDate;
    if (filters?.endDate) params.income_date_lte = filters.endDate;

    const { data, error } = await api.get<any>('/platform-income', { params });
    if (error) throw error;
    return { data: (data?.items || data) as PlatformIncome[], count: data?.count || 0 };
  }

  static async createIncome(income: Partial<PlatformIncome>) {
    const { data, error } = await api.post<PlatformIncome>('/platform-income', income);

    if (error) throw error;
    return data as PlatformIncome;
  }

  static async updateIncome(id: string, updates: Partial<PlatformIncome>) {
    const { data, error } = await api.put<PlatformIncome>(`/platform-income/${id}`, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data as PlatformIncome;
  }

  static async getIncomeSummary(startDate?: string, endDate?: string) {
    const params: any = { select: 'amount,income_source' };
    if (startDate) params.income_date_gte = startDate;
    if (endDate) params.income_date_lte = endDate;

    const { data, error } = await api.get<any[]>('/platform-income', { params });
    if (error) throw error;

    const totalIncome = (data || []).reduce((sum, inc) => sum + parseFloat(inc.amount.toString()), 0);

    const bySource = (data || []).reduce((acc: any, inc) => {
      if (!acc[inc.income_source]) {
        acc[inc.income_source] = 0;
      }
      acc[inc.income_source] += parseFloat(inc.amount.toString());
      return acc;
    }, {});

    return {
      totalIncome,
      bySource,
    };
  }

  static async getInvoices(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      status?: string;
      clientType?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const params: any = {
      order: 'invoice_date.desc',
      limit,
      offset,
      count: true,
    };
    if (filters?.status) params.status = filters.status;
    if (filters?.clientType) params.client_type = filters.clientType;
    if (filters?.startDate) params.invoice_date_gte = filters.startDate;
    if (filters?.endDate) params.invoice_date_lte = filters.endDate;

    const { data, error } = await api.get<any>('/platform-invoices', { params });
    if (error) throw error;
    return { data: (data?.items || data) as PlatformInvoice[], count: data?.count || 0 };
  }

  static async getInvoiceById(id: string) {
    const { data, error } = await api.get<PlatformInvoice>(`/platform-invoices/${id}`);

    if (error) throw error;
    return data as PlatformInvoice;
  }

  static async createInvoice(invoice: Partial<PlatformInvoice>) {
    const { data, error } = await api.post<PlatformInvoice>('/platform-invoices', invoice);

    if (error) throw error;
    return data as PlatformInvoice;
  }

  static async updateInvoice(id: string, updates: Partial<PlatformInvoice>) {
    const { data, error } = await api.put<PlatformInvoice>(`/platform-invoices/${id}`, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data as PlatformInvoice;
  }

  static async deleteInvoice(id: string) {
    const { error } = await api.delete(`/platform-invoices/${id}`);

    if (error) throw error;
  }

  static async generateInvoiceNumber(): Promise<string> {
    const { data } = await api.get<any>('/platform-invoices', {
      params: { order: 'created_at.desc', limit: 1, select: 'invoice_number', single: true },
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    if (data && data.invoice_number.startsWith(`INV-${year}${month}`)) {
      const lastNumber = parseInt(data.invoice_number.split('-')[2]);
      return `INV-${year}${month}-${String(lastNumber + 1).padStart(4, '0')}`;
    }

    return `INV-${year}${month}-0001`;
  }

  static async getInvoiceItems(invoiceId: string) {
    const { data, error } = await api.get<InvoiceItem[]>('/platform-invoice-items', {
      params: { invoice_id: invoiceId, order: 'item_order.asc' },
    });

    if (error) throw error;
    return data as InvoiceItem[];
  }

  static async createInvoiceItem(item: Partial<InvoiceItem>) {
    const { data, error } = await api.post<InvoiceItem>('/platform-invoice-items', item);

    if (error) throw error;
    return data as InvoiceItem;
  }

  static async updateInvoiceItem(id: string, updates: Partial<InvoiceItem>) {
    const { data, error } = await api.put<InvoiceItem>(`/platform-invoice-items/${id}`, updates);

    if (error) throw error;
    return data as InvoiceItem;
  }

  static async deleteInvoiceItem(id: string) {
    const { error } = await api.delete(`/platform-invoice-items/${id}`);

    if (error) throw error;
  }

  static async getBillingConfigs() {
    const { data, error } = await api.get<BillingConfig[]>('/platform-billing-configs', {
      params: { order: 'user_type.asc' },
    });

    if (error) throw error;
    return data as BillingConfig[];
  }

  static async getBillingConfigByKey(configKey: string) {
    const { data, error } = await api.get<BillingConfig>('/platform-billing-configs', {
      params: { config_key: configKey, single: true },
    });

    if (error) throw error;
    return data as BillingConfig;
  }

  static async updateBillingConfig(id: string, updates: Partial<BillingConfig>) {
    const { data, error } = await api.put<BillingConfig>(`/platform-billing-configs/${id}`, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data as BillingConfig;
  }

  static async calculatePlatformFee(
    userType: 'provider' | 'pharmacy' | 'patient',
    transactionAmount: number
  ): Promise<number> {
    const configKey = `${userType}_commission`;
    const config = await this.getBillingConfigByKey(configKey);

    if (!config.is_active) return 0;

    let fee = 0;
    if (config.billing_model === 'fixed') {
      fee = config.fixed_amount || 0;
    } else {
      fee = (transactionAmount * (config.percentage_rate || 0)) / 100;
    }

    if (config.minimum_charge && fee < config.minimum_charge) {
      fee = config.minimum_charge;
    }
    if (config.maximum_charge && fee > config.maximum_charge) {
      fee = config.maximum_charge;
    }

    return fee;
  }

  static async getPatientBookingFeeConfig(): Promise<BillingConfig | null> {
    try {
      const config = await this.getBillingConfigByKey('patient_booking_fee');
      return config;
    } catch (error) {
      console.error('Error fetching patient booking fee config:', error);
      return null;
    }
  }

  static async isBookingFeeActive(): Promise<boolean> {
    const config = await this.getPatientBookingFeeConfig();
    return config ? config.is_active : false;
  }

  static async getBookingFeeAmount(): Promise<number> {
    const config = await this.getPatientBookingFeeConfig();
    if (!config || !config.is_active) return 0;
    return config.fixed_amount || 0;
  }

  static async getRefundRequests(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      status?: string;
      type?: string;
    }
  ) {
    const params: any = {
      order: 'created_at.desc',
      limit,
      offset,
      count: true,
    };
    if (filters?.status) params.status = filters.status;
    if (filters?.type) params.refund_type = filters.type;

    const { data, error } = await api.get<any>('/refund-requests', { params });
    if (error) throw error;
    return { data: (data?.items || data) as RefundRequest[], count: data?.count || 0 };
  }

  static async createRefundRequest(refund: Partial<RefundRequest>) {
    const { data, error } = await api.post<RefundRequest>('/refund-requests', refund);

    if (error) throw error;
    return data as RefundRequest;
  }

  static async updateRefundRequest(id: string, updates: Partial<RefundRequest>) {
    const { data, error } = await api.put<RefundRequest>(`/refund-requests/${id}`, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data as RefundRequest;
  }

  static async approveRefund(id: string, reviewerId: string, notes?: string) {
    return this.updateRefundRequest(id, {
      status: 'approved',
      reviewed_by: reviewerId,
      review_notes: notes,
      reviewed_at: new Date().toISOString(),
    });
  }

  static async rejectRefund(id: string, reviewerId: string, notes: string) {
    return this.updateRefundRequest(id, {
      status: 'rejected',
      reviewed_by: reviewerId,
      review_notes: notes,
      reviewed_at: new Date().toISOString(),
    });
  }

  static async getTransactionLogs(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      type?: string;
      status?: string;
      actorId?: string;
      targetId?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const params: any = {
      order: 'created_at.desc',
      limit,
      offset,
      count: true,
    };
    if (filters?.type) params.transaction_type = filters.type;
    if (filters?.status) params.status = filters.status;
    if (filters?.actorId) params.actor_id = filters.actorId;
    if (filters?.targetId) params.target_id = filters.targetId;
    if (filters?.startDate) params.created_at_gte = filters.startDate;
    if (filters?.endDate) params.created_at_lte = filters.endDate;

    const { data, error } = await api.get<any>('/marketplace-transaction-logs', { params });
    if (error) throw error;
    return { data: (data?.items || data) as MarketplaceTransactionLog[], count: data?.count || 0 };
  }

  static async createTransactionLog(log: Partial<MarketplaceTransactionLog>) {
    const { data, error } = await api.post<MarketplaceTransactionLog>('/marketplace-transaction-logs', log);

    if (error) throw error;
    return data as MarketplaceTransactionLog;
  }

  static async getDeliveryAnalytics(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      pharmacyId?: string;
      provider?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const params: any = {
      order: 'period_date.desc',
      limit,
      offset,
      count: true,
    };
    if (filters?.pharmacyId) params.pharmacy_id = filters.pharmacyId;
    if (filters?.provider) params.delivery_provider = filters.provider;
    if (filters?.startDate) params.period_date_gte = filters.startDate;
    if (filters?.endDate) params.period_date_lte = filters.endDate;

    const { data, error } = await api.get<any>('/delivery-cost-analytics', { params });
    if (error) throw error;
    return { data: (data?.items || data) as DeliveryCostAnalytics[], count: data?.count || 0 };
  }

  static async createOrUpdateDeliveryAnalytics(analytics: Partial<DeliveryCostAnalytics>) {
    const { data, error } = await api.post<DeliveryCostAnalytics>('/delivery-cost-analytics', {
      ...analytics,
      _upsert: true,
    });

    if (error) throw error;
    return data as DeliveryCostAnalytics;
  }

  static async getDeliveryAnalyticsSummary(startDate?: string, endDate?: string) {
    const params: any = { select: 'total_deliveries,total_cost,revenue_from_deliveries,delivery_provider' };
    if (startDate) params.period_date_gte = startDate;
    if (endDate) params.period_date_lte = endDate;

    const { data, error } = await api.get<any[]>('/delivery-cost-analytics', { params });
    if (error) throw error;

    const totalDeliveries = (data || []).reduce((sum, d) => sum + d.total_deliveries, 0);
    const totalCost = (data || []).reduce((sum, d) => sum + parseFloat(d.total_cost.toString()), 0);
    const totalRevenue = (data || []).reduce((sum, d) => sum + parseFloat(d.revenue_from_deliveries.toString()), 0);
    const netProfit = totalRevenue - totalCost;

    const byProvider = (data || []).reduce((acc: any, d) => {
      if (!d.delivery_provider) return acc;
      if (!acc[d.delivery_provider]) {
        acc[d.delivery_provider] = {
          deliveries: 0,
          cost: 0,
          revenue: 0,
        };
      }
      acc[d.delivery_provider].deliveries += d.total_deliveries;
      acc[d.delivery_provider].cost += parseFloat(d.total_cost.toString());
      acc[d.delivery_provider].revenue += parseFloat(d.revenue_from_deliveries.toString());
      return acc;
    }, {});

    return {
      totalDeliveries,
      totalCost,
      totalRevenue,
      netProfit,
      byProvider,
    };
  }

  static async getSettlements(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      providerId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const params: any = {
      order: 'settled_at.desc',
      limit,
      offset,
      count: true,
      include: 'provider',
    };
    if (filters?.providerId) params.provider_id = filters.providerId;
    if (filters?.status) params.status = filters.status;
    if (filters?.startDate) params.settled_at_gte = filters.startDate;
    if (filters?.endDate) params.settled_at_lte = filters.endDate;

    const { data, error } = await api.get<any>('/provider-settlements', { params });
    if (error) throw error;
    return { data: (data?.items || data) as ProviderSettlement[], count: data?.count || 0 };
  }

  static async getProviderUnsettledBalances(): Promise<ProviderUnsettledBalance[]> {
    const { data: providers, error: provError } = await api.get<any[]>('/providers', {
      params: { is_active: true, include: 'user_profiles' },
    });

    if (provError) throw provError;
    if (!providers || providers.length === 0) return [];

    const balances: ProviderUnsettledBalance[] = [];

    for (const provider of providers) {
      const { data: transactions } = await api.get<any[]>('/provider-transactions', {
        params: {
          provider_id: provider.id,
          transaction_type: 'payment',
          status: 'completed',
          select: 'amount',
        },
      });

      const totalEarned = (transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount), 0
      );

      const { data: settlements } = await api.get<any[]>('/provider-settlements', {
        params: {
          provider_id: provider.id,
          status: 'completed',
          order: 'settled_at.desc',
          select: 'net_paid_cents,settled_at',
        },
      });

      const totalSettled = (settlements || []).reduce(
        (sum: number, s: any) => sum + Number(s.net_paid_cents), 0
      );

      const totalEarnedCents = Math.round(totalEarned * 100);
      const unsettled = totalEarnedCents - totalSettled;
      const profile = provider.user_profiles as any;

      balances.push({
        provider_id: provider.id,
        full_name: profile?.full_name || '',
        email: profile?.email || '',
        total_earned_cents: totalEarnedCents,
        total_settled_cents: totalSettled,
        unsettled_cents: unsettled,
        last_settlement_date: settlements?.[0]?.settled_at || null,
      });
    }

    return balances.sort((a, b) => b.unsettled_cents - a.unsettled_cents);
  }

  static async createSettlement(settlement: {
    provider_id: string;
    amount_cents: number;
    commission_cents: number;
    net_paid_cents: number;
    payment_method: string;
    reference_number: string;
    notes?: string;
    settled_by: string;
    period_start: string;
    period_end: string;
  }) {
    const { data, error } = await api.post<any>('/provider-settlements', {
      ...settlement,
      status: 'completed',
      settled_at: new Date().toISOString(),
    });

    if (error) throw error;

    const providerUserId = (data as any)?.provider?.user_id;
    if (providerUserId) {
      await api.post('/notifications', {
        user_id: providerUserId,
        title: 'Settlement Processed',
        message: `A settlement of $${(settlement.net_paid_cents / 100).toFixed(2)} has been processed via ${settlement.payment_method}. Reference: ${settlement.reference_number}`,
        notification_type: 'billing',
        is_read: false,
      });
    }

    try {
      await blockchainAuditService.logEvent({
        eventType: 'admin_settlement_created',
        resourceType: 'provider_settlement',
        resourceId: data.id,
        actorId: settlement.settled_by,
        actorRole: 'admin',
        actionData: {
          provider_id: settlement.provider_id,
          amount_cents: settlement.amount_cents,
          net_paid_cents: settlement.net_paid_cents,
          payment_method: settlement.payment_method,
          reference_number: settlement.reference_number,
        },
      });
    } catch {}

    return data as ProviderSettlement;
  }

  static async getProviderSettlementHistory(providerId: string) {
    const { data, error } = await api.get<ProviderSettlement[]>('/provider-settlements', {
      params: { provider_id: providerId, status: 'completed', order: 'settled_at.desc' },
    });

    if (error) throw error;
    return data as ProviderSettlement[];
  }
}
