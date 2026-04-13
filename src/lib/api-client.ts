const API_BASE_URL = import.meta.env.VITE_API_URL || '';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

interface ApiResponse<T = unknown> {
  data: T | null;
  error: ApiError | null;
  status: number;
}

interface ApiError {
  message: string;
  status: number;
  code?: string;
}

function getStoredTokens(): { idToken: string | null; accessToken: string | null } {
  const idToken = localStorage.getItem('doktochain_id_token');
  const accessToken = localStorage.getItem('doktochain_access_token');
  return { idToken, accessToken };
}

const DOMAIN_PREFIXES = new Set([
  'auth', 'admin', 'patients', 'providers', 'appointments', 'prescriptions',
  'pharmacy', 'health-records', 'messaging', 'clinic', 'audit', 'billing',
  'telemedicine', 'storage', 'public', 'webhooks', 'data', 'rpc',
]);

function resolvePath(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const firstSegment = cleanPath.split('/')[1];
  if (DOMAIN_PREFIXES.has(firstSegment)) {
    return cleanPath;
  }
  return `/data${cleanPath}`;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const resolvedPath = resolvePath(path);
  const url = new URL(`${API_BASE_URL}${resolvedPath}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function request<T>(method: HttpMethod, path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
  const { idToken } = getStoredTokens();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const url = buildUrl(path, options?.params);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });

    if (response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        const { idToken: newToken } = getStoredTokens();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
        }
        const retryResponse = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: options?.signal,
        });
        return parseResponse<T>(retryResponse);
      }
      clearTokens();
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
      return {
        data: null,
        error: { message: 'Session expired', status: 401 },
        status: 401,
      };
    }

    return parseResponse<T>(response);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        data: null,
        error: { message: 'Request aborted', status: 0, code: 'ABORTED' },
        status: 0,
      };
    }
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Network error',
        status: 0,
        code: 'NETWORK_ERROR',
      },
      status: 0,
    };
  }
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  let data: T | null = null;

  if (response.status !== 204) {
    try {
      const json = await response.json();
      if (response.ok) {
        data = json as T;
      } else {
        return {
          data: null,
          error: {
            message: json.error || json.message || 'Request failed',
            status: response.status,
            code: json.code,
          },
          status: response.status,
        };
      }
    } catch {
      if (!response.ok) {
        return {
          data: null,
          error: { message: `HTTP ${response.status}`, status: response.status },
          status: response.status,
        };
      }
    }
  }

  return { data, error: null, status: response.status };
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = doRefreshToken().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function doRefreshToken(): Promise<boolean> {
  const token = localStorage.getItem('doktochain_refresh_token');
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (data.idToken) {
      localStorage.setItem('doktochain_id_token', data.idToken);
      localStorage.setItem('doktochain_access_token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('doktochain_refresh_token', data.refreshToken);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function clearTokens() {
  localStorage.removeItem('doktochain_id_token');
  localStorage.removeItem('doktochain_access_token');
  localStorage.removeItem('doktochain_refresh_token');
}

export const api = {
  get: <T = unknown>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, undefined, options),

  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),

  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),

  patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),

  delete: <T = unknown>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};

export type { ApiResponse, ApiError, RequestOptions };
