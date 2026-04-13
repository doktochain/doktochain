# DoktoChain Stripe Setup Guide

This guide walks you through configuring Stripe for recurring subscription payments. Complete each section in order.

---

## Prerequisites

- A Stripe account (create one at https://dashboard.stripe.com/register)
- Access to the DoktoChain admin dashboard
- Access to the Supabase project (for storing secrets)

---

## Step 1: Get Your Stripe Keys

1. Log in to the [Stripe Dashboard](https://dashboard.stripe.com)
2. Click the **"Test mode"** toggle in the top-right corner (it should show "Test mode" with an orange badge)
3. Navigate to **Developers > API Keys**
4. You will see two keys:
   - **Publishable key** (starts with `pk_test_`) -- used in the frontend (you already have this)
   - **Secret key** (starts with `sk_test_`) -- used in edge functions (you need to add this)
5. Click **"Reveal test key"** next to the Secret key and copy it

---

## Step 2: Store the Stripe Secret Key

The edge functions (`create-subscription-checkout` and `stripe-webhook`) read from the environment variable `STRIPE_SECRET_KEY`.

### For Supabase (Current Environment)

Store the secret key as a Supabase Edge Function secret:

1. Go to https://supabase.com/dashboard/project/kenwmclthgascryrdohj/settings/functions
2. Under **"Edge Function Secrets"**, click **"Add new secret"**
3. Name: `STRIPE_SECRET_KEY`
4. Value: paste your `sk_test_...` key
5. Click **"Save"**

### For AWS (After Migration)

Store in AWS Secrets Manager (see the updated Task 1.5 in `AWS_MIGRATION_PLAN.md`):

```bash
aws secretsmanager create-secret \
  --name "doktochain-production/stripe-secret-key" \
  --secret-string "sk_test_YOUR_KEY_HERE" \
  --region ca-central-1 \
  --profile doktochain-user
```

---

## Step 3: Create Stripe Products and Prices

Go to **Stripe Dashboard > Product Catalog > Add Product** and create the following 7 products. The 2 free plans (Solo Starter and Clinic Enterprise) do not need Stripe products.

### Founding Member Plan

**Product 1: Founding Member - Solo Pro**
1. Click **"Add product"**
2. Name: `Founding Member - Solo Pro`
3. Description: `Solo Pro at $69/month for life. Limited to the first 30 providers.`
4. Under **"Price information"**:
   - Price: `$69.00 CAD` / `Monthly` / `Recurring`
   - (No annual price -- founding members are monthly only at the locked rate)
5. Click **"Save product"**
6. Copy down:
   - Product ID (starts with `prod_`)
   - Monthly Price ID (starts with `price_`)

This plan is only visible when providers arrive via the Founding Member CTA on the pricing page (`/register?role=provider&promo=founding`). The checkout edge function enforces a hard cap of 30 subscriptions.

### Provider Plans

**Product 2: Solo Pro**
1. Click **"Add product"**
2. Name: `Solo Pro`
3. Description: `Professional plan for solo practitioners`
4. Under **"Price information"**:
   - Price 1: `$99.00 CAD` / `Monthly` / `Recurring`
   - Click **"Add another price"**
   - Price 2: `$1,008.00 CAD` / `Yearly` / `Recurring` (this is $84/month billed annually)
5. Click **"Save product"**
6. Copy down:
   - Product ID (starts with `prod_`)
   - Monthly Price ID (starts with `price_`)
   - Annual Price ID (starts with `price_`)

**Product 3: Solo Advanced**
1. Name: `Solo Advanced`
2. Description: `Advanced plan for solo practitioners`
3. Monthly price: `$179.00 CAD` / `Monthly` / `Recurring`
4. Annual price: `$1,824.00 CAD` / `Yearly` / `Recurring` ($152/month billed annually)
5. Save and copy the IDs

### Clinic Plans

**Product 4: Clinic Essential**
1. Name: `Clinic Essential`
2. Description: `Essential plan for small clinics`
3. Monthly price: `$399.00 CAD` / `Monthly` / `Recurring`
4. Annual price: `$4,068.00 CAD` / `Yearly` / `Recurring` ($339/month billed annually)
5. Save and copy the IDs

**Product 5: Clinic Growth**
1. Name: `Clinic Growth`
2. Description: `Growth plan for expanding clinics`
3. Monthly price: `$799.00 CAD` / `Monthly` / `Recurring`
4. Annual price: `$8,148.00 CAD` / `Yearly` / `Recurring` ($679/month billed annually)
5. Save and copy the IDs

### Pharmacy Plans

**Product 6: Pharmacy Standard**
1. Name: `Pharmacy Standard`
2. Description: `Standard plan for pharmacies`
3. Monthly price: `$199.00 CAD` / `Monthly` / `Recurring`
4. Annual price: `$2,028.00 CAD` / `Yearly` / `Recurring` ($169/month billed annually)
5. Save and copy the IDs

**Product 7: Pharmacy Plus**
1. Name: `Pharmacy Plus`
2. Description: `Premium plan for pharmacies`
3. Monthly price: `$399.00 CAD` / `Monthly` / `Recurring`
4. Annual price: `$4,068.00 CAD` / `Yearly` / `Recurring` ($339/month billed annually)
5. Save and copy the IDs

### Free Plans as Free Trials

For plans that start as free trials and convert to paid:

**Product 8: Solo Starter (Free Trial)**
1. Name: `Solo Starter`
2. Description: `Free starter plan for solo practitioners`
3. Monthly price: `$0.00 CAD` / `Monthly` / `Recurring`
4. Save and copy the IDs
5. Note: This plan has a 7-day trial built-in. After the trial, subscribers stay on the free plan with limited features.

**Product 9: Clinic Enterprise (Custom Pricing)**
1. Name: `Clinic Enterprise`
2. Description: `Enterprise plan with custom pricing for large clinics`
3. Monthly price: `$0.00 CAD` / `Monthly` / `Recurring`
4. Save and copy the IDs
5. Note: Enterprise customers contact sales. The $0 price acts as a placeholder for trial access. Custom pricing is negotiated offline.

---

## Step 4: Record Your Stripe IDs

After creating all products and prices, fill out this table with your IDs. You will need these for Step 5.

| Plan | Plan Key | Product ID | Monthly Price ID | Annual Price ID |
|------|----------|------------|-----------------|-----------------|
| Founding Member - Solo Pro | `founding_pro` | `prod_UJ7Hpthso65vp9` | `price_1TKV3LENg9JV38KPvwMlWAbc` | (none) |
| Solo Starter | `solo_starter` | `prod_UJ7S8EIqGBDus9` | `price_1TKVDlENg9JV38KPS9RqnIOs` | (none) |
| Solo Pro | `solo_pro` | `prod_UJ7RIElKpolNbT` | `price_1TKVCKENg9JV38KP2AJzF6At` | `price_1TKVCiENg9JV38KPhxXCWtI4` |
| Solo Advanced | `solo_advanced` | `prod_UJ7Q8HHxKqmEgH` | `price_1TKVBJENg9JV38KPKeGyOxDK` | `price_1TKVBbENg9JV38KP536Mv9tf` |
| Clinic Essential | `clinic_essential` | `prod_UJ7PJCqte7xBoT` | `price_1TKVAIENg9JV38KPsp17UJvP` | `price_1TKVAaENg9JV38KPg3sR5QYY` |
| Clinic Growth | `clinic_growth` | `prod_UJ7OArJwPkFOvn` | `price_1TKV9IENg9JV38KP9zVFhpdj` | `price_1TKV9hENg9JV38KP3fiYOgCS` |
| Clinic Enterprise | `clinic_enterprise` | `prod_UJ7NkumaGtQWGl` | `price_1TKV8RENg9JV38KPk0J6wyoL` | (none) |
| Pharmacy Standard | `pharmacy_standard` | `prod_UJ7Lj03T2amTju` | `price_1TKV7AENg9JV38KP6UWPBEkK` | `price_1TKV7WENg9JV38KPzyYRyJQU` |
| Pharmacy Plus | `pharmacy_plus` | `prod_UJ7Kbcgdbbobib` | `price_1TKV5XENg9JV38KPKrgAR2Vt` | `price_1TKV6GENg9JV38KPkL7uuEn5` |

---

## Step 5: Update the Database with Stripe IDs

Once you have all the IDs from Step 4, run the following SQL to link your database plans with Stripe. Replace each placeholder with your actual Stripe IDs.

```sql
-- Founding Member - Solo Pro ($69/month for life, 30-member cap)
UPDATE subscription_plans SET
  stripe_product_id = 'prod_REPLACE_ME',
  stripe_price_id_monthly = 'price_REPLACE_ME',
  updated_at = now()
WHERE plan_key = 'founding_pro';

-- Solo Starter (free trial)
UPDATE subscription_plans SET
  stripe_product_id = 'prod_REPLACE_ME',
  stripe_price_id_monthly = 'price_REPLACE_ME',
  updated_at = now()
WHERE plan_key = 'solo_starter';

-- Solo Pro
UPDATE subscription_plans SET
  stripe_product_id = 'prod_REPLACE_ME',
  stripe_price_id_monthly = 'price_REPLACE_ME',
  stripe_price_id_annual = 'price_REPLACE_ME',
  updated_at = now()
WHERE plan_key = 'solo_pro';

-- Solo Advanced
UPDATE subscription_plans SET
  stripe_product_id = 'prod_REPLACE_ME',
  stripe_price_id_monthly = 'price_REPLACE_ME',
  stripe_price_id_annual = 'price_REPLACE_ME',
  updated_at = now()
WHERE plan_key = 'solo_advanced';

-- Clinic Essential
UPDATE subscription_plans SET
  stripe_product_id = 'prod_REPLACE_ME',
  stripe_price_id_monthly = 'price_REPLACE_ME',
  stripe_price_id_annual = 'price_REPLACE_ME',
  updated_at = now()
WHERE plan_key = 'clinic_essential';

-- Clinic Growth
UPDATE subscription_plans SET
  stripe_product_id = 'prod_REPLACE_ME',
  stripe_price_id_monthly = 'price_REPLACE_ME',
  stripe_price_id_annual = 'price_REPLACE_ME',
  updated_at = now()
WHERE plan_key = 'clinic_growth';

-- Clinic Enterprise (custom pricing)
UPDATE subscription_plans SET
  stripe_product_id = 'prod_REPLACE_ME',
  stripe_price_id_monthly = 'price_REPLACE_ME',
  updated_at = now()
WHERE plan_key = 'clinic_enterprise';

-- Pharmacy Standard
UPDATE subscription_plans SET
  stripe_product_id = 'prod_REPLACE_ME',
  stripe_price_id_monthly = 'price_REPLACE_ME',
  stripe_price_id_annual = 'price_REPLACE_ME',
  updated_at = now()
WHERE plan_key = 'pharmacy_standard';

-- Pharmacy Plus
UPDATE subscription_plans SET
  stripe_product_id = 'prod_REPLACE_ME',
  stripe_price_id_monthly = 'price_REPLACE_ME',
  stripe_price_id_annual = 'price_REPLACE_ME',
  updated_at = now()
WHERE plan_key = 'pharmacy_plus';
```

**Verification:** After running the SQL, confirm the IDs are stored:

```sql
SELECT plan_key, stripe_product_id, stripe_price_id_monthly, stripe_price_id_annual
FROM subscription_plans
ORDER BY display_order;
```

All rows should now have Stripe IDs populated.

---

## Step 6: Set Up the Stripe Webhook

The webhook lets Stripe notify your app when payments succeed, fail, or subscriptions change. This is what makes recurring billing automatic.

1. Go to **Stripe Dashboard > Developers > Webhooks**
2. Click **"Add endpoint"**
3. Set the endpoint URL:
   - **For Supabase (current):** `https://kenwmclthgascryrdohj.supabase.co/functions/v1/stripe-webhook`
   - **For AWS (after migration):** `https://api.doktochain.ca/v1/webhooks/stripe`
4. Under **"Select events to listen to"**, click **"Select events"** and check these:

| Event | What It Does |
|-------|-------------|
| `checkout.session.completed` | Records new subscription after checkout completes |
| `customer.subscription.updated` | Syncs plan changes, trial endings, status changes |
| `customer.subscription.deleted` | Marks subscription as cancelled in your database |
| `invoice.paid` | Confirms successful recurring charge, renews subscription |
| `invoice.payment_failed` | Marks subscription as past due, notifies subscriber |
| `payment_intent.payment_failed` | Records one-time payment failures |
| `charge.refunded` | Processes refund records and notifies the patient |

5. Click **"Add endpoint"**
6. After creation, click the endpoint to view its details
7. Click **"Reveal"** next to **"Signing secret"** and copy it (starts with `whsec_`)

---

## Step 7: Store the Webhook Signing Secret

### For Supabase (Current Environment)

1. Go to https://supabase.com/dashboard/project/kenwmclthgascryrdohj/settings/functions
2. Under **"Edge Function Secrets"**, click **"Add new secret"**
3. Name: `STRIPE_WEBHOOK_SECRET`
4. Value: paste your `whsec_...` key
5. Click **"Save"**

### For AWS (After Migration)

```bash
aws secretsmanager create-secret \
  --name "doktochain-production/stripe-webhook-secret" \
  --secret-string "whsec_YOUR_KEY_HERE" \
  --region ca-central-1 \
  --profile doktochain-user
```

---

## Step 8: Test the Complete Flow

### 8.1: Verify the Webhook Is Receiving Events

1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Click your webhook endpoint
3. You should see a **"Send test webhook"** button at the top right
4. Select `checkout.session.completed` and click **"Send test webhook"**
5. The response should show `200 OK` with `{"received": true}`

If you get an error:
- `503` -- The `STRIPE_SECRET_KEY` is not set. Go back to Step 2.
- `400` -- The `STRIPE_WEBHOOK_SECRET` is wrong. Go back to Step 7.
- Timeout -- The edge function is not deployed. Check Supabase dashboard.

### 8.2: Test a Real Subscription Checkout

1. Log in to DoktoChain as a provider (or pharmacy/clinic)
2. Navigate to the plan selection / subscription page
3. Select a paid plan (e.g., "Solo Pro") and choose monthly billing
4. You should be redirected to a Stripe Checkout page
5. Use the test card number: `4242 4242 4242 4242`
   - Expiry: any future date (e.g., `12/34`)
   - CVC: any 3 digits (e.g., `123`)
   - Name/ZIP: any values
6. Complete the checkout
7. You should be redirected back to DoktoChain with a success message

### 8.3: Verify the Subscription Was Created

Check the database:

```sql
SELECT s.id, s.subscriber_id, s.status, s.billing_interval,
       s.stripe_subscription_id, s.stripe_customer_id,
       s.current_period_end, s.trial_end,
       p.plan_key, p.name as plan_name
FROM subscriptions s
JOIN subscription_plans p ON p.id = s.plan_id
ORDER BY s.created_at DESC
LIMIT 5;
```

You should see:
- `status`: `trialing` (because of the 7-day trial)
- `stripe_subscription_id`: a Stripe subscription ID (starts with `sub_`)
- `stripe_customer_id`: a Stripe customer ID (starts with `cus_`)
- `trial_end`: 7 days from now

### 8.4: Test Recurring Billing with Stripe Test Clocks

Stripe test clocks let you simulate time passing to test what happens when:
- A trial ends
- A recurring charge succeeds
- A recurring charge fails

1. Go to **Stripe Dashboard > Test Clocks** (under Billing)
2. Click **"Create test clock"**
3. Name: `DoktoChain Subscription Test`
4. Start date: today
5. Click **"Create"**
6. Add the test customer you just created (find them under Customers, they should have your test email)
7. **Advance time by 8 days** to simulate the trial ending
8. Check your database -- the subscription status should change from `trialing` to `active`
9. Check that a notification was sent: "Subscription Renewed"
10. **Advance time by 30 more days** to simulate the first recurring charge
11. Check the database again -- `current_period_end` should have updated
12. Check Stripe for the invoice -- it should show `paid`

### 8.5: Test Payment Failure

1. Using the test clock, update the customer's payment method to the decline card: `4000 0000 0000 0341`
2. Advance time to the next billing date
3. The payment should fail
4. Check your database -- subscription status should be `past_due`
5. Check that a notification was sent: "Subscription Payment Failed"

### 8.6: Test Cancellation

1. In the Stripe Dashboard, find the test subscription
2. Click **"Cancel subscription"** > **"Cancel immediately"**
3. Check your database -- status should be `cancelled`
4. Check that a notification was sent: "Subscription Cancelled"

---

## Step 9: Go Live (When Ready)

When you are satisfied with testing, switch from test mode to live mode:

1. In Stripe Dashboard, turn off **"Test mode"** toggle
2. **Recreate all products and prices** in live mode (Stripe products do not transfer between test and live mode)
3. Update the database with the new **live** Product and Price IDs (repeat Step 5)
4. Replace the **Secret key** with the live key (`sk_live_...`)
5. Create a new webhook endpoint with the **live** URL and copy the new signing secret
6. Replace the **Webhook signing secret** (`whsec_...`) with the live one
7. Test with a real card to confirm everything works

**IMPORTANT:** Never use test keys in production or live keys in development. The test/live separation is a safety measure.

---

## How Recurring Billing Works (Summary)

After setup, the recurring billing cycle is fully automatic:

```
Day 0:  Provider subscribes via Stripe Checkout
        -> checkout.session.completed webhook fires
        -> Subscription created with status "trialing"
        -> Trial period: 7 days

Day 7:  Trial ends, Stripe charges the card
        -> invoice.paid webhook fires
        -> Subscription status changes to "active"
        -> Notification: "Subscription Renewed"

Day 37: Next billing cycle, Stripe auto-charges
        -> invoice.paid webhook fires
        -> current_period_end updated
        -> Process repeats monthly (or annually)

If payment fails:
        -> invoice.payment_failed webhook fires
        -> Status changes to "past_due"
        -> Notification: "Payment Failed"
        -> Stripe retries per your retry settings

If subscriber cancels:
        -> customer.subscription.deleted webhook fires
        -> Status changes to "cancelled"
        -> Notification: "Subscription Cancelled"
```

No manual intervention is needed once set up. Stripe handles all charge attempts, retries, and card updates. Your webhook keeps the database in sync.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Checkout redirects to error page | `STRIPE_SECRET_KEY` not set | Add the secret per Step 2 |
| Webhook returns 503 | Edge function cannot read Stripe key | Verify secret name is exactly `STRIPE_SECRET_KEY` |
| Webhook returns 400 | Signature verification failed | Verify `STRIPE_WEBHOOK_SECRET` matches the endpoint |
| Subscription not created in DB | Webhook URL wrong or not reaching your function | Check Stripe webhook logs for delivery attempts |
| "Plan not found" error | Plan is inactive or ID mismatch | Check `subscription_plans` table, ensure `is_active = true` |
| No Stripe Price ID, fallback used | Step 5 not completed | Run the SQL updates in Step 5 with your real IDs |
| Customer charged wrong amount | Price mismatch between Stripe and DB | Compare prices in Stripe Dashboard vs `subscription_plans` table |

---

## Quick Reference: Secrets Checklist

| Secret Name | Where to Store | Status |
|-------------|---------------|--------|
| `STRIPE_SECRET_KEY` | Supabase Edge Function Secrets | Needs to be added |
| `STRIPE_WEBHOOK_SECRET` | Supabase Edge Function Secrets | Needs to be added (after Step 6) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `.env` file (frontend only) | Already configured |

---

## Related Files

| File | Purpose |
|------|---------|
| `supabase/functions/create-subscription-checkout/index.ts` | Creates Stripe Checkout sessions for subscriptions |
| `supabase/functions/stripe-webhook/index.ts` | Processes all Stripe webhook events |
| `src/services/subscriptionService.ts` | Frontend subscription management |
| `src/services/paymentService.ts` | Frontend payment processing |
| `src/app/dashboard/admin/finance/subscriptions/page.tsx` | Admin subscription management UI |
| `src/app/dashboard/provider/billing/earnings/page.tsx` | Provider earnings dashboard |
| `src/app/dashboard/patient/billing/page.tsx` | Patient billing interface |
