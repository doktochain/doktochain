import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { withServiceRole } from '../../shared/db';
import { success, error, getOrigin } from '../../shared/response';

const secretsClient = new SecretsManagerClient({});
let cachedStripeKey: string | null = null;
let cachedWebhookSecret: string | null = null;

async function getSecret(arn: string): Promise<string> {
  const command = new GetSecretValueCommand({ SecretId: arn });
  const response = await secretsClient.send(command);
  return response.SecretString!;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const origin = getOrigin(event.headers);

  try {
    if (!cachedStripeKey) {
      cachedStripeKey = await getSecret(process.env.STRIPE_SECRET_KEY_ARN!);
    }
    if (!cachedWebhookSecret) {
      cachedWebhookSecret = await getSecret(process.env.STRIPE_WEBHOOK_SECRET_ARN!);
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(cachedStripeKey, { apiVersion: '2024-12-18.acacia' as any });

    const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    if (!signature) {
      return error('Missing stripe-signature header', 400, origin);
    }

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body!, 'base64').toString('utf-8')
      : event.body!;

    const stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      cachedWebhookSecret
    );

    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as any;
        const metadata = session.metadata || {};

        if (session.mode === 'subscription') {
          const userId = metadata.user_id;
          const planId = metadata.plan_id;
          const stripeSubId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

          if (userId && planId && stripeSubId) {
            await withServiceRole(async (client) => {
              await client.query(
                `UPDATE subscriptions
                 SET stripe_subscription_id = $1,
                     stripe_customer_id = $2,
                     updated_at = now()
                 WHERE subscriber_id = $3 AND plan_id = $4`,
                [stripeSubId, session.customer, userId, planId]
              );

              await client.query(
                `INSERT INTO notifications (user_id, title, message, notification_type, is_read)
                 VALUES ($1, 'Subscription Activated', 'Your subscription has been set up successfully.', 'payment', false)`,
                [userId]
              );
            });
          }
        } else {
          const transactionId = metadata.transaction_id;
          if (transactionId) {
            await withServiceRole(async (client) => {
              await client.query(
                `UPDATE billing_transactions
                 SET status = 'completed', gateway_transaction_id = $1
                 WHERE id = $2`,
                [session.payment_intent, transactionId]
              );

              if (metadata.appointment_id) {
                await client.query(
                  `UPDATE appointments SET payment_status = 'paid' WHERE id = $1`,
                  [metadata.appointment_id]
                );
              }

              if (metadata.order_id) {
                await client.query(
                  `UPDATE pharmacy_orders SET payment_status = 'paid' WHERE id = $1`,
                  [metadata.order_id]
                );
              }

              const notifyUserId = metadata.user_id;
              if (notifyUserId) {
                const amount = ((session.amount_total || 0) / 100).toFixed(2);
                await client.query(
                  `INSERT INTO notifications (user_id, title, message, notification_type, is_read)
                   VALUES ($1, 'Payment Successful', $2, 'payment', false)`,
                  [notifyUserId, `Your payment of $${amount} CAD has been processed.`]
                );
              }
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as any;
        const userId = subscription.metadata?.user_id;

        if (userId) {
          const statusMap: Record<string, string> = {
            active: 'active', trialing: 'trialing', past_due: 'past_due',
            canceled: 'cancelled', unpaid: 'past_due',
          };

          await withServiceRole(async (client) => {
            await client.query(
              `UPDATE subscriptions
               SET status = $1, current_period_end = $2, updated_at = now()
               WHERE stripe_subscription_id = $3`,
              [
                statusMap[subscription.status] || 'active',
                subscription.current_period_end
                  ? new Date(subscription.current_period_end * 1000).toISOString()
                  : null,
                subscription.id,
              ]
            );
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as any;

        await withServiceRole(async (client) => {
          await client.query(
            `UPDATE subscriptions SET status = 'cancelled', cancelled_at = now(), updated_at = now()
             WHERE stripe_subscription_id = $1`,
            [subscription.id]
          );
        });
        break;
      }

      case 'charge.refunded': {
        const charge = stripeEvent.data.object as any;
        const paymentIntent = charge.payment_intent;

        if (paymentIntent) {
          await withServiceRole(async (client) => {
            await client.query(
              `UPDATE billing_transactions SET status = 'refunded', updated_at = now()
               WHERE gateway_transaction_id = $1`,
              [paymentIntent]
            );
          });
        }
        break;
      }
    }

    return success({ received: true }, origin);
  } catch (err) {
    console.error('Stripe webhook error:', err);
    return error(
      err instanceof Error ? err.message : 'Webhook processing failed',
      400,
      origin
    );
  }
};
