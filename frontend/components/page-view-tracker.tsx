'use client';

import { useEffect } from 'react';
import { analytics, type EntrySource } from '@/lib/analytics';

interface PageViewTrackerProps {
  page: string;
}

/**
 * Best-guess referral channel for the entry point based on the current
 * URL and referrer. Mirrors the `entry_source` values documented in
 * `docs/analytics-spec.md` §4.1.
 */
function entrySource(): EntrySource {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return 'unknown';
    const params = new URLSearchParams(window.location.search);
    if (params.has('ref') || params.has('utm_source')) return 'shared_link';
    const referrer = document.referrer;
    if (referrer) {
      if (new URL(referrer).origin !== window.location.origin) return 'referral';
    }
    return 'direct';
  } catch {
    return 'unknown';
  }
}

/**
 * Fires the `Page Viewed` analytics event once when the entry point
 * renders. Kept as a client component so tracking can run after hydration
 * even inside server-rendered pages.
 */
export function PageViewTracker({ page }: PageViewTrackerProps) {
  useEffect(() => {
    analytics.pageViewed({ page, entrySource: entrySource() });
  }, [page]);

  return null;
}