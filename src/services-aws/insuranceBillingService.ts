import { api } from '../lib/api-client';

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
  async getInsurancePolicies(patientId: string): Promise<{
    data: InsurancePolicy[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<InsurancePolicy[]>('/insurance-policies', {
        params: { patient_id: patientId, is_active: true, order: 'is_primary.desc' },
      });

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
      const { data, error } = await api.post<InsurancePolicy>('/insurance-policies', policy);

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
      const { data, error } = await api.put<InsurancePolicy>(`/insurance-policies/${policyId}`, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

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
      await api.put('/insurance-policies', {
        is_primary: false,
        _filter: { patient_id: patientId },
      });

      const { error } = await api.put(`/insurance-policies/${policyId}`, {
        is_primary: true,
      });

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  async getPaymentMethods(patientId: string): Promise<{
    data: PaymentMethod[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<PaymentMethod[]>('/payment-methods', {
        params: { user_id: patientId, is_active: true, order: 'is_default.desc' },
      });

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
      const { data, error } = await api.post<PaymentMethod>('/payment-methods', method);

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
      await api.put('/payment-methods', {
        is_default: false,
        _filter: { patient_id: patientId },
      });

      const { error } = await api.put(`/payment-methods/${methodId}`, {
        is_default: true,
      });

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
      const { error } = await api.put(`/payment-methods/${methodId}`, {
        is_active: false,
      });

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  async getBillingTransactions(
    patientId: string,
    limit: number = 50
  ): Promise<{
    data: BillingTransaction[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<BillingTransaction[]>('/billing-transactions', {
        params: { user_id: patientId, order: 'transaction_date.desc', limit },
      });

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
      const { data, error } = await api.get<Invoice[]>('/invoices', {
        params: { patient_id: patientId, order: 'invoice_date.desc' },
      });

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
      const { data, error } = await api.get<any[]>('/invoices', {
        params: {
          patient_id: patientId,
          status: ['sent', 'partial', 'overdue'],
          select: 'balance_cents',
        },
      });

      if (error) throw error;

      const total = data?.reduce((sum, inv) => sum + inv.balance_cents, 0) || 0;
      return { data: total, error: null };
    } catch (error) {
      return { data: 0, error: error as Error };
    }
  },

  async getInsuranceClaims(patientId: string): Promise<{
    data: InsuranceClaim[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<InsuranceClaim[]>('/insurance-claims', {
        params: { patient_id: patientId, order: 'claim_date.desc' },
      });

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
      const { data, error } = await api.post<InsuranceClaim>('/insurance-claims', {
        ...claim,
        status: 'submitted',
        submission_date: new Date().toISOString(),
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

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
      visa: '\uD83D\uDCB3',
      mastercard: '\uD83D\uDCB3',
      amex: '\uD83D\uDCB3',
      discover: '\uD83D\uDCB3',
    };
    return icons[brand?.toLowerCase() || ''] || '\uD83D\uDCB3';
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
