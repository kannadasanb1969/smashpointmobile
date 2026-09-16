const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const production = process.env.EXPO_PUBLIC_API_BASE_URL_PRODUCTION?.trim();
const apiBaseUrl = production && process.env.NODE_ENV === 'production' ? production : configured || 'http://localhost:8787';
export const env = { apiBaseUrl, isConfigured: Boolean(configured || production), isProduction: process.env.NODE_ENV === 'production' };
