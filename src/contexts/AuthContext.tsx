import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { authClient, CognitoUser } from '../lib/auth-client';
import { api } from '../lib/api-client';
import { auditLog } from '../services/auditLogger';

const USE_AWS = !!import.meta.env.VITE_API_URL;

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  profile_photo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string;
  language_preference: string;
  role: 'patient' | 'provider' | 'admin' | 'pharmacy' | 'clinic';
  terms_accepted_at?: string | null;
  privacy_accepted_at?: string | null;
  terms_version?: string | null;
  privacy_version?: string | null;
}

interface AuthUser {
  id: string;
  email?: string;
}

interface AuthSession {
  access_token: string;
  user: AuthUser;
}

interface AuthStateContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  userProfile: UserProfile | null;
  roles: string[];
  session: AuthSession | null;
  loading: boolean;
  hasRole: (role: string) => boolean;
}

interface AuthActionsContextType {
  signUp: (email: string, password: string, userData: Partial<UserProfile>, role?: string) => Promise<AuthUser | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

type AuthContextType = AuthStateContextType & AuthActionsContextType;

const AuthStateContext = createContext<AuthStateContextType | undefined>(undefined);
const AuthActionsContext = createContext<AuthActionsContextType | undefined>(undefined);

export const useAuthState = () => {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthState must be used within AuthProvider');
  }
  return context;
};

export const useAuthActions = () => {
  const context = useContext(AuthActionsContext);
  if (!context) {
    throw new Error('useAuthActions must be used within AuthProvider');
  }
  return context;
};

export const useAuth = (): AuthContextType => {
  const state = useAuthState();
  const actions = useAuthActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
};

interface AuthProviderProps {
  children: ReactNode;
}

function cognitoUserToAuthUser(cognitoUser: CognitoUser): AuthUser {
  return { id: cognitoUser.id, email: cognitoUser.email };
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserDataSupabase = useCallback(async (authUser: AuthUser) => {
    try {
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (userProfile) {
        setProfile(userProfile as UserProfile);
        setRoles(userProfile.role ? [userProfile.role] : ['patient']);
      }
    } catch {
      setRoles(['patient']);
    }
  }, []);

const loadUserDataAWS = useCallback(async (_authUser: AuthUser) => {
  try {
    const { data: profile } = await api.get<UserProfile>('/auth/me');
    if (profile) {
      setProfile(profile);
      setRoles(profile.role ? [profile.role] : ['patient']);
      return;
    }
  } catch {
    const cognitoUser = authClient.getUser();
    if (cognitoUser) {
      setRoles(cognitoUser.groups.length > 0 ? cognitoUser.groups : [cognitoUser.role || 'patient']);
    }
  }
}, []);

  const loadUserData = USE_AWS ? loadUserDataAWS : loadUserDataSupabase;

  useEffect(() => {
    if (USE_AWS) {
      const initCognito = async () => {
        try {
          const cognitoUser = await authClient.initSession();
          if (cognitoUser) {
            const authUser = cognitoUserToAuthUser(cognitoUser);
            const token = authClient.getIdToken();
            setUser(authUser);
            setSession(token ? { access_token: token, user: authUser } : null);
            await loadUserData(authUser);
          }
        } catch {
          // Session expired or invalid
        } finally {
          setLoading(false);
        }
      };

      initCognito();

      const unsubscribe = authClient.onAuthStateChange((cognitoUser) => {
        if (cognitoUser) {
          const authUser = cognitoUserToAuthUser(cognitoUser);
          const token = authClient.getIdToken();
          setUser(authUser);
          setSession(token ? { access_token: token, user: authUser } : null);
          setLoading(true);
          loadUserData(authUser).finally(() => setLoading(false));
        } else {
          setUser(null);
          setProfile(null);
          setRoles([]);
          setSession(null);
          setLoading(false);
        }
      });

      return () => { unsubscribe(); };
    }

    const initSupabase = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user) {
          const authUser: AuthUser = { id: currentSession.user.id, email: currentSession.user.email };
          setUser(authUser);
          setSession({ access_token: currentSession.access_token, user: authUser });
          await loadUserData(authUser);
        }
      } catch {
        // Session expired or invalid
      } finally {
        setLoading(false);
      }
    };

    initSupabase();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession?.user) {
        const authUser: AuthUser = { id: newSession.user.id, email: newSession.user.email };
        setUser(authUser);
        setSession({ access_token: newSession.access_token, user: authUser });
        setLoading(true);
        loadUserData(authUser).finally(() => setLoading(false));
      } else {
        setUser(null);
        setProfile(null);
        setRoles([]);
        setSession(null);
        setLoading(false);
      }
    });

    return () => { subscription.unsubscribe(); };
  }, [loadUserData]);

  const hasRole = useCallback((role: string): boolean => {
    return roles.includes(role);
  }, [roles]);

  const signUp = useCallback(async (email: string, password: string, userData: Partial<UserProfile>, role: string = 'patient'): Promise<AuthUser | null> => {
    if (USE_AWS) {
      const result = await authClient.signUp({
        email,
        password,
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        role,
        phone: userData.phone || undefined,
      });

      if (!result.user) throw new Error('User creation failed');

      const authUser = cognitoUserToAuthUser(result.user);
      setUser(authUser);
      setSession({ access_token: result.tokens.idToken, user: authUser });
      await loadUserData(authUser);
      return authUser;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          role,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('User creation failed');

    const authUser: AuthUser = { id: data.user.id, email: data.user.email };
    return authUser;
  }, [loadUserData]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (USE_AWS) {
      const result = await authClient.signIn(email, password);
      const authUser = cognitoUserToAuthUser(result.user);

      setUser(authUser);
      setSession({ access_token: result.tokens.idToken, user: authUser });
      await loadUserData(authUser);

      try {
        await auditLog.userLogin(authUser.id, { email: authUser.email, login_method: 'email_password' });
      } catch {}
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const authUser: AuthUser = { id: data.user.id, email: data.user.email };
    setUser(authUser);
    setSession({ access_token: data.session.access_token, user: authUser });
    await loadUserData(authUser);

    try {
      await auditLog.userLogin(authUser.id, { email: authUser.email, login_method: 'email_password' });
    } catch {}
  }, [loadUserData]);

  const signOut = useCallback(async () => {
    const currentUserId = user?.id;

    if (USE_AWS) {
      await authClient.signOut();
    } else {
      await supabase.auth.signOut();
    }

    if (currentUserId) {
      try {
        await auditLog.userLogout(currentUserId);
      } catch {}
    }

    setUser(null);
    setProfile(null);
    setRoles([]);
    setSession(null);
  }, [user?.id]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    if (USE_AWS) {
      const { error } = await api.put(`/patients/profile/${user.id}`, updates);
      if (error) throw new Error(error.message);

      const { data: updatedProfile } = await api.get<UserProfile>(`/patients/profile/${user.id}`);
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;

    const { data: updatedProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (updatedProfile) {
      setProfile(updatedProfile as UserProfile);
    }
  }, [user]);

  const stateValue = useMemo<AuthStateContextType>(() => ({
    user,
    profile,
    userProfile: profile,
    roles,
    session,
    loading,
    hasRole,
  }), [user, profile, roles, session, loading, hasRole]);

  const actionsValue = useMemo<AuthActionsContextType>(() => ({
    signUp,
    signIn,
    signOut,
    updateProfile,
  }), [signUp, signIn, signOut, updateProfile]);

  return (
    <AuthStateContext.Provider value={stateValue}>
      <AuthActionsContext.Provider value={actionsValue}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
};
