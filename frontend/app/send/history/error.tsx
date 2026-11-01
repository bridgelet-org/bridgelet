'use client';

import { useEffect } from 'react';

type SendHistoryErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SendHistoryError({ error, reset }: SendHistoryErrorProps) {
  useEffect(() => {
    console.error('SendHistory error boundary caught:', error);
  }, [error]);

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950"
    >
      <h2 className="text-base font-semibold text-red-900 dark:text-red-200">
        Something went wrong loading your payment history
      </h2>
      <p className="mt-2 text-sm text-red-700 dark:text-red-300">
        {error.message || 'An unexpected error occurred while rendering the payment history.'}
      </p>
      <div className="mt-4 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
