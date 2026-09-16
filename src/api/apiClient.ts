import axios, { AxiosError } from 'axios';
import { env } from '../config/env';
import { secureStorage } from '../services/secureStorage';
import { useAuthStore } from '../store/authStore';
import type { ApiEnvelope } from '../types/api';
export class ApiError extends Error { constructor(message: string, public status?: number) { super(message); this.name = 'ApiError'; } }
export const apiClient = axios.create({ baseURL: env.apiBaseUrl, timeout: 15000, headers: { Accept: 'application/json', 'Content-Type': 'application/json' } });
export const authApi = { requestOtp: (mobile: string) => apiClient.post('/api/auth/request-otp', { mobile }), verifyOtp: (mobile: string, otp: string, role: string) => apiClient.post('/api/auth/verify-otp', { mobile, otp, role }) };
apiClient.interceptors.request.use(async (config) => { const token = useAuthStore.getState().accessToken || await secureStorage.getAccessToken(); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
apiClient.interceptors.response.use((response) => { const body = response.data as ApiEnvelope<unknown>; if (body?.success === false) throw new ApiError(body.message || 'API request failed', response.status); response.data = body?.success === true ? body.data : response.data; return response; }, async (error: unknown) => { const e = error as AxiosError<{ message?: string }>; if (e.response?.status === 401) await useAuthStore.getState().clearSession(); throw new ApiError(e.response?.data?.message || e.message || 'Unable to reach the API', e.response?.status); });
