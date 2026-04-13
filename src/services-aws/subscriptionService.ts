import { api } from '../lib/api-client';

export interface SubscriptionPlan {
  id: string;
  plan_key: string;
  name: string;
  target_role: 'provider' | 'clinic' | 'pharmacy';
  tier: string;
  monthly_price_cad: number;
  annual_price_cad: number | null;
  seats_included: number | null;
  per_extra_seat_cad: number | null;
  transaction_commission_pct: number;
  is_free: boolean;
  is_custom_pricing: boolean;
  is_popular: boolean;
  is_active: boolean;
  features: string[];
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  subscriber_id: string;
  subscriber_type: 'provider' | 'clinic' | 'pharmacy';
  plan_id: string;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired';
  billing_interval: 'monthly' | 'annual';
  seat_count: number;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  cancelled_at: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export class SubscriptionService {
  static async getPlans(role?: string): Promise<SubscriptionPlan[]> {
    const params: any = { is_active: true, order: 'display_order' };
    if (role) params.target_role = role;

    const { data, error } = await api.get<SubscriptionPlan[]>('/subscription-plans', { params });
    if (error) throw error;
    return data || [];
  }

  static async getPlanByKey(planKey: string): Promise<SubscriptionPlan | null> {
    const { data, error } = await api.get<SubscriptionPlan>('/subscription-plans', {
      params: { plan_key: planKey, single: true },
    });

    if (error) throw error;
    return data;
  }

  static async getAllPlansAdmin(): Promise<SubscriptionPlan[]> {
    const { data, error } = await api.get<SubscriptionPlan[]>('/subscription-plans', {
      params: { order: 'display_order' },
    });

    if (error) throw error;
    return data || [];
  }

  static async updatePlan(id: string, updates: Partial<SubscriptionPlan>): Promise<void> {
    const { error } = await api.put(`/subscription-plans/${id}`, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  }

  static async getSubscription(subscriberId: string): Promise<Subscription | null> {
    const { data, error } = await api.get<Subscription>('/subscriptions', {
      params: {
        subscriber_id: subscriberId,
        status: ['active', 'trialing', 'past_due'],
        order: 'created_at.desc',
        single: true,
        include: 'plan',
      },
    });

    if (error) throw error;
    return data;
  }

  static async getAllSubscriptions(filters?: {
    status?: string;
    subscriber_type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Subscription[]; count: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const params: any = {
      order: 'created_at.desc',
      limit,
      offset,
      count: true,
      include: 'plan',
    };
    if (filters?.status) params.status = filters.status;
    if (filters?.subscriber_type) params.subscriber_type = filters.subscriber_type;

    const { data, error } = await api.get<any>('/subscriptions', { params });
    if (error) throw error;
    return { data: (data?.items || data) || [], count: data?.count || 0 };
  }

  static async createSubscription(params: {
    subscriber_id: string;
    subscriber_type: 'provider' | 'clinic' | 'pharmacy';
    plan_id: string;
    billing_interval: 'monthly' | 'annual';
    seat_count?: number;
    trial_end?: string;
    notes?: string;
  }): Promise<Subscription> {
    const { data: plan, error: planError } = await api.get<SubscriptionPlan>(`/subscription-plans/${params.plan_id}`);

    if (planError) throw planError;

    const status = params.trial_end ? 'trialing' : 'active';
    const periodEnd = new Date();
    if (params.billing_interval === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const { data, error } = await api.post<Subscription>('/subscriptions', {
      subscriber_id: params.subscriber_id,
      subscriber_type: params.subscriber_type,
      plan_id: params.plan_id,
      billing_interval: params.billing_interval,
      seat_count: params.seat_count || 1,
      status,
      current_period_end: periodEnd.toISOString(),
      trial_end: params.trial_end || null,
      notes: params.notes || null,
    });

    if (error) throw error;
    return data!;
  }

  static async updateSubscription(id: string, updates: Partial<Subscription>): Promise<void> {
    const { error } = await api.put(`/subscriptions/${id}`, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  }

  static async cancelSubscription(id: string, reason?: string): Promise<void> {
    const { error } = await api.put(`/subscriptions/${id}`, {
      cancel_at_period_end: true,
      cancelled_at: new Date().toISOString(),
      notes: reason || null,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  }

  static async getSubscriptionStats(): Promise<{
    total_active: number;
    total_trialing: number;
    total_cancelled: number;
    mrr_cad: number;
    by_plan: Record<string, number>;
  }> {
    const { data, error } = await api.get<any[]>('/subscriptions', {
      params: { include: 'plan', select: 'status,billing_interval,seat_count' },
    });

    if (error) throw error;

    const stats = {
      total_active: 0,
      total_trialing: 0,
      total_cancelled: 0,
      mrr_cad: 0,
      by_plan: {} as Record<string, number>,
    };

    (data || []).forEach((sub: any) => {
      if (sub.status === 'active') stats.total_active++;
      if (sub.status === 'trialing') stats.total_trialing++;
      if (sub.status === 'cancelled') stats.total_cancelled++;

      const planKey = sub.plan?.plan_key || 'unknown';
      stats.by_plan[planKey] = (stats.by_plan[planKey] || 0) + 1;

      if (sub.status === 'active' || sub.status === 'trialing') {
        if (sub.billing_interval === 'annual' && sub.plan?.annual_price_cad) {
          stats.mrr_cad += Number(sub.plan.annual_price_cad);
        } else {
          stats.mrr_cad += Number(sub.plan?.monthly_price_cad || 0);
        }
      }
    });

    return stats;
  }

  static async getFoundingSlotsRemaining(): Promise<number> {
    const { data: slotConfig } = await api.get<any>('/founding-member-slots', {
      params: { plan_key: 'founding_pro', single: true },
    });

    const maxSlots = slotConfig?.max_slots || 30;

    const { data: plan } = await api.get<any>('/subscription-plans', {
      params: { plan_key: 'founding_pro', single: true },
    });

    if (!plan) return maxSlots;

    const { data: countData } = await api.get<any>('/subscriptions', {
      params: {
        plan_id: plan.id,
        status: ['active', 'trialing', 'past_due'],
        count: true,
        limit: 0,
      },
    });

    const count = countData?.count || 0;
    return Math.max(0, maxSlots - count);
  }

  static async initiateSubscriptionCheckout(params: {
    plan_id: string;
    billing_interval: 'monthly' | 'annual';
    success_url: string;
    cancel_url: string;
    promo_code?: string;
  }): Promise<{ checkout_url: string; session_id: string; setup_required?: boolean }> {
    const { data, error } = await api.post<any>('/create-subscription-checkout', params);

    if (error) {
      if (error.setup_required) {
        return { checkout_url: '', session_id: '', setup_required: true };
      }
      throw new Error(error.error || 'Failed to create subscription checkout');
    }

    return data;
  }

  static formatPrice(amount: number): string {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
