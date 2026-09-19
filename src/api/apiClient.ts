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
};
apiClient.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().accessToken || (await secureStorage.getAccessToken());
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const finalUrl = `${config.baseURL || ''}${config.url || ''}${config.params ? `?${new URLSearchParams(config.params as Record<string, string>).toString()}` : ''}`;
  if (config.url === '/api/fixtures') console.log('[API] fixtures URL:', finalUrl);
  if (!env.isProduction && config.url?.startsWith('/api/auth/'))
    console.log('[OTP] API base URL:', config.baseURL, 'request URL:', finalUrl);
  return config;
});
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as ApiEnvelope<unknown>;
    if (body?.success === false)
      throw new ApiError(body.message || 'API request failed', response.status);
    response.data = body?.success === true ? body.data : response.data;
    return response;
  },
  async (error: unknown) => {
    const e = error as AxiosError<{ message?: string }>;
    if (e.response?.status === 401) await useAuthStore.getState().expireSession();
    const detail = e.response?.data?.message || e.message || 'Unable to reach the API';
    const message = env.isProduction
      ? detail
      : e.response
        ? `HTTP ${e.response.status}: ${detail}`
        : `Network error: ${detail}`;
    throw new ApiError(message, e.response?.status);
  },
);
