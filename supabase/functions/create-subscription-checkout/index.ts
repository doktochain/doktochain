import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SubscriptionCheckoutRequest {
  plan_id: string;
  billing_interval: "monthly" | "annual";
  success_url: string;
  cancel_url: string;
  promo_code?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          error: "Stripe is not configured. Please add your STRIPE_SECRET_KEY.",
          setup_required: true,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SubscriptionCheckoutRequest = await req.json();
    const { plan_id, billing_interval, success_url, cancel_url, promo_code } =
      body;

    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: "Plan not found or inactive" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (plan.is_free) {
      return new Response(
        JSON.stringify({ error: "Free plans do not require checkout" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (plan.plan_key === "founding_pro") {
      const { data: slotConfig } = await supabase
        .from("founding_member_slots")
        .select("max_slots")
        .eq("plan_key", "founding_pro")
        .maybeSingle();

      const maxSlots = slotConfig?.max_slots || 30;

      const { count: currentCount } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("plan_id", plan.id)
        .in("status", ["active", "trialing", "past_due"]);

      if ((currentCount || 0) >= maxSlots) {
        return new Response(
          JSON.stringify({
            error: "All founding member spots have been claimed. Please select a different plan.",
            founding_full: true,
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const stripePriceId =
      billing_interval === "annual"
        ? plan.stripe_price_id_annual
        : plan.stripe_price_id_monthly;

    const priceCad =
      billing_interval === "annual" && plan.annual_price_cad
        ? plan.annual_price_cad
        : plan.monthly_price_cad;

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("subscriber_id", user.id)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let stripeCustomerId = existingSub?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;
    }

    const trialDays = plan.trial_days || 7;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      mode: "subscription",
      currency: "cad",
      metadata: {
        supabase_user_id: user.id,
        plan_id: plan.id,
        plan_key: plan.plan_key,
        billing_interval,
        promo_code: promo_code || "",
      },
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          supabase_user_id: user.id,
          plan_id: plan.id,
          plan_key: plan.plan_key,
        },
        proration_behavior: "create_prorations",
      },
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}&subscription=success`,
      cancel_url: `${cancel_url}?subscription=cancelled`,
    };

    if (stripePriceId) {
      sessionParams.line_items = [{ price: stripePriceId, quantity: 1 }];
    } else {
      const billingPeriod =
        billing_interval === "annual" ? "year" : "month";
      sessionParams.line_items = [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: `${plan.name} - ${billing_interval === "annual" ? "Annual" : "Monthly"}`,
              description: plan.description || undefined,
            },
            unit_amount: Math.round(priceCad * 100),
            recurring: { interval: billingPeriod },
          },
          quantity: 1,
        },
      ];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    await supabase
      .from("subscriptions")
      .update({
        stripe_customer_id: stripeCustomerId,
        metadata: {
          stripe_checkout_session_id: session.id,
          checkout_initiated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("subscriber_id", user.id)
      .eq("plan_id", plan.id)
      .in("status", ["trialing", "active"]);

    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        session_id: session.id,
        customer_id: stripeCustomerId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
