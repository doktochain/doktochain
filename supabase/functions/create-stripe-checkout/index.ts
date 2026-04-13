import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CheckoutRequest {
  appointment_id?: string;
  order_id?: string;
  amount_cents: number;
  patient_id: string;
  provider_id?: string;
  description: string;
  payment_type: "appointment" | "pharmacy_order";
  success_url: string;
  cancel_url: string;
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

    const body: CheckoutRequest = await req.json();
    const {
      appointment_id,
      order_id,
      amount_cents,
      patient_id,
      provider_id,
      description,
      payment_type,
      success_url,
      cancel_url,
    } = body;

    if (!amount_cents || amount_cents <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transactionNumber = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const { data: transaction, error: txnError } = await supabase
      .from("billing_transactions")
      .insert({
        transaction_number: transactionNumber,
        user_id: patient_id,
        related_type: payment_type === "appointment" ? "appointment" : "pharmacy-order",
        related_id: appointment_id || order_id || null,
        transaction_type: "charge",
        amount_cents: amount_cents,
        currency: "CAD",
        payment_method: "credit-card",
        payment_gateway: "stripe",
        status: "pending",
        metadata: { provider_id, description },
      })
      .select()
      .single();

    if (txnError) {
      return new Response(
        JSON.stringify({ error: "Failed to create transaction record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      currency: "cad",
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: { name: description },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        transaction_id: transaction.id,
        transaction_number: transactionNumber,
        appointment_id: appointment_id || "",
        order_id: order_id || "",
        patient_id,
        provider_id: provider_id || "",
        payment_type,
      },
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}&txn=${transactionNumber}`,
      cancel_url: `${cancel_url}?cancelled=true&txn=${transactionNumber}`,
    });

    await supabase
      .from("billing_transactions")
      .update({ gateway_transaction_id: session.id })
      .eq("id", transaction.id);

    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        session_id: session.id,
        transaction_id: transaction.id,
        transaction_number: transactionNumber,
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
