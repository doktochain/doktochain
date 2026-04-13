import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
    const body = await req.text();

    let event: Stripe.Event;

    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        return new Response(
          JSON.stringify({ error: "Missing stripe-signature header" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        if (session.mode === "subscription") {
          const userId = metadata.supabase_user_id;
          const planId = metadata.plan_id;
          const stripeSubId =
            typeof session.subscription === "string"
              ? session.subscription
              : (session.subscription as any)?.id;

          if (userId && planId && stripeSubId) {
            await supabase
              .from("subscriptions")
              .update({
                stripe_subscription_id: stripeSubId,
                stripe_customer_id:
                  typeof session.customer === "string"
                    ? session.customer
                    : (session.customer as any)?.id,
                updated_at: new Date().toISOString(),
              })
              .eq("subscriber_id", userId)
              .eq("plan_id", planId)
              .in("status", ["trialing", "active"]);

            await supabase.from("notifications").insert({
              user_id: userId,
              notification_type: "billing",
              title: "Subscription Activated",
              message:
                "Your subscription has been set up successfully. Your 7-day free trial has started.",
              is_read: false,
            });
          }
          break;
        }

        const transactionId = metadata.transaction_id;

        if (transactionId) {
          await supabase
            .from("billing_transactions")
            .update({
              status: "completed",
              gateway_transaction_id: session.payment_intent as string,
            })
            .eq("id", transactionId);

          if (metadata.appointment_id) {
            await supabase
              .from("appointments")
              .update({ payment_status: "paid" })
              .eq("id", metadata.appointment_id);
          }

          if (metadata.order_id) {
            await supabase
              .from("pharmacy_orders")
              .update({ payment_status: "paid" })
              .eq("id", metadata.order_id);
          }

          if (metadata.patient_id) {
            await supabase.from("notifications").insert({
              user_id: metadata.patient_id,
              notification_type: "billing",
              title: "Payment Successful",
              message: `Your payment of $${((session.amount_total || 0) / 100).toFixed(2)} CAD has been processed successfully.`,
              is_read: false,
            });
          }

          if (metadata.provider_id) {
            const { data: provider } = await supabase
              .from("providers")
              .select("user_id")
              .eq("id", metadata.provider_id)
              .maybeSingle();

            if (provider?.user_id) {
              await supabase.from("notifications").insert({
                user_id: provider.user_id,
                notification_type: "billing",
                title: "New Payment Received",
                message: `A payment of $${((session.amount_total || 0) / 100).toFixed(2)} CAD has been received for your service.`,
                is_read: false,
              });
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subMeta = subscription.metadata || {};
        const userId = subMeta.supabase_user_id;

        if (userId) {
          const statusMap: Record<string, string> = {
            active: "active",
            trialing: "trialing",
            past_due: "past_due",
            canceled: "cancelled",
            unpaid: "past_due",
            incomplete: "trialing",
            incomplete_expired: "expired",
          };
          const mappedStatus = statusMap[subscription.status] || "active";

          const updateData: Record<string, any> = {
            status: mappedStatus,
            updated_at: new Date().toISOString(),
          };

          if (subscription.current_period_end) {
            updateData.current_period_end = new Date(
              subscription.current_period_end * 1000
            ).toISOString();
          }
          if (subscription.current_period_start) {
            updateData.current_period_start = new Date(
              subscription.current_period_start * 1000
            ).toISOString();
          }
          if (subscription.cancel_at_period_end !== undefined) {
            updateData.cancel_at_period_end =
              subscription.cancel_at_period_end;
          }
          if (subscription.canceled_at) {
            updateData.cancelled_at = new Date(
              subscription.canceled_at * 1000
            ).toISOString();
          }
          if (subscription.trial_end) {
            updateData.trial_end = new Date(
              subscription.trial_end * 1000
            ).toISOString();
          }

          await supabase
            .from("subscriptions")
            .update(updateData)
            .eq("stripe_subscription_id", subscription.id);

          if (mappedStatus === "past_due") {
            await supabase.from("notifications").insert({
              user_id: userId,
              notification_type: "billing",
              title: "Payment Past Due",
              message:
                "Your subscription payment is past due. Please update your payment method to avoid service interruption.",
              is_read: false,
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subMeta = subscription.metadata || {};
        const userId = subMeta.supabase_user_id;

        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (userId) {
          await supabase.from("notifications").insert({
            user_id: userId,
            notification_type: "billing",
            title: "Subscription Cancelled",
            message:
              "Your subscription has been cancelled. You can resubscribe at any time from your dashboard.",
            is_read: false,
          });
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : (invoice.subscription as any)?.id;

        if (stripeSubId && !invoice.billing_reason?.includes("create")) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("subscriber_id")
            .eq("stripe_subscription_id", stripeSubId)
            .maybeSingle();

          if (sub) {
            await supabase
              .from("subscriptions")
              .update({
                status: "active",
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_subscription_id", stripeSubId);

            await supabase.from("notifications").insert({
              user_id: sub.subscriber_id,
              notification_type: "billing",
              title: "Subscription Renewed",
              message: `Your subscription payment of $${((invoice.amount_paid || 0) / 100).toFixed(2)} CAD has been processed.`,
              is_read: false,
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : (invoice.subscription as any)?.id;

        if (stripeSubId) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("subscriber_id")
            .eq("stripe_subscription_id", stripeSubId)
            .maybeSingle();

          if (sub) {
            await supabase
              .from("subscriptions")
              .update({
                status: "past_due",
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_subscription_id", stripeSubId);

            await supabase.from("notifications").insert({
              user_id: sub.subscriber_id,
              notification_type: "billing",
              title: "Subscription Payment Failed",
              message:
                "We were unable to process your subscription payment. Please update your payment method.",
              is_read: false,
            });
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadata = paymentIntent.metadata || {};
        const transactionId = metadata.transaction_id;

        if (transactionId) {
          await supabase
            .from("billing_transactions")
            .update({
              status: "failed",
              failure_reason:
                paymentIntent.last_payment_error?.message || "Payment failed",
            })
            .eq("id", transactionId);

          if (metadata.patient_id) {
            await supabase.from("notifications").insert({
              user_id: metadata.patient_id,
              notification_type: "billing",
              title: "Payment Failed",
              message:
                "Your payment could not be processed. Please try again or use a different payment method.",
              is_read: false,
            });
          }
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const amountRefunded = charge.amount_refunded;

        const { data: txn } = await supabase
          .from("billing_transactions")
          .select("id, user_id")
          .eq("gateway_transaction_id", charge.payment_intent)
          .maybeSingle();

        if (txn) {
          await supabase.from("billing_transactions").insert({
            transaction_number: `REF${Date.now()}${Math.floor(Math.random() * 1000)}`,
            user_id: txn.user_id,
            related_type: "appointment",
            related_id: txn.id,
            transaction_type: "refund",
            amount_cents: amountRefunded,
            currency: "CAD",
            payment_method: "credit-card",
            payment_gateway: "stripe",
            gateway_transaction_id: charge.id,
            status: "completed",
            metadata: { original_transaction_id: txn.id },
          });

          await supabase.from("notifications").insert({
            user_id: txn.user_id,
            notification_type: "billing",
            title: "Refund Processed",
            message: `A refund of $${(amountRefunded / 100).toFixed(2)} CAD has been processed to your payment method.`,
            is_read: false,
          });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Webhook processing failed" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
