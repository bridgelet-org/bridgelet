/**
 * Centralized environment configuration.
 * All env vars must be prefixed with EXPO_PUBLIC_ to be accessible at runtime.
 */

const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.bridgelet.io',
  environment: (process.env.EXPO_PUBLIC_ENV ?? 'development') as 'development' | 'staging' | 'production',
  plausibleDomain: process.env.EXPO_PUBLIC_PLAUSIBLE_DOMAIN,
  plausibleApiHost: process.env.EXPO_PUBLIC_PLAUSIBLE_API_HOST ?? 'https://plausible.io',
} as const;

if (!env.apiUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is required');
}

export const isDev = env.environment === 'development';
export const isProd = env.environment === 'production';

export default env;
