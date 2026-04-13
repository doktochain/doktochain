import { api } from './api-client';

const TOKEN_KEYS = {
  idToken: 'doktochain_id_token',
  accessToken: 'doktochain_access_token',
  refreshToken: 'doktochain_refresh_token',
  user: 'doktochain_user',
} as const;

export interface CognitoUser {
  id: string;
  email: string;
  role: string;
  groups: string[];
}

interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

interface SignUpParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
}

interface SignInResult {
  user: CognitoUser;
  tokens: AuthTokens;
}

interface SignUpResult {
  user: CognitoUser;
  tokens: AuthTokens;
}

type AuthStateListener = (user: CognitoUser | null) => void;

const listeners: Set<AuthStateListener> = new Set();

function notifyListeners(user: CognitoUser | null) {
  listeners.forEach((fn) => fn(user));
}

function storeSession(tokens: AuthTokens, user: CognitoUser) {
  localStorage.setItem(TOKEN_KEYS.idToken, tokens.idToken);
  localStorage.setItem(TOKEN_KEYS.accessToken, tokens.accessToken);
  localStorage.setItem(TOKEN_KEYS.refreshToken, tokens.refreshToken);
  localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEYS.idToken);
  localStorage.removeItem(TOKEN_KEYS.accessToken);
  localStorage.removeItem(TOKEN_KEYS.refreshToken);
  localStorage.removeItem(TOKEN_KEYS.user);
}

function getStoredUser(): CognitoUser | null {
  const raw = localStorage.getItem(TOKEN_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CognitoUser;
  } catch {
    return null;
  }
}

function hasValidToken(): boolean {
  const token = localStorage.getItem(TOKEN_KEYS.idToken);
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    return Date.now() < exp - 60000;
  } catch {
    return false;
  }
}

export const authClient = {
  async signUp(params: SignUpParams): Promise<SignUpResult> {
    const { data, error } = await api.post<SignUpResult>('/auth/register', {
      email: params.email,
      password: params.password,
      firstName: params.firstName,
      lastName: params.lastName,
      role: params.role,
      phone: params.phone,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Registration failed');
    }

    storeSession(data.tokens, data.user);
    notifyListeners(data.user);
    return data;
  },

  async signIn(email: string, password: string): Promise<SignInResult> {
    const { data, error } = await api.post<SignInResult>('/auth/login', {
      email,
      password,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Login failed');
    }

    storeSession(data.tokens, data.user);
    notifyListeners(data.user);
    return data;
  },

  async signOut(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Sign out locally even if server call fails
    }
    clearSession();
    notifyListeners(null);
  },

  async refreshSession(): Promise<boolean> {
    const refreshToken = localStorage.getItem(TOKEN_KEYS.refreshToken);
    if (!refreshToken) return false;

    const { data, error } = await api.post<AuthTokens>('/auth/refresh', {
      refreshToken,
    });

    if (error || !data) {
      clearSession();
      notifyListeners(null);
      return false;
    }

    const user = getStoredUser();
    if (user) {
      storeSession(data, user);
    }
    return true;
  },

  async forgotPassword(email: string): Promise<void> {
    const { error } = await api.post('/auth/forgot-password', { email });
    if (error) throw new Error(error.message);
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const { error } = await api.post('/auth/reset-password', {
      email,
      code,
      newPassword,
    });
    if (error) throw new Error(error.message);
  },

  getUser(): CognitoUser | null {
    if (!hasValidToken()) {
      return null;
    }
    return getStoredUser();
  },

  getIdToken(): string | null {
    return localStorage.getItem(TOKEN_KEYS.idToken);
  },

  isAuthenticated(): boolean {
    return hasValidToken() && getStoredUser() !== null;
  },

  onAuthStateChange(listener: AuthStateListener): () => void {
    listeners.add(listener);

    const sessionExpiredHandler = () => {
      clearSession();
      listener(null);
    };
    window.addEventListener('auth:session-expired', sessionExpiredHandler);

    return () => {
      listeners.delete(listener);
      window.removeEventListener('auth:session-expired', sessionExpiredHandler);
    };
  },

  async initSession(): Promise<CognitoUser | null> {
    if (hasValidToken()) {
      return getStoredUser();
    }

    const refreshToken = localStorage.getItem(TOKEN_KEYS.refreshToken);
    if (refreshToken) {
      const refreshed = await this.refreshSession();
      if (refreshed) {
        return getStoredUser();
      }
    }

    clearSession();
    return null;
  },
};
