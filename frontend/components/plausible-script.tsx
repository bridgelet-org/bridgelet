'use client';

import { useEffect, useState } from 'react';
import {
  ANALYTICS_CONSENT_EVENT,
  hasAnalyticsConsent,
  initConsentSync,
  type AnalyticsConsent,
} from '@/lib/analytics-consent';

/**
 * Loads the Plausible analytics script (§9.1) so `track()` in
 * `lib/analytics.ts` can dispatch to `window.plausible`. Renders nothing.
 *
 * Configured via environment variables (no-ops when unset):
 * - `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`: the site domain registered in Plausible.
 *   Required for the script to load at all.
 * - `NEXT_PUBLIC_PLAUSIBLE_API_HOST`: self-hosted or proxied Plausible
 *   origin. Defaults to `https://plausible.io`.
 *
 * #1092: the script is a third-party request and is only injected after the
 * visitor has explicitly opted in (GDPR / ePrivacy Art. 5(3)). A later grant
 * loads it without a reload; a withdrawal stops future `track()` calls in
 * `lib/analytics.ts` (an already-loaded script cannot be un-loaded cleanly).
 *
 * The claim page is exempt: `docs/security-model.mdx` forbids third-party
 * scripts on `/claim/[token]` so the claim token is never leaked via
 * `Referer` (T-16). The script tag is stripped from claim routes server-side
 * in `RootLayout` before this component mounts.
 */
export function PlausibleScript() {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);

  // Read the decision after hydration: during SSR there is no storage, and
  // initialising from it during render would cause a hydration mismatch.
  useEffect(() => {
    initConsentSync();
    const sync = () => setConsent(hasAnalyticsConsent() ? 'granted' : null);
    sync();
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<AnalyticsConsent | null>).detail;
      setConsent(detail === 'granted' ? 'granted' : null);
    };
    window.addEventListener(ANALYTICS_CONSENT_EVENT, onChange);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (consent !== 'granted') return;

    const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    if (!domain) return; // Not configured: analytics stays console-only.

    const w = window as unknown as { plausible?: unknown };
    if (w.plausible) return; // Already loaded (e.g. React strict-mode remount).

    const apiHost = process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST ?? 'https://plausible.io';
    const script = document.createElement('script');
    script.defer = true;
    script.async = true;
    script.dataset.api = apiHost;
    script.dataset.domain = domain;
    script.src = `${apiHost}/js/script.js`;
    document.head.appendChild(script);
  }, [consent]);

  return null;
}
