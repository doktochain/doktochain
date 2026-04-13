/*
  # Create Provider Schedule Tables

  1. New Tables
    - provider_time_blocks: Weekly recurring availability
    - provider_unavailability: One-time or recurring time off
    
  2. Security
    - Enable RLS
    - Providers manage their own schedules
    - Public can view provider availability
*/

-- Create provider_time_blocks table
CREATE TABLE IF NOT EXISTS provider_time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6) NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  block_type text CHECK (block_type IN ('available', 'break', 'administrative')) DEFAULT 'available',
  appointment_type text CHECK (appointment_type IN ('in-person', 'virtual', 'both')) DEFAULT 'both',
  location_id uuid REFERENCES provider_locations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create provider_unavailability table
CREATE TABLE IF NOT EXISTS provider_unavailability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_provider_time_blocks_provider_id ON provider_time_blocks(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_time_blocks_day ON provider_time_blocks(day_of_week);
CREATE INDEX IF NOT EXISTS idx_provider_unavailability_provider_id ON provider_unavailability(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_unavailability_dates ON provider_unavailability(start_date, end_date);

-- Enable RLS
ALTER TABLE provider_time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_unavailability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_time_blocks
CREATE POLICY "Public can view provider time blocks"
  ON provider_time_blocks
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Providers can insert own time blocks"
  ON provider_time_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can update own time blocks"
  ON provider_time_blocks
  FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can delete own time blocks"
  ON provider_time_blocks
  FOR DELETE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

-- RLS Policies for provider_unavailability
CREATE POLICY "Public can view provider unavailability"
  ON provider_unavailability
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Providers can insert own unavailability"
  ON provider_unavailability
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can update own unavailability"
  ON provider_unavailability
  FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can delete own unavailability"
  ON provider_unavailability
  FOR DELETE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );