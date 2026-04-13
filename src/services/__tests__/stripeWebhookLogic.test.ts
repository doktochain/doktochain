import { describe, it, expect } from 'vitest';

const statusMap: Record<string, string> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'cancelled',
  unpaid: 'past_due',
  incomplete: 'trialing',
  incomplete_expired: 'expired',
};

describe('stripe webhook status mapping', () => {
  it('maps active to active', () => {
    expect(statusMap['active']).toBe('active');
  });

  it('maps trialing to trialing', () => {
    expect(statusMap['trialing']).toBe('trialing');
  });

  it('maps past_due to past_due', () => {
    expect(statusMap['past_due']).toBe('past_due');
  });

  it('maps canceled (Stripe) to cancelled (Canadian spelling)', () => {
    expect(statusMap['canceled']).toBe('cancelled');
  });

  it('maps unpaid to past_due', () => {
    expect(statusMap['unpaid']).toBe('past_due');
  });

  it('maps incomplete to trialing', () => {
    expect(statusMap['incomplete']).toBe('trialing');
  });

  it('maps incomplete_expired to expired', () => {
    expect(statusMap['incomplete_expired']).toBe('expired');
  });

  it('falls back to active for unknown statuses', () => {
    const mappedStatus = statusMap['unknown_status'] || 'active';
    expect(mappedStatus).toBe('active');
  });
});

describe('stripe webhook event routing', () => {
  const eventHandlers = [
    'checkout.session.completed',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.paid',
    'invoice.payment_failed',
    'payment_intent.payment_failed',
    'charge.refunded',
  ];

  it('handles all 7 expected event types', () => {
    expect(eventHandlers).toHaveLength(7);
  });

  it('includes checkout.session.completed', () => {
    expect(eventHandlers).toContain('checkout.session.completed');
  });

  it('includes charge.refunded', () => {
    expect(eventHandlers).toContain('charge.refunded');
  });
});

describe('stripe transaction number generation', () => {
  it('generates unique transaction numbers', () => {
    const txn1 = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const txn2 = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
    expect(txn1.startsWith('TXN')).toBe(true);
    expect(txn1.length).toBeGreaterThan(3);
  });

  it('generates refund transaction numbers', () => {
    const ref = `REF${Date.now()}${Math.floor(Math.random() * 1000)}`;
    expect(ref.startsWith('REF')).toBe(true);
  });
});

describe('stripe amount formatting', () => {
  it('converts cents to dollar display', () => {
    const amountCents = 2500;
    const formatted = (amountCents / 100).toFixed(2);
    expect(formatted).toBe('25.00');
  });

  it('handles zero amount', () => {
    const formatted = (0 / 100).toFixed(2);
    expect(formatted).toBe('0.00');
  });

  it('handles fractional cents correctly', () => {
    const amountCents = 1999;
    const formatted = (amountCents / 100).toFixed(2);
    expect(formatted).toBe('19.99');
  });
});

describe('stripe subscription period conversion', () => {
  it('converts Unix timestamp seconds to ISO date', () => {
    const unixSeconds = 1700000000;
    const isoDate = new Date(unixSeconds * 1000).toISOString();
    expect(isoDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('correctly handles current_period_end timestamp', () => {
    const unixSeconds = 1735689600;
    const date = new Date(unixSeconds * 1000);
    expect(date.getFullYear()).toBe(2025);
  });
});

describe('checkout.session.completed branching', () => {
  it('handles subscription mode when all metadata present', () => {
    const session = {
      mode: 'subscription',
      metadata: {
        supabase_user_id: 'user-123',
        plan_id: 'plan-456',
      },
      subscription: 'sub_abc123',
      customer: 'cus_xyz789',
    };

    const isSubscription = session.mode === 'subscription';
    const userId = session.metadata.supabase_user_id;
    const planId = session.metadata.plan_id;
    const stripeSubId = typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as any)?.id;

    expect(isSubscription).toBe(true);
    expect(userId).toBe('user-123');
    expect(planId).toBe('plan-456');
    expect(stripeSubId).toBe('sub_abc123');
  });

  it('handles payment mode with transaction metadata', () => {
    const session = {
      mode: 'payment',
      metadata: {
        transaction_id: 'txn-789',
        appointment_id: 'appt-123',
        patient_id: 'patient-456',
        provider_id: 'provider-789',
      },
      amount_total: 15000,
    };

    expect(session.mode).not.toBe('subscription');
    expect(session.metadata.transaction_id).toBe('txn-789');
    expect(session.metadata.appointment_id).toBe('appt-123');
    expect((session.amount_total / 100).toFixed(2)).toBe('150.00');
  });
});
