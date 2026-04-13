import { supabase } from '../lib/supabase';

export interface InsurancePolicy {
  id: string;
  patient_id: string;
  policy_type: 'public' | 'private';
  is_primary: boolean;
  province?: string;
  insurance_provider: string;
  policy_number: string;
  group_number?: string;
  subscriber_first_name?: string;
  subscriber_last_name?: string;
  subscriber_dob?: string;
  subscriber_relationship?: string;
  coverage_type?: 'individual' | 'family' | 'employee' | 'dependent';
  effective_date?: string;
  termination_date?: string;
  card_front_url?: string;
  card_back_url?: string;
  coverage_details?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  patient_id: string;
  payment_type: 'card' | 'bank_account' | 'paypal';
  is_default: boolean;
  provider: string;
  last_four: string;
  card_brand?: string;
  expiry_month?: number;
  expiry_year?: number;
  billing_name: string;
  billing_address_line1?: string;
  billing_city?: string;
  billing_province?: string;
  billing_postal_code?: string;
  billing_country: string;
  stripe_payment_method_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingTransaction {
  id: string;
  patient_id: string;
  invoice_id?: string;
  transaction_type: 'charge' | 'refund' | 'adjustment';
  service_type?: 'appointment' | 'prescription' | 'pharmacy_order' | 'lab_test' | 'imaging' | 'procedure';
  amount_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  payment_method_id?: string;
  insurance_policy_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  payment_processor?: string;
  processor_transaction_id?: string;
  description?: string;
  notes?: string;
  transaction_date: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  patient_id: string;
  provider_id?: string;
  appointment_id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  paid_cents: number;
  balance_cents: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  line_items: any[];
  payment_terms?: string;
  notes?: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

export interface InsuranceClaim {
  id: string;
  patient_id: string;
  insurance_policy_id: string;
  invoice_id?: string;
  claim_number?: string;
  claim_date: string;
  service_date: string;
  provider_id?: string;
  diagnosis_codes?: string[];
  procedure_codes?: string[];
  claimed_amount_cents: number;
  approved_amount_cents?: number;
  paid_amount_cents?: number;
  patient_responsibility_cents?: number;
  status: 'draft' | 'submitted' | 'pending' | 'approved' | 'denied' | 'appealed' | 'paid';
  submission_method?: string;
  submission_date?: string;
  processed_date?: string;
  denial_reason?: string;
  eob_url?: string;
  supporting_documents?: any;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const CANADIAN_PROVINCES = [
  { code: 'ON', name: 'Ontario', insurance: 'OHIP' },
  { code: 'BC', name: 'British Columbia', insurance: 'MSP' },
  { code: 'AB', name: 'Alberta', insurance: 'AHCIP' },
  { code: 'QC', name: 'Quebec', insurance: 'RAMQ' },
  { code: 'MB', name: 'Manitoba', insurance: 'MCP' },
  { code: 'SK', name: 'Saskatchewan', insurance: 'SHN' },
  { code: 'NS', name: 'Nova Scotia', insurance: 'MSI' },
  { code: 'NB', name: 'New Brunswick', insurance: 'Medicare' },
  { code: 'PE', name: 'Prince Edward Island', insurance: 'Medicare' },
  { code: 'NL', name: 'Newfoundland and Labrador', insurance: 'MCP' },
];

export const insuranceBillingService = {
  // Insurance Policies
  async getInsurancePolicies(patientId: string): Promise<{
    data: InsurancePolicy[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async addInsurancePolicy(policy: Partial<InsurancePolicy>): Promise<{
    data: InsurancePolicy | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('insurance_policies')
        .insert(policy)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async updateInsurancePolicy(
    policyId: string,
    updates: Partial<InsurancePolicy>
  ): Promise<{
    data: InsurancePolicy | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('insurance_policies')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', policyId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async setPrimaryInsurance(policyId: string, patientId: string): Promise<{
    data: boolean;
    error: Error | null;
  }> {
    try {
      await supabase
        .from('insurance_policies')
        .update({ is_primary: false })
        .eq('patient_id', patientId);

      const { error } = await supabase
        .from('insurance_policies')
        .update({ is_primary: true })
        .eq('id', policyId);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  // Payment Methods
  async getPaymentMethods(patientId: string): Promise<{
    data: PaymentMethod[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async addPaymentMethod(method: Partial<PaymentMethod>): Promise<{
    data: PaymentMethod | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert(method)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async setDefaultPaymentMethod(methodId: string, patientId: string): Promise<{
    data: boolean;
    error: Error | null;
  }> {
    try {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('patient_id', patientId);

      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', methodId);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  async deletePaymentMethod(methodId: string): Promise<{
    data: boolean;
    error: Error | null;
  }> {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: false })
        .eq('id', methodId);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  // Billing & Transactions
  async getBillingTransactions(
    patientId: string,
    limit: number = 50
  ): Promise<{
    data: BillingTransaction[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('billing_transactions')
        .select('*')
        .eq('patient_id', patientId)
        .order('transaction_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getInvoices(patientId: string): Promise<{
    data: Invoice[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('patient_id', patientId)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getOutstandingBalance(patientId: string): Promise<{
    data: number;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('balance_cents')
        .eq('patient_id', patientId)
        .in('status', ['sent', 'partial', 'overdue']);

      if (error) throw error;

      const total = data?.reduce((sum, inv) => sum + inv.balance_cents, 0) || 0;
      return { data: total, error: null };
    } catch (error) {
      return { data: 0, error: error as Error };
    }
  },

  // Insurance Claims
  async getInsuranceClaims(patientId: string): Promise<{
    data: InsuranceClaim[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('insurance_claims')
        .select('*')
        .eq('patient_id', patientId)
        .order('claim_date', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async submitInsuranceClaim(claim: Partial<InsuranceClaim>): Promise<{
    data: InsuranceClaim | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('insurance_claims')
        .insert({
          ...claim,
          status: 'submitted',
          submission_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  // Utility functions
  formatCurrency(cents: number, currency: string = 'CAD'): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },

  getProvincialInsurance(provinceCode: string): string {
    const province = CANADIAN_PROVINCES.find((p) => p.code === provinceCode);
    return province?.insurance || 'Provincial Health Insurance';
  },

  getCardBrandIcon(brand?: string): string {
    const icons: Record<string, string> = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
    };
    return icons[brand?.toLowerCase() || ''] || '💳';
  },

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      paid: 'green',
      completed: 'green',
      approved: 'green',
      pending: 'yellow',
      partial: 'yellow',
      overdue: 'red',
      failed: 'red',
      denied: 'red',
      cancelled: 'gray',
    };
    return colors[status] || 'gray';
  },
};