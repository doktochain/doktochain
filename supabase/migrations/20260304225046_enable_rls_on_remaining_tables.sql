/*
  # Enable RLS on tables missing it

  1. Changes
    - Enable RLS on `drug_interactions` (reference data, readable by all authenticated)
    - Enable RLS on `prescription_safety_alerts` (reference data, readable by all authenticated)
  
  2. Security
    - Both tables are reference/lookup data
    - All authenticated users can read
    - Only admins can write
*/

ALTER TABLE drug_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view drug interactions"
  ON drug_interactions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert drug interactions"
  ON drug_interactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can update drug interactions"
  ON drug_interactions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

ALTER TABLE prescription_safety_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view safety alerts"
  ON prescription_safety_alerts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert safety alerts"
  ON prescription_safety_alerts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can update safety alerts"
  ON prescription_safety_alerts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));
