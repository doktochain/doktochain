import { api } from '../lib/api-client';

export interface PaymentGatewayConfig {
  id: string;
  provider_id: string;
  gateway_type: 'stripe' | 'square' | 'paypal' | 'moneris';
  is_live_mode: boolean;
  webhook_url?: string;
  stripe_publishable_key?: string;
  square_location_id?: string;
  paypal_client_id?: string;
  paypal_currency?: string;
  moneris_store_id?: string;
  moneris_supports_interac?: boolean;
  auto_capture: boolean;
  refund_policy: any;
  fee_structure?: any;
  payout_schedule: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderPayout {
  id: string;
  provider_id: string;
  gateway_type: string;
  amount_gross: number;
  processing_fees: number;
  amount_net: number;
  currency: string;
  bank_account_last4?: string;
  payout_method: string;
  scheduled_date: string;
  completed_date?: string;
  status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  failure_reason?: string;
  t4a_issued: boolean;
  created_at: string;
}

export interface InsuranceClaim {
  id: string;
  provider_id: string;
  patient_id: string;
  appointment_id?: string;
  claim_number?: string;
  claim_type: 'direct_billing' | 'patient_reimbursement' | 'third_party';
  insurance_company: string;
  insurance_plan_number?: string;
  provincial_health_number?: string;
  province?: string;
  billing_portal?: string;
  service_date: string;
  billing_codes: any;
  diagnosis_codes?: any;
  total_amount: number;
  status: 'draft' | 'submitted' | 'pending' | 'approved' | 'paid' | 'rejected' | 'resubmitted';
  submitted_date?: string;
  approved_amount?: number;
  paid_amount?: number;
  rejection_reason?: string;
  remittance_advice_url?: string;
  notes?: string;
  created_at: string;
}

export interface BillingCode {
  id: string;
  code: string;
  code_type: 'procedure' | 'diagnostic' | 'modifier';
  description: string;
  province?: string;
  base_fee?: number;
  specialty?: string;
  category?: string;
  is_common: boolean;
  requires_prior_auth: boolean;
}

export interface ProviderTransaction {
  id: string;
  provider_id: string;
  patient_id?: string;
  appointment_id?: string;
  transaction_type: 'charge' | 'payment' | 'refund' | 'adjustment' | 'fee' | 'payout';
  amount: number;
  currency: string;
  payment_method?: string;
  payment_gateway?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  service_type?: string;
  billing_code?: string;
  transaction_date: string;
  created_at: string;
}

export interface PatientStatement {
  id: string;
  provider_id: string;
  patient_id: string;
  statement_number: string;
  statement_date: string;
  period_start: string;
  period_end: string;
  previous_balance: number;
  new_charges: number;
  payments_received: number;
  adjustments: number;
  current_balance: number;
  line_items: any;
  sent_via?: 'email' | 'postal' | 'portal';
  sent_date?: string;
  is_overdue: boolean;
  days_overdue: number;
  in_collections: boolean;
}

class ProviderBillingService {
  async getGatewayConfigs(providerId: string) {
    const { data, error } = await api.get<PaymentGatewayConfig[]>('/payment-gateway-configs', {
      params: { provider_id: providerId, order_by: 'created_at:desc' },
    });

    return { data, error };
  }

  async getGatewayConfig(providerId: string, gatewayType: string) {
    const { data, error } = await api.get<PaymentGatewayConfig[]>('/payment-gateway-configs', {
      params: { provider_id: providerId, gateway_type: gatewayType },
    });

    return { data: data && data.length > 0 ? data[0] : null, error };
  }

  async saveGatewayConfig(config: Partial<PaymentGatewayConfig>) {
    const { data, error } = await api.put<PaymentGatewayConfig>('/payment-gateway-configs', config);

    return { data, error };
  }

  async toggleGatewayStatus(configId: string, isActive: boolean) {
    const { data, error } = await api.put<PaymentGatewayConfig>(`/payment-gateway-configs/${configId}`, {
      is_active: isActive,
      updated_at: new Date().toISOString(),
    });

    return { data, error };
  }

  async getPayouts(providerId: string, filters?: { status?: string; from?: string; to?: string }) {
    const params: Record<string, any> = { provider_id: providerId, order_by: 'scheduled_date:desc' };

    if (filters?.status) {
      params.status = filters.status;
    }

    if (filters?.from) {
      params.scheduled_date_gte = filters.from;
    }

    if (filters?.to) {
      params.scheduled_date_lte = filters.to;
    }

    const { data, error } = await api.get<ProviderPayout[]>('/provider-payouts', { params });

    return { data, error };
  }

  async getPayoutStats(providerId: string, period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    const startDate = new Date();

    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const { data, error } = await api.get<any[]>('/provider-payouts', {
      params: {
        provider_id: providerId,
        scheduled_date_gte: startDate.toISOString().split('T')[0],
        select: 'amount_gross,processing_fees,amount_net,status',
      },
    });

    return { data, error };
  }

  async getClaims(providerId: string, filters?: { status?: string; from?: string; to?: string }) {
    const params: Record<string, any> = {
      provider_id: providerId,
      include: 'patients,user_profiles',
      order_by: 'service_date:desc',
    };

    if (filters?.status) {
      params.status = filters.status;
    }

    if (filters?.from) {
      params.service_date_gte = filters.from;
    }

    if (filters?.to) {
      params.service_date_lte = filters.to;
    }

    const { data, error } = await api.get<InsuranceClaim[]>('/insurance-claims', { params });

    return { data, error };
  }

  async getClaimById(claimId: string) {
    const { data, error } = await api.get<InsuranceClaim>(`/insurance-claims/${claimId}`, {
      params: { include: 'patients,user_profiles' },
    });

    return { data, error };
  }

  async createClaim(claim: Partial<InsuranceClaim>) {
    const { data, error } = await api.post<InsuranceClaim>('/insurance-claims', claim);

    return { data, error };
  }

  async updateClaim(claimId: string, updates: Partial<InsuranceClaim>) {
    const { data, error } = await api.put<InsuranceClaim>(`/insurance-claims/${claimId}`, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    return { data, error };
  }

  async submitClaim(claimId: string) {
    const { data, error } = await api.put<InsuranceClaim>(`/insurance-claims/${claimId}`, {
      status: 'submitted',
      submitted_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { data, error };
  }

  async searchBillingCodes(search: string, filters?: { province?: string; specialty?: string; type?: string }) {
    const params: Record<string, any> = {
      order_by: 'is_common:desc,code:asc',
      limit: 50,
    };

    if (search) {
      params.search = search;
    }

    if (filters?.province) {
      params.province = filters.province;
    }

    if (filters?.specialty) {
      params.specialty = filters.specialty;
    }

    if (filters?.type) {
      params.code_type = filters.type;
    }

    const { data, error } = await api.get<BillingCode[]>('/billing-codes-library', { params });

    return { data, error };
  }

  async getFavoriteCodes(providerId: string) {
    const { data, error } = await api.get<any[]>('/provider-favorite-codes', {
      params: { provider_id: providerId, include: 'billing_code', order_by: 'usage_count:desc' },
    });

    return { data, error };
  }

  async toggleFavoriteCode(providerId: string, billingCodeId: string) {
    const { data: existingList } = await api.get<any[]>('/provider-favorite-codes', {
      params: { provider_id: providerId, billing_code_id: billingCodeId, select: 'id' },
    });

    const existing = existingList && existingList.length > 0 ? existingList[0] : null;

    if (existing) {
      const { error } = await api.delete(`/provider-favorite-codes/${existing.id}`);

      return { data: null, error };
    } else {
      const { data, error } = await api.post<any>('/provider-favorite-codes', {
        provider_id: providerId,
        billing_code_id: billingCodeId,
      });

      return { data, error };
    }
  }

  async getTransactions(providerId: string, filters?: {
    type?: string;
    from?: string;
    to?: string;
    patientId?: string;
  }) {
    const params: Record<string, any> = {
      provider_id: providerId,
      include: 'patients,user_profiles',
      order_by: 'transaction_date:desc',
    };

    if (filters?.type) {
      params.transaction_type = filters.type;
    }

    if (filters?.from) {
      params.transaction_date_gte = filters.from;
    }

    if (filters?.to) {
      params.transaction_date_lte = filters.to;
    }

    if (filters?.patientId) {
      params.patient_id = filters.patientId;
    }

    const { data, error } = await api.get<ProviderTransaction[]>('/provider-transactions', { params });

    return { data, error };
  }

  async getRevenueStats(providerId: string, period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    const startDate = new Date();

    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const { data, error } = await api.get<any[]>('/provider-transactions', {
      params: {
        provider_id: providerId,
        status: 'completed',
        transaction_date_gte: startDate.toISOString(),
        select: 'transaction_type,amount,payment_method',
      },
    });

    return { data, error };
  }

  async createTransaction(transaction: Partial<ProviderTransaction>) {
    const { data, error } = await api.post<ProviderTransaction>('/provider-transactions', transaction);

    return { data, error };
  }

  async getPatientStatements(providerId: string, filters?: {
    patientId?: string;
    overdue?: boolean;
    from?: string;
    to?: string;
  }) {
    const params: Record<string, any> = {
      provider_id: providerId,
      include: 'patients,user_profiles',
      order_by: 'statement_date:desc',
    };

    if (filters?.patientId) {
      params.patient_id = filters.patientId;
    }

    if (filters?.overdue) {
      params.is_overdue = true;
    }

    if (filters?.from) {
      params.statement_date_gte = filters.from;
    }

    if (filters?.to) {
      params.statement_date_lte = filters.to;
    }

    const { data, error } = await api.get<PatientStatement[]>('/patient-billing-statements', { params });

    return { data, error };
  }

  async generateStatement(statement: Partial<PatientStatement>) {
    const { data, error } = await api.post<PatientStatement>('/patient-billing-statements', statement);

    return { data, error };
  }

  async sendStatement(statementId: string, method: 'email' | 'postal' | 'portal') {
    const { data, error } = await api.put<PatientStatement>(`/patient-billing-statements/${statementId}`, {
      sent_via: method,
      sent_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { data, error };
  }

  async markAsCollections(statementId: string) {
    const { data, error } = await api.put<PatientStatement>(`/patient-billing-statements/${statementId}`, {
      in_collections: true,
      collections_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    });

    return { data, error };
  }
}

export const providerBillingService = new ProviderBillingService();
