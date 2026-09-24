import axios, { AxiosError } from 'axios';
import { env } from '../config/env';
import { secureStorage } from '../services/secureStorage';
import { useAuthStore } from '../store/authStore';
import type { ApiEnvelope } from '../types/api';
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});
// Only these /api/auth/* routes are unauthenticated (backend auth.routes.js) — they never carry a
// Bearer token, so a 401 from them can't be fixed by refreshing one. /api/auth/select-workspace is
// NOT in this list: it requires a valid Bearer token (backend rejects with 401 if missing/expired),
// so it must go through the normal refresh-and-retry path like any other authenticated endpoint.
const PUBLIC_AUTH_PATHS = [
  '/api/auth/request-otp',
  '/api/auth/verify-otp',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
];
const isPublicAuthPath = (url?: string) => Boolean(url && PUBLIC_AUTH_PATHS.some((path) => url.includes(path)));
export const normalizeAuthMobile = (mobile: string) => {
  const value = mobile.replace(/\s/g, '');
  return /^\d{10}$/.test(value) ? `+91${value}` : value;
};
export const normalizeAuthMobileDisplay = (mobile: string) => {
  const value = mobile.replace(/\s/g, '');
  const digits = value.replace(/\D/g, '');
  return digits.length >= 12 && digits.startsWith('91')
    ? digits.slice(2).slice(-10)
    : digits.slice(-10);
};
export const authApi = {
  requestOtp: (mobile: string) =>
    apiClient.post('/api/auth/request-otp', { mobile: normalizeAuthMobile(mobile) }),
  // Backend contract (docs/auth.md in badminton-api): POST /api/auth/verify-otp requires
  // {mobile, otp, role} together — role is not optional and there is no separate
  // "select workspace after verifying" endpoint, so it must be collected before this call.
  verifyOtp: (mobile: string, otp: string, role: 'PLAYER' | 'ORGANIZER' | 'ADMIN') =>
    apiClient.post('/api/auth/verify-otp', { mobile: normalizeAuthMobile(mobile), otp, role }),
  selectWorkspace: (workspace: 'PLAYER' | 'ORGANIZER' | 'ADMIN') =>
    apiClient.post('/api/auth/select-workspace', { workspace }),
  logout: async () => {
    const refreshToken = await secureStorage.getRefreshToken();
    if (refreshToken) await axios.post(`${env.apiBaseUrl}/api/auth/logout`, { refreshToken }, { timeout: 10000 });
  },
};
let refreshInFlight: Promise<string | null> | null = null;
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await secureStorage.getRefreshToken();
  if (__DEV__) console.info('[AUTH DEBUG]', { 'REFRESH TOKEN PRESENT': Boolean(refreshToken) });
  if (!refreshToken) return null;
  let response;
  try {
    response = await axios.post(`${env.apiBaseUrl}/api/auth/refresh`, { refreshToken }, { timeout: 15000 });
    if (__DEV__) console.info('[AUTH DEBUG]', { 'REFRESH STATUS': response.status });
  } catch (refreshError: any) {
    if (__DEV__) console.info('[AUTH DEBUG]', { 'REFRESH STATUS': refreshError?.response?.status || 'NETWORK_ERROR' });
    throw refreshError;
  }
  const body = response.data?.data ?? response.data;
  if (!body?.accessToken || !body?.refreshToken || !body?.user) return null;
  await useAuthStore.getState().setAccessSession(body.accessToken, body.refreshToken, body.user);
  return body.accessToken;
}
function sharedRefresh() {
  if (!refreshInFlight) refreshInFlight = refreshAccessToken().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}
apiClient.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().accessToken || (await secureStorage.getAccessToken());
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const finalUrl = `${config.baseURL || ''}${config.url || ''}${config.params ? `?${new URLSearchParams(config.params as Record<string, string>).toString()}` : ''}`;
  if (__DEV__) {
    console.info('[HOME API DEBUG]', {
      Environment: env.isProduction ? 'production' : 'development',
      'Base URL': config.baseURL || env.apiBaseUrl,
      Method: config.method?.toUpperCase() || 'GET',
      Path: config.url,
      'Final URL': finalUrl,
    });
    console.info('[AUTH DEBUG]', {
      'ACCESS TOKEN EXISTS': Boolean(token),
      WORKSPACE: useAuthStore.getState().activeWorkspace || 'NONE',
      'REQUEST PATH': config.url,
    });
  }
  return config;
});
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as ApiEnvelope<unknown>;
    if (__DEV__) {
      const data: any = body?.success === true ? body.data : response.data;
      const path = response.config.url || '';
      const summary: Record<string, unknown> = {
        'HTTP status': response.status,
        Path: path,
      };
      if (path === '/api/tournaments') {
        const tournaments = Array.isArray(data) ? data : [];
        summary['Tournament response count'] = tournaments.length;
        summary['Tournament IDs'] = tournaments.map((item: any) => item?.id).filter(Boolean);
        summary['Tournament names'] = tournaments.map((item: any) => item?.name).filter(Boolean);
      } else if (path.startsWith('/api/registrations/player/')) {
        summary['Registration count'] = Array.isArray(data) ? data.length : 0;
      } else if (path === '/api/notifications/unread-count') {
        summary['Notification count'] = data?.count ?? 0;
      } else if (path === '/api/players/' || path.startsWith('/api/players/')) {
        summary['Profile response'] = data ? 'present' : 'empty';
      }
      console.info('[HOME API DEBUG]', summary);
    }
    if (body?.success === false)
      throw new ApiError(body.message || 'API request failed', response.status);
    response.data = body?.success === true ? body.data : response.data;
    return response;
  },
  async (error: unknown) => {
    const e = error as AxiosError<{ message?: string }>;
    const detail = e.response?.data?.message || e.message || 'Unable to reach the API';
    if (!env.isProduction && e.response) {
      console.info('[Auth] API authentication failure', {
        status: e.response.status,
        url: e.config?.url,
        message: detail,
      });
    }
    const config = e.config as (typeof e.config & { _authRetry?: boolean }) | undefined;
    if (__DEV__) {
      console.info('[AUTH DEBUG]', {
        'REQUEST PATH': config?.url,
        'INITIAL STATUS': e.response?.status || 'NETWORK_ERROR',
        'REFRESH ATTEMPTED': e.response?.status === 401 && !isPublicAuthPath(config?.url),
      });
    }
    if (e.response?.status === 401 && config && !config._authRetry && !isPublicAuthPath(config.url)) {
      try {
        const accessToken = await sharedRefresh();
        if (accessToken) {
          config._authRetry = true;
          config.headers.Authorization = `Bearer ${accessToken}`;
          const retryResponse = await apiClient.request(config);
          if (__DEV__) console.info('[AUTH DEBUG]', { 'RETRY STATUS': retryResponse.status });
          return retryResponse;
        }
      } catch (refreshError: any) {
        const status = refreshError?.response?.status;
        if (status && status >= 400 && status < 500)
          await useAuthStore.getState().expireSession('REFRESH_REVOKED_OR_ACCOUNT_INVALID');
      }
    }
    // 403 is an authorization/profile error, not an expired session. Preserve the
    // authenticated session so the UI can show the actual requirement and the user
    // can recover without being redirected to Login.
    const message = env.isProduction
      ? detail
      : e.response
        ? `HTTP ${e.response.status}: ${detail}`
        : `Network error: ${detail}`;
    throw new ApiError(message, e.response?.status);
  },
);
