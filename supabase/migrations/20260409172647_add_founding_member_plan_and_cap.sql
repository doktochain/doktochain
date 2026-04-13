/*
  # Add Founding Member Plan and Cap Tracking

  1. New Data
    - `founding_pro` plan in `subscription_plans` table
      - Same features as Solo Pro
      - $69/month (locked for life), no annual option
      - Limited to 30 members
      - `display_order` 15 (between Solo Starter at 10 and Solo Pro at 20)

  2. New Table
    - `founding_member_slots` - tracks the cap and usage
      - `id` (uuid, primary key)
      - `max_slots` (integer, default 30)
      - `plan_key` (text, references the founding plan)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on `founding_member_slots`
    - Authenticated users can read slot availability
    - Only service role can modify
*/

INSERT INTO subscription_plans (
  plan_key, name, target_role, tier,
  monthly_price_cad, annual_price_cad,
  seats_included, per_extra_seat_cad,
  transaction_commission_pct,
  is_free, is_custom_pricing, is_popular, is_active,
  features, description, display_order, trial_days
)
SELECT
  'founding_pro',
  'Founding Member - Solo Pro',
  'provider',
  'founding',
  69.00,
  NULL,
  NULL,
  NULL,
  2.50,
  false,
  false,
  false,
  true,
  features,
  'Solo Pro at $69/month for life. Limited to the first 30 providers.',
  15,
  7
FROM subscription_plans
WHERE plan_key = 'solo_pro'
AND NOT EXISTS (
  SELECT 1 FROM subscription_plans WHERE plan_key = 'founding_pro'
);

CREATE TABLE IF NOT EXISTS founding_member_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL DEFAULT 'founding_pro',
  max_slots integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE founding_member_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read founding slots"
  ON founding_member_slots
  FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO founding_member_slots (plan_key, max_slots)
SELECT 'founding_pro', 30
WHERE NOT EXISTS (
  SELECT 1 FROM founding_member_slots WHERE plan_key = 'founding_pro'
);
