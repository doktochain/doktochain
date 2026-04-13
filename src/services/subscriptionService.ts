import { supabase } from '../lib/supabase';

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
    let query = supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (role) {
      query = query.eq('target_role', role);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async getPlanByKey(planKey: string): Promise<SubscriptionPlan | null> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('plan_key', planKey)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getAllPlansAdmin(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('display_order');

    if (error) throw error;
    return data || [];
  }

  static async updatePlan(id: string, updates: Partial<SubscriptionPlan>): Promise<void> {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  static async getSubscription(subscriberId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, plan:subscription_plans(*)')
      .eq('subscriber_id', subscriberId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .maybeSingle();

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
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('subscriptions')
      .select('*, plan:subscription_plans(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.subscriber_type) {
      query = query.eq('subscriber_type', filters.subscriber_type);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], count: count || 0 };
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
    const plan = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', params.plan_id)
      .maybeSingle();

    if (plan.error) throw plan.error;

    const status = params.trial_end ? 'trialing' : 'active';
    const periodEnd = new Date();
    if (params.billing_interval === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        subscriber_id: params.subscriber_id,
        subscriber_type: params.subscriber_type,
        plan_id: params.plan_id,
        billing_interval: params.billing_interval,
        seat_count: params.seat_count || 1,
        status,
        current_period_end: periodEnd.toISOString(),
        trial_end: params.trial_end || null,
        notes: params.notes || null,
      })
      .select('*, plan:subscription_plans(*)')
      .single();

    if (error) throw error;
    return data;
  }

  static async updateSubscription(id: string, updates: Partial<Subscription>): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  static async cancelSubscription(id: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
        notes: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  static async getSubscriptionStats(): Promise<{
    total_active: number;
    total_trialing: number;
    total_cancelled: number;
    mrr_cad: number;
    by_plan: Record<string, number>;
  }> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, plan:subscription_plans(plan_key, monthly_price_cad, annual_price_cad), billing_interval, seat_count');

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
    const { data: slotConfig } = await supabase
      .from('founding_member_slots')
      .select('max_slots')
      .eq('plan_key', 'founding_pro')
      .maybeSingle();

    const maxSlots = slotConfig?.max_slots || 30;

    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('plan_key', 'founding_pro')
      .maybeSingle();

    if (!plan) return maxSlots;

    const { count } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', plan.id)
      .in('status', ['active', 'trialing', 'past_due']);

    return Math.max(0, maxSlots - (count || 0));
  }

  static async initiateSubscriptionCheckout(params: {
    plan_id: string;
    billing_interval: 'monthly' | 'annual';
    success_url: string;
    cancel_url: string;
    promo_code?: string;
  }): Promise<{ checkout_url: string; session_id: string; setup_required?: boolean }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subscription-checkout`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.setup_required) {
        return { checkout_url: '', session_id: '', setup_required: true };
      }
      throw new Error(data.error || 'Failed to create subscription checkout');
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
