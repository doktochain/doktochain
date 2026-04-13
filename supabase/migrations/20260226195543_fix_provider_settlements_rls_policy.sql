/*
  # Fix Provider Settlements RLS Policy

  1. Changes
    - Drop existing provider SELECT policy that incorrectly compares auth.uid() to provider_id
    - Create corrected policy that joins through providers table to match user_id

  2. Security
    - Providers can only view settlements linked to their provider record
*/

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'provider_settlements' 
    AND policyname = 'Providers can view own settlements'
  ) THEN
    DROP POLICY "Providers can view own settlements" ON provider_settlements;
  END IF;
END $$;

CREATE POLICY "Providers can view own settlements"
  ON provider_settlements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = provider_settlements.provider_id
      AND providers.user_id = auth.uid()
    )
  );
