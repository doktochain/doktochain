/*
  # Add Stripe Price IDs to Subscription Plans

  1. Modified Tables
    - `subscription_plans`
      - `stripe_product_id` (text, nullable) - Stripe Product ID for this plan
      - `stripe_price_id_monthly` (text, nullable) - Stripe Price ID for monthly billing
      - `stripe_price_id_annual` (text, nullable) - Stripe Price ID for annual billing
      - `trial_days` (integer, default 7) - Number of trial days for paid plans

  2. Important Notes
    - These columns are nullable because free plans and custom pricing plans do not have Stripe IDs
    - The trial_days column defaults to 7 for the 7-day free trial policy
    - Admins must populate stripe_product_id and stripe_price_id columns with real Stripe IDs from their Stripe Dashboard
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'stripe_product_id'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN stripe_product_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'stripe_price_id_monthly'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN stripe_price_id_monthly text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'stripe_price_id_annual'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN stripe_price_id_annual text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'trial_days'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN trial_days integer NOT NULL DEFAULT 7;
  END IF;
END $$;
