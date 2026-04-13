/*
  # Add Self-Registration RLS Policies

  1. Changes
    - Add INSERT policy on `user_profiles` so newly authenticated users can create their own profile (id must match auth.uid())
    - Add INSERT policy on `user_roles` so newly authenticated users can assign themselves a role (user_id must match auth.uid())
    - Add INSERT policy on `clinics` so newly authenticated users can create a clinic they own (owner_id must match auth.uid())

  2. Security
    - All policies restrict inserts to the authenticated user's own records only
    - Users cannot create profiles or roles for other users
    - Clinic owners can only create clinics where they are the owner

  3. Important Notes
    - These policies enable the self-service registration flow
    - Without these policies, only admins could create profiles, which broke registration for all non-admin roles
*/

CREATE POLICY "Users can insert own profile on registration"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own role on registration"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic owners can insert own clinic"
  ON clinics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);
