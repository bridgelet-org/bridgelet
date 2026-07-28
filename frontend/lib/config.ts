/** SDK base URL. Falls back to the MSW mock server in development. */
export const SDK_URL =
  process.env.NEXT_PUBLIC_SDK_URL ??
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');

/**
 * Public API key sent as `x-api-key` on SDK requests.
 * Leave empty in development — MSW intercepts without auth.
 */
export const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? '';
