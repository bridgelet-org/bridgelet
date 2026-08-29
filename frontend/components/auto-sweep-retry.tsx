'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_CONFIG: RetryConfig = { maxAttempts: 5, baseDelayMs: 2000, maxDelayMs: 30000 };

export interface RetryState {
  status: 'idle' | 'retrying' | 'succeeded' | 'failed';
  attempt: number;
  maxAttempts: number;
  nextRetryMs: number | null;
  lastError: Error | null;
}

export function useAutoSweepRetry(config: Partial<RetryConfig> = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [state, setState] = useState<RetryState>({
    status: 'idle', attempt: 0, maxAttempts: mergedConfig.maxAttempts, nextRetryMs: null, lastError: null,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const execute = useCallback(
    async (operation: () => Promise<void>): Promise<boolean> => {
      cleanup();
      for (let attempt = 1; attempt <= mergedConfig.maxAttempts; attempt++) {
        setState((prev) => ({ ...prev, status: attempt === 1 ? 'idle' : 'retrying', attempt, nextRetryMs: null }));
        try {
          await operation();
          setState((prev) => ({ ...prev, status: 'succeeded', lastError: null }));
          return true;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          if (attempt >= mergedConfig.maxAttempts) {
            setState((prev) => ({ ...prev, status: 'failed', lastError: error }));
            return false;
          }
          const delay = Math.min(mergedConfig.baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000, mergedConfig.maxDelayMs);
          setState((prev) => ({ ...prev, lastError: error, nextRetryMs: delay }));
          await new Promise<void>((resolve) => { timerRef.current = setTimeout(resolve, delay); });
        }
      }
      return false;
    },
    [mergedConfig, cleanup],
  );

  const reset = useCallback(() => {
    cleanup();
    setState({ status: 'idle', attempt: 0, maxAttempts: mergedConfig.maxAttempts, nextRetryMs: null, lastError: null });
  }, [cleanup, mergedConfig.maxAttempts]);

  return { ...state, execute, reset };
}

export function AutoSweepRetryStatus({
  state, onRetry, label = 'auto-sweep',
}: {
  state: RetryState; onRetry?: () => void; label?: string;
}) {
  if (state.status === 'idle') return null;

  return (
    <div role="status" aria-live="polite" className={`rounded-lg border p-4 ${
      state.status === 'succeeded' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30'
      : state.status === 'failed' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30'
      : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30'
    }`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {state.status === 'retrying' && (
            <svg className="h-5 w-5 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {state.status === 'succeeded' && (
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {state.status === 'failed' && (
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          {state.status === 'retrying' && <p className="text-sm text-amber-800 dark:text-amber-200">Retrying {label}... Attempt {state.attempt} of {state.maxAttempts}</p>}
          {state.status === 'succeeded' && <p className="text-sm text-green-800 dark:text-green-200">{label} completed successfully.</p>}
          {state.status === 'failed' && (
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{label} failed after {state.maxAttempts} attempts.</p>
              {state.lastError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.lastError.message}</p>}
              {onRetry && (
                <button onClick={onRetry} className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
                  Retry Now
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
