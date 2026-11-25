'use client';

import { resetAnalyticsConsent } from '@/lib/analytics-consent';

/**
 * #1092 – Persistent withdrawal control. Reopening the decision automatically
 * re-shows `AnalyticsConsentBanner`, so opting out is as easy as opting in.
 */
export function AnalyticsConsentSettings() {
  return (
    <button
      type="button"
      onClick={resetAnalyticsConsent}
      className="transition hover:text-slate-900 dark:hover:text-white"
    >
      Analytics settings
    </button>
  );
}
