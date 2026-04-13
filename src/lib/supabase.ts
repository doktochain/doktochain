import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const USE_AWS = !!import.meta.env.VITE_API_URL;

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = supabaseInstance || createClient(
  'https://placeholder.supabase.co',
  'placeholder-key',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const getCurrentUser = async () => {
  if (USE_AWS) {
    const { authClient } = await import('./auth-client');
    const cognitoUser = authClient.getUser();
    if (cognitoUser) {
      return { id: cognitoUser.id, email: cognitoUser.email };
    }
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getUserProfile = async (userId: string) => {
  if (USE_AWS) {
    try {
      const { api } = await import('./api-client');
      const { data } = await api.get(`/auth/me`);
      return data;
    } catch {
      // Fall through to Supabase
    }
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getUserRoles = async (userId: string) => {
  if (USE_AWS) {
    try {
      const { authClient } = await import('./auth-client');
      const cognitoUser = authClient.getUser();
      if (cognitoUser) {
        return cognitoUser.groups.length > 0 ? cognitoUser.groups : [cognitoUser.role || 'patient'];
      }
    } catch {
      // Fall through to Supabase
    }
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.role ? [data.role] : ['patient'];
};
