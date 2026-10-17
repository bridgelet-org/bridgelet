/**
 * Bootstraps local mocks in development.
 *
 * Import this module once at the app entry point (e.g. layout.tsx) when
 * `process.env.NODE_ENV === 'development'`.
 *
 * - Starts MSW to intercept fetch/XHR.
 * - Installs a recording `window.plausible` when the real Plausible script is
 *   not configured, so `lib/analytics.ts` `track()` exercises its success path
 *   and events can be inspected rather than dropped (see `./plausible`).
 *
 * Usage:
 *   if (process.env.NODE_ENV === 'development') {
 *     const { initMocks } = await import('@/mocks');
 *     await initMocks();
 *   }
 */
export async function initMocks(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  // No real Plausible script in local development → install the mock so
  // analytics events are captured instead of falling through to the console.
  if (!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) {
    const { installMockPlausible } = await import('./plausible');
    installMockPlausible();
  }

  const { worker } = await import('./browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}
