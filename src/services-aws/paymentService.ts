import { api } from '../lib/api-client';
import { blockchainAuditService } from './blockchainAuditService';

export interface BillingTransaction {
  id: string;
  transaction_number: string;
  user_id: string;
  related_type: 'appointment' | 'pharmacy-order' | 'subscription';
  related_id: string;
  transaction_type: 'charge' | 'refund' | 'payout';
  amount_cents: number;
  currency: string;
  payment_method: string;
  payment_gateway: string;
  gateway_transaction_id: string | null;
  status: string;
  failure_reason: string | null;
  metadata: any;
  created_at: string;
}

export interface StripeCheckoutResult {
  checkout_url: string;
  session_id: string;
  transaction_id: string;
  transaction_number: string;
  setup_required?: boolean;
}

export const paymentService = {
  async createStripeCheckout(params: {
    appointment_id?: string;
    order_id?: string;
    amount_cents: number;
    patient_id: string;
    provider_id?: string;
    description: string;
    payment_type: 'appointment' | 'pharmacy_order';
    success_url: string;
    cancel_url: string;
  }): Promise<StripeCheckoutResult> {
    const { data, error } = await api.post<any>('/create-stripe-checkout', params);

    if (error) {
      if (error.setup_required) {
        return { checkout_url: '', session_id: '', transaction_id: '', transaction_number: '', setup_required: true };
      }
      throw new Error(error.error || 'Failed to create checkout session');
    }

    return data;
  },

  async createTransaction(transactionData: {
    user_id: string;
    related_type: string;
    related_id: string;
    transaction_type: string;
    amount_cents: number;
    payment_method: string;
    metadata?: any;
  }): Promise<BillingTransaction> {
    const transactionNumber = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const { data, error } = await api.post<BillingTransaction>('/billing-transactions', {
      ...transactionData,
      transaction_number: transactionNumber,
      currency: 'CAD',
      payment_gateway: 'stripe',
      status: 'pending',
    });

    if (error) throw error;

    try {
      await blockchainAuditService.logPayment(data!.id, data!.user_id, {
        amount: data!.amount_cents,
        currency: data!.currency,
        paymentMethod: data!.payment_method,
        transactionId: data!.transaction_number,
        status: data!.status,
      });
    } catch {}

    return data!;
  },

  async processAppointmentPayment(
    appointmentId: string,
    userId: string,
    amountCents: number,
    successUrl: string,
    cancelUrl: string,
    providerId?: string,
    description?: string
  ): Promise<StripeCheckoutResult> {
    return this.createStripeCheckout({
      appointment_id: appointmentId,
      amount_cents: amountCents,
      patient_id: userId,
      provider_id: providerId,
      description: description || 'Appointment Payment',
      payment_type: 'appointment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  },

  async processPharmacyOrderPayment(
    orderId: string,
    userId: string,
    amountCents: number,
    successUrl: string,
    cancelUrl: string,
    description?: string
  ): Promise<StripeCheckoutResult> {
    return this.createStripeCheckout({
      order_id: orderId,
      amount_cents: amountCents,
      patient_id: userId,
      description: description || 'Pharmacy Order Payment',
      payment_type: 'pharmacy_order',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  },

  async getUserTransactions(userId: string): Promise<BillingTransaction[]> {
    const { data, error } = await api.get<BillingTransaction[]>('/billing-transactions', {
      params: { user_id: userId, order: 'created_at.desc' },
    });

    if (error) throw error;
    return data || [];
  },

  async getTransaction(transactionId: string): Promise<BillingTransaction | null> {
    const { data, error } = await api.get<BillingTransaction>(`/billing-transactions/${transactionId}`);

    if (error) throw error;
    return data;
  },

  async getTransactionByNumber(transactionNumber: string): Promise<BillingTransaction | null> {
    const { data, error } = await api.get<BillingTransaction>('/billing-transactions', {
      params: { transaction_number: transactionNumber, single: true },
    });

    if (error) throw error;
    return data;
  },

  async processRefund(
    originalTransactionId: string,
    amountCents: number,
    reason: string
  ): Promise<BillingTransaction> {
    const originalTransaction = await this.getTransaction(originalTransactionId);

    if (!originalTransaction) {
      throw new Error('Original transaction not found');
    }

    const { data, error } = await api.post<BillingTransaction>('/billing-transactions', {
      transaction_number: `REF${Date.now()}${Math.floor(Math.random() * 1000)}`,
      user_id: originalTransaction.user_id,
      related_type: originalTransaction.related_type,
      related_id: originalTransaction.related_id,
      transaction_type: 'refund',
      amount_cents: amountCents,
      currency: originalTransaction.currency,
      payment_method: originalTransaction.payment_method,
      payment_gateway: 'stripe',
      status: 'completed',
      metadata: { reason, original_transaction_id: originalTransactionId },
    });

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'refund_issued',
        resourceType: 'payment',
        resourceId: data!.id,
        actorId: data!.user_id,
        actionData: { amount: amountCents, reason, original_transaction_id: originalTransactionId },
      });
    } catch {}

    return data!;
  },

  calculateAppointmentCost(
    consultationFeeCents: number,
    hasInsurance: boolean,
    insuranceCoveragePercent: number = 0
  ): { total: number; insurance: number; patient: number } {
    const insuranceCoverage = hasInsurance
      ? Math.floor((consultationFeeCents * insuranceCoveragePercent) / 100)
      : 0;

    const patientResponsibility = consultationFeeCents - insuranceCoverage;

    return {
      total: consultationFeeCents,
      insurance: insuranceCoverage,
      patient: patientResponsibility,
    };
  },

  calculatePharmacyOrderCost(
    subtotalCents: number,
    deliveryFeeCents: number,
    taxRate: number = 0.13
  ): { subtotal: number; delivery: number; tax: number; total: number } {
    const taxAmount = Math.floor((subtotalCents + deliveryFeeCents) * taxRate);
    const total = subtotalCents + deliveryFeeCents + taxAmount;

    return {
      subtotal: subtotalCents,
      delivery: deliveryFeeCents,
      tax: taxAmount,
      total,
    };
  },
};
