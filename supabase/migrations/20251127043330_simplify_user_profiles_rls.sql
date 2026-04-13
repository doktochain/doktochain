/*
  # Simplify user_profiles RLS policies

  1. Problem
    - Admin policies are causing 500 errors due to complex permission checks
    - Need to simplify to just basic user access
    
  2. Solution
    - Drop all admin policies
    - Keep only basic user policies (view/update own profile)
    - Admins can use service role key for management operations
    
  3. Changes
    - Drop: All admin-related policies
    - Keep: Users can view/update their own profiles
*/

-- Drop all admin policies
DROP POLICY IF EXISTS "Admins can view all profiles via user_roles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles via user_roles" ON user_profiles;

-- The basic user policies remain:
-- "Users can view own profile" - allows SELECT where auth.uid() = id
-- "Users can update own profile" - allows UPDATE where auth.uid() = id