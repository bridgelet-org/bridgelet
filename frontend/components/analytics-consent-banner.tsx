'use client';

import { useEffect, useState } from 'react';
import {
  ANALYTICS_CONSENT_EVENT,
  getAnalyticsConsent,
  initConsentSync,
  setAnalyticsConsent,
  type AnalyticsConsent,
} from '@/lib/analytics-consent';

const ANALYTICS_DOCS_URL =
  'https://github.com/bridgelet-org/bridgelet/blob/main/docs/analytics-spec.md';

/**
 * #1092 – First-contact consent banner.
 *
 * Shown only while the visitor has no recorded decision. Both choices are
 * equally prominent: rejecting analytics never degrades the product, and the
 * footer's "Analytics settings" control lets the decision be changed later.
 * The banner is non-blocking (no overlay) so the claim link flow is never
 * held up by a modal.
 */
export function AnalyticsConsentBanner() {
  const [decision, setDecision] = useState<AnalyticsConsent | null>(null);
  const [ready, setReady] = useState(false);

  // Read the persisted decision after hydration: during SSR there is no
  // localStorage, and reading it during render would cause a hydration
  // mismatch between the server (unset) and a returning visitor (set).
  useEffect(() => {
    initConsentSync();
    setDecision(getAnalyticsConsent());
    setReady(true);

    const onChange = (event: Event) => {
      setDecision((event as CustomEvent<AnalyticsConsent | null>).detail);
    };
    window.addEventListener(ANALYTICS_CONSENT_EVENT, onChange);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, onChange);
  }, []);

  if (!ready || decision !== null) return null;

  return (
    <aside
      role="region"
      aria-labelledby="analytics-consent-title"
      aria-describedby="analytics-consent-description"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white px-6 py-5 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          <h2 id="analytics-consent-title" className="font-semibold text-slate-900 dark:text-white">
            Optional product analytics
          </h2>
          <p id="analytics-consent-description" className="mt-1">
            We&apos;d like to count page views and feature usage to improve Bridgelet. This stores a
            random ID in your browser and sends events to our analytics provider &mdash; never your
            wallet address or payment details. Declining changes nothing about how the app works,
            and you can change your choice in the footer.{' '}
            <a
              href={ANALYTICS_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition hover:text-slate-900 dark:hover:text-white"
            >
              Learn more
            </a>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setAnalyticsConsent('denied')}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:outline-white"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => setAnalyticsConsent('granted')}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 dark:focus-visible:outline-white"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </aside>
  );
}
