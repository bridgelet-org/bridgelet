'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * App-level error boundary (Next.js App Router `global-error.tsx`).
 *
 * Fires the spec's `Error Displayed` event (§6) so uncaught render/lifecycle
 * crashes reach the analytics pipeline with `error_type: 'unknown'` and the
 * error's digest as `error_code`. Uncaught errors would otherwise never show
 * up in dashboards because no component-level handler runs for them.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    analytics.errorDisplayed({
      journey: 'shared',
      errorType: 'unknown',
      errorCode: error.digest ?? 'RENDER_CRASH',
      sourceScreen: 'app_error_boundary',
    });
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-slate-950">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            Try again
            {process.env.NODE_ENV !== 'production' && error.digest ? (
              <span className="sr-only"> (digest: {error.digest})</span>
            ) : null}
          </button>
        </div>
      </body>
    </html>
  );
}
