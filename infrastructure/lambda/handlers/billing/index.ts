import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { Router } from '../../shared/router';
import { requireAuth } from '../../shared/auth';
import { withRLS, withServiceRole } from '../../shared/db';
import {
  success, created, badRequest,
  parseBody, getOrigin,
} from '../../shared/response';

const secretsClient = new SecretsManagerClient({});
let cachedStripeKey: string | null = null;

async function getStripeKey(): Promise<string> {
  if (cachedStripeKey) return cachedStripeKey;
  const command = new GetSecretValueCommand({
    SecretId: process.env.STRIPE_SECRET_KEY_ARN!,
  });
  const response = await secretsClient.send(command);
  cachedStripeKey = response.SecretString!;
  return cachedStripeKey;
}

const router = new Router('/billing');

router.post('/checkout', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{
    appointment_id?: string;
    order_id?: string;
    amount_cents: number;
    description: string;
    payment_type: 'appointment' | 'pharmacy_order';
    success_url: string;
    cancel_url: string;
  }>(event.body);

  if (!body.amount_cents || !body.description || !body.success_url || !body.cancel_url) {
    return badRequest('Amount, description, success URL, and cancel URL are required', origin);
  }

  const stripeKey = await getStripeKey();
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

  const transactionData = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const txNumber = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const relatedType = body.payment_type === 'pharmacy_order' ? 'pharmacy-order' : 'appointment';
    const relatedId = body.appointment_id || body.order_id;

    if (!relatedId) {
      throw new (await import('../../shared/response')).ClientError('appointment_id or order_id is required', 400);
    }

    const txResult = await client.query(
      `INSERT INTO billing_transactions
       (transaction_number, user_id, related_type, related_id, transaction_type, amount_cents, currency, status)
       VALUES ($1, $2, $3, $4, 'charge', $5, 'CAD', 'pending')
       RETURNING *`,
      [txNumber, user.userId, relatedType, relatedId, body.amount_cents]
    );

    return txResult.rows[0];
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'cad',
    line_items: [{
      price_data: {
        currency: 'cad',
        unit_amount: body.amount_cents,
        product_data: { name: body.description },
      },
      quantity: 1,
    }],
    success_url: body.success_url,
    cancel_url: body.cancel_url,
    metadata: {
      transaction_id: transactionData.id,
      appointment_id: body.appointment_id || '',
      order_id: body.order_id || '',
      patient_id: transactionData.patient_id || '',
      user_id: user.userId,
    },
  });

  return created({
    checkout_url: session.url,
    session_id: session.id,
    transaction_id: transactionData.id,
  }, origin);
});

router.post('/subscription-checkout', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);
  const body = parseBody<{
    plan_id: string;
    billing_interval: 'monthly' | 'yearly' | 'annual';
  }>(event.body);

  const stripeKey = await getStripeKey();
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

  const planData = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true`,
      [body.plan_id]
    );
    return result.rows[0];
  });

  if (!planData) return badRequest('Plan not found', origin);

  const isAnnual = body.billing_interval === 'yearly' || body.billing_interval === 'annual';
  const priceId = isAnnual ? planData.stripe_yearly_price_id : planData.stripe_monthly_price_id;

  if (!priceId) return badRequest('Stripe price not configured for this plan', origin);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      metadata: {
        user_id: user.userId,
        plan_id: body.plan_id,
      },
    },
    success_url: `${event.headers.origin || event.headers.Origin}/dashboard/select-plan?success=true`,
    cancel_url: `${event.headers.origin || event.headers.Origin}/dashboard/select-plan?cancelled=true`,
    metadata: {
      user_id: user.userId,
      plan_id: body.plan_id,
    },
  });

  const billingInterval = isAnnual ? 'annual' : 'monthly';
  const subscriberType = user.role === 'pharmacy' ? 'pharmacy' : user.role === 'clinic' ? 'clinic' : 'provider';

  await withServiceRole(async (client) => {
    await client.query(
      `INSERT INTO subscriptions (subscriber_id, subscriber_type, plan_id, status, billing_interval)
       VALUES ($1, $2, $3, 'trialing', $4)
       ON CONFLICT (subscriber_id) DO UPDATE SET
         plan_id = EXCLUDED.plan_id,
         status = 'trialing',
         billing_interval = EXCLUDED.billing_interval,
         updated_at = now()`,
      [user.userId, subscriberType, body.plan_id, billingInterval]
    );
  });

  return created({ checkout_url: session.url, session_id: session.id }, origin);
});

router.get('/transactions', async (event) => {
  const origin = getOrigin(event.headers);
  const user = requireAuth(event);

  const data = await withRLS(user.userId, user.role, user.claims, async (client) => {
    const result = await client.query(
      `SELECT * FROM billing_transactions
       WHERE patient_id = (SELECT id FROM patients WHERE user_id = $1)
       ORDER BY created_at DESC LIMIT 50`,
      [user.userId]
    );
    return result.rows;
  });

  return success(data, origin);
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return router.handle(event);
};
