'use client';

import { useEffect, useId, useState } from 'react';
import { listAccountEvents, type AccountEvent } from '@/lib/bridgelet';
import { explorerTxUrl } from '@/lib/explorer';

const EVENT_LABELS: Record<string, string> = {
  created: 'Payment created',
  contract_deployed: 'Escrow contract deployed',
  funded: 'Payment funded',
  claim_started: 'Claim started',
  claimed: 'Payment claimed',
  claim_failed: 'Claim failed',
  partial_sweep: 'Partial payout completed',
  expired: 'Payment expired',
  reclaimed: 'Funds reclaimed',
  failed: 'Payment failed',
};

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

function eventLabel(type: string): string {
  const known = EVENT_LABELS[type];
  if (known) return known;
  return type.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function eventTimestamp(event: AccountEvent): number {
  const timestamp = Date.parse(event.createdAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function orderedEvents(events: AccountEvent[]): AccountEvent[] {
  return [...events].sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
}

function formatEventTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export function PaymentTimeline({ accountId }: { accountId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [events, setEvents] = useState<AccountEvent[]>([]);
  const [retryKey, setRetryKey] = useState(0);
  const panelId = useId();

  useEffect(() => {
    if (!expanded) return;

    let cancelled = false;
    setLoadState('loading');

    listAccountEvents(accountId)
      .then((result) => {
        if (cancelled) return;
        setEvents(Array.isArray(result) ? result : []);
        setLoadState('loaded');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, expanded, retryKey]);

  const ordered = orderedEvents(events);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {expanded ? 'Hide timeline' : 'View timeline'}
      </button>

      {expanded && (
        <div id={panelId} className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
          {(loadState === 'idle' || loadState === 'loading') && (
            <p role="status" className="text-xs text-slate-500 dark:text-slate-400">
              Loading timeline…
            </p>
          )}

          {loadState === 'error' && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-2 text-xs text-red-700 dark:text-red-300"
            >
              <span>Could not load timeline events.</span>
              <button
                type="button"
                onClick={() => setRetryKey((value) => value + 1)}
                className="rounded border border-red-300 px-2 py-1 font-medium transition hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-950"
              >
                Try again
              </button>
            </div>
          )}

          {loadState === 'loaded' && ordered.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">No timeline events yet.</p>
          )}

          {loadState === 'loaded' && ordered.length > 0 && (
            <ol className="space-y-3 border-l border-slate-200 pl-4 dark:border-slate-700">
              {ordered.map((event) => {
                const explorerUrl = explorerTxUrl(event.txHash ?? undefined);
                return (
                  <li key={event.id} className="relative">
                    <span
                      className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500"
                      aria-hidden="true"
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {eventLabel(event.type)}
                      </p>
                      <time
                        dateTime={event.createdAt}
                        className="text-xs text-slate-500 dark:text-slate-400"
                      >
                        {formatEventTime(event.createdAt)}
                      </time>
                    </div>
                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs font-medium text-blue-700 underline-offset-2 hover:underline dark:text-blue-400"
                      >
                        View transaction
                      </a>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
