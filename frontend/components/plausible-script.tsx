'use client';

import { useEffect } from 'react';

/**
 * Loads the Plausible analytics script (§9.1) so `track()` in
 * `lib/analytics.ts` can dispatch to `window.plausible`. Renders nothing.
 *
 * Configured via environment variables (no-ops when unset):
 * - `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` — the site domain registered in Plausible.
 *   Required for the script to load at all.
 * - `NEXT_PUBLIC_PLAUSIBLE_API_HOST` — self-hosted or proxied Plausible
 *   origin. Defaults to `https://plausible.io`.
 *
 * The claim page is exempt: `docs/security-model.mdx` forbids third-party
 * scripts on `/claim/[token]` so the claim token is never leaked via
 * `Referer` (T-16). The script tag is stripped from claim routes server-side
 * in `RootLayout` before this component mounts.
 */
export function PlausibleScript() {
  useEffect(() => {
    const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    if (!domain) return; // Not configured — analytics stays console-only.

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
  }, []);

  return null;
}
