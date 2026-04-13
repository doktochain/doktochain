import { supabase } from '../lib/supabase';

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
  // Payment Gateway Configuration
  async getGatewayConfigs(providerId: string) {
    const { data, error } = await supabase
      .from('payment_gateway_configs')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  async getGatewayConfig(providerId: string, gatewayType: string) {
    const { data, error } = await supabase
      .from('payment_gateway_configs')
      .select('*')
      .eq('provider_id', providerId)
      .eq('gateway_type', gatewayType)
      .maybeSingle();

    return { data, error };
  }

  async saveGatewayConfig(config: Partial<PaymentGatewayConfig>) {
    const { data, error } = await supabase
      .from('payment_gateway_configs')
      .upsert(config)
      .select()
      .single();

    return { data, error };
  }

  async toggleGatewayStatus(configId: string, isActive: boolean) {
    const { data, error } = await supabase
      .from('payment_gateway_configs')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', configId)
      .select()
      .single();

    return { data, error };
  }

  // Provider Payouts
  async getPayouts(providerId: string, filters?: { status?: string; from?: string; to?: string }) {
    let query = supabase
      .from('provider_payouts')
      .select('*')
      .eq('provider_id', providerId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.from) {
      query = query.gte('scheduled_date', filters.from);
    }

    if (filters?.to) {
      query = query.lte('scheduled_date', filters.to);
    }

    const { data, error } = await query.order('scheduled_date', { ascending: false });

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

    const { data, error } = await supabase
      .from('provider_payouts')
      .select('amount_gross, processing_fees, amount_net, status')
      .eq('provider_id', providerId)
      .gte('scheduled_date', startDate.toISOString().split('T')[0]);

    return { data, error };
  }

  // Insurance Claims
  async getClaims(providerId: string, filters?: { status?: string; from?: string; to?: string }) {
    let query = supabase
      .from('insurance_claims')
      .select('*, patients:patient_id(id, user_id, user_profiles:user_id(full_name, email))')
      .eq('provider_id', providerId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.from) {
      query = query.gte('service_date', filters.from);
    }

    if (filters?.to) {
      query = query.lte('service_date', filters.to);
    }

    const { data, error } = await query.order('service_date', { ascending: false });

    return { data, error };
  }

  async getClaimById(claimId: string) {
    const { data, error } = await supabase
      .from('insurance_claims')
      .select('*, patients:patient_id(id, user_id, user_profiles:user_id(full_name, email, phone))')
      .eq('id', claimId)
      .single();

    return { data, error };
  }

  async createClaim(claim: Partial<InsuranceClaim>) {
    const { data, error } = await supabase
      .from('insurance_claims')
      .insert(claim)
      .select()
      .single();

    return { data, error };
  }

  async updateClaim(claimId: string, updates: Partial<InsuranceClaim>) {
    const { data, error } = await supabase
      .from('insurance_claims')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', claimId)
      .select()
      .single();

    return { data, error };
  }

  async submitClaim(claimId: string) {
    const { data, error } = await supabase
      .from('insurance_claims')
      .update({
        status: 'submitted',
        submitted_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .select()
      .single();

    return { data, error };
  }

  // Billing Codes
  async searchBillingCodes(search: string, filters?: { province?: string; specialty?: string; type?: string }) {
    let query = supabase
      .from('billing_codes_library')
      .select('*');

    if (search) {
      query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (filters?.province) {
      query = query.eq('province', filters.province);
    }

    if (filters?.specialty) {
      query = query.eq('specialty', filters.specialty);
    }

    if (filters?.type) {
      query = query.eq('code_type', filters.type);
    }

    const { data, error } = await query
      .order('is_common', { ascending: false })
      .order('code', { ascending: true })
      .limit(50);

    return { data, error };
  }

  async getFavoriteCodes(providerId: string) {
    const { data, error } = await supabase
      .from('provider_favorite_codes')
      .select('*, billing_code:billing_code_id(*)')
      .eq('provider_id', providerId)
      .order('usage_count', { ascending: false });

    return { data, error };
  }

  async toggleFavoriteCode(providerId: string, billingCodeId: string) {
    const { data: existing } = await supabase
      .from('provider_favorite_codes')
      .select('id')
      .eq('provider_id', providerId)
      .eq('billing_code_id', billingCodeId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('provider_favorite_codes')
        .delete()
        .eq('id', existing.id);

      return { data: null, error };
    } else {
      const { data, error } = await supabase
        .from('provider_favorite_codes')
        .insert({ provider_id: providerId, billing_code_id: billingCodeId })
        .select()
        .single();

      return { data, error };
    }
  }

  // Provider Transactions
  async getTransactions(providerId: string, filters?: {
    type?: string;
    from?: string;
    to?: string;
    patientId?: string;
  }) {
    let query = supabase
      .from('provider_transactions')
      .select('*, patient:patient_id(id, user_id, user_profiles:user_id(full_name))')
      .eq('provider_id', providerId);

    if (filters?.type) {
      query = query.eq('transaction_type', filters.type);
    }

    if (filters?.from) {
      query = query.gte('transaction_date', filters.from);
    }

    if (filters?.to) {
      query = query.lte('transaction_date', filters.to);
    }

    if (filters?.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    const { data, error } = await query.order('transaction_date', { ascending: false });

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

    const { data, error } = await supabase
      .from('provider_transactions')
      .select('transaction_type, amount, payment_method')
      .eq('provider_id', providerId)
      .eq('status', 'completed')
      .gte('transaction_date', startDate.toISOString());

    return { data, error };
  }

  async createTransaction(transaction: Partial<ProviderTransaction>) {
    const { data, error } = await supabase
      .from('provider_transactions')
      .insert(transaction)
      .select()
      .single();

    return { data, error };
  }

  // Patient Statements
  async getPatientStatements(providerId: string, filters?: {
    patientId?: string;
    overdue?: boolean;
    from?: string;
    to?: string;
  }) {
    let query = supabase
      .from('patient_billing_statements')
      .select('*, patient:patient_id(id, user_id, user_profiles:user_id(full_name, email))')
      .eq('provider_id', providerId);

    if (filters?.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    if (filters?.overdue) {
      query = query.eq('is_overdue', true);
    }

    if (filters?.from) {
      query = query.gte('statement_date', filters.from);
    }

    if (filters?.to) {
      query = query.lte('statement_date', filters.to);
    }

    const { data, error } = await query.order('statement_date', { ascending: false });

    return { data, error };
  }

  async generateStatement(statement: Partial<PatientStatement>) {
    const { data, error } = await supabase
      .from('patient_billing_statements')
      .insert(statement)
      .select()
      .single();

    return { data, error };
  }

  async sendStatement(statementId: string, method: 'email' | 'postal' | 'portal') {
    const { data, error } = await supabase
      .from('patient_billing_statements')
      .update({
        sent_via: method,
        sent_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', statementId)
      .select()
      .single();

    return { data, error };
  }

  async markAsCollections(statementId: string) {
    const { data, error } = await supabase
      .from('patient_billing_statements')
      .update({
        in_collections: true,
        collections_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', statementId)
      .select()
      .single();

    return { data, error };
  }
}

export const providerBillingService = new ProviderBillingService();
