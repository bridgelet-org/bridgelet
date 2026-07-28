'use client';

// #104 – UI feedback for 429 rate-limited responses
import { useEffect, useState } from 'react';

interface RateLimitBannerProps {
  /** Seconds to count down from. Pass `null` to show a generic message. */
  retryAfter: number | null;
}

export function RateLimitBanner({ retryAfter }: RateLimitBannerProps) {
  const [remaining, setRemaining] = useState(retryAfter ?? 0);

  useEffect(() => {
    if (!retryAfter) return;
    setRemaining(retryAfter);
    const id = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [retryAfter]);

  const message =
    retryAfter != null && remaining > 0
      ? `Please wait ${remaining} second${remaining !== 1 ? 's' : ''} before retrying.`
      : 'Too many requests. Please wait a moment before retrying.';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      <svg
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}
