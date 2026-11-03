'use client';

import { PageShell } from '@/components/page-shell';

interface SendHistoryErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Route-level error boundary for `/send/history`.
 *
 * A render crash here should keep the page chrome and offer a retry, rather
 * than replace the whole app with `app/global-error.tsx`.
 */
export default function SendHistoryError({ reset }: SendHistoryErrorProps) {
  return (
    <PageShell
      title="Sent payments"
      description="Payments created through this app, newest first. Claim links are withheld here on purpose."
    >
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950"
      >
        <p className="text-sm text-red-700 dark:text-red-300">
          We couldn&apos;t load your sent payments.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 dark:border-red-700 dark:text-red-200"
        >
          Try again
        </button>
      </div>
    </PageShell>
  );
}
