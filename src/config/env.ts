import { Platform } from 'react-native';

// Helper to get localhost-equivalent URL for current platform
const getLocalhostUrl = (port: number): string => {
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to reach host localhost
    // Physical Android devices should use actual LAN IP (set via env var)
    return `http://10.0.2.2:${port}`;
  }
  // iOS simulator and web use localhost
  return `http://localhost:${port}`;
};

const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const production = process.env.EXPO_PUBLIC_API_BASE_URL_PRODUCTION?.trim();
const isProduction = process.env.NODE_ENV === 'production';

const resolveConfiguredUrl = (value: string | undefined) => {
  if (!value || Platform.OS !== 'android' || isProduction) return value;
  return value.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/i, '$110.0.2.2');
};

// If explicitly configured, use that value (for physical devices, etc.)
// Otherwise, in development, use platform-appropriate localhost
const apiBaseUrl = isProduction
  ? production || configured || ''
  : resolveConfiguredUrl(configured) || getLocalhostUrl(8787);

export const env = { apiBaseUrl, isConfigured: Boolean(configured || production), isProduction };
