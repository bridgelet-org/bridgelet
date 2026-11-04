'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { listEphemeralAccounts, type EphemeralAccount } from '@/lib/bridgelet';
import { RateLimitError } from '@/lib/create-bridgelet-client';
import { analytics } from '@/lib/analytics';
import { getRememberedClaimLinks } from '@/lib/claim-links';

/**
 * Sender-facing list of payments.
 *
 * Server-provided `claimUrl` values are deliberately ignored because the
 * accounts endpoint is app-wide, not sender-scoped. A claim link is shown only
 * when this browser remembered it at creation time, allowing the sender to
 * recover the link after closing the success screen.
 */

const PAGE_SIZE = 10;
const RECOVERABLE_CLAIM_STATUSES = new Set(['pending_payment', 'pending_claim']);

type StatusStyle = { label: string; dot: string; text: string };

const STATUS_STYLES: Record<string, StatusStyle> = {
  initializing: { label: 'Setting up', dot: 'bg-slate-400', text: 'text-slate-600' },
  pending_payment: { label: 'Awaiting payment', dot: 'bg-amber-500', text: 'text-amber-700' },
  pending_claim: { label: 'Available', dot: 'bg-green-500', text: 'text-green-700' },
  claiming: { label: 'Processing', dot: 'bg-blue-500', text: 'text-blue-700' },
  partial_sweep: { label: 'Processing', dot: 'bg-blue-500', text: 'text-blue-700' },
  claimed: { label: 'Claimed', dot: 'bg-blue-500', text: 'text-blue-700' },
  expired: { label: 'Expired', dot: 'bg-red-500', text: 'text-red-700' },
  failed: { label: 'Failed', dot: 'bg-red-500', text: 'text-red-700' },
};

function statusStyle(status: string): StatusStyle {
  return (
    STATUS_STYLES[status] ?? {
      label: status,
      dot: 'bg-slate-400',
      text: 'text-slate-600',
    }
  );
}

function formatDate(iso?: string): string {
  if (!iso) return 'N/A';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function StatusBadge({ status }: { status: string }) {
  const { label, dot, text } = statusStyle(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${text} dark:text-slate-300`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        No sent payments to show yet.
      </p>
      <Link
        href="/send"
        className="mt-3 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
      >
        Send your first payment
      </Link>
    </div>
  );
}

function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">Loading your payments…</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
        />
      ))}
    </div>
  );
}

export function SendHistory() {
  const [accounts, setAccounts] = useState<EphemeralAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  // Tracked separately from `accounts.length` so the Next button stays disabled
  // while a page is in flight and reflects the last loaded page size.
  const [hasMore, setHasMore] = useState(false);
  const [rememberedClaimLinks, setRememberedClaimLinks] = useState<Record<string, string>>({});
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);

  const load = useCallback(async (nextOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const page = await listEphemeralAccounts({ limit: PAGE_SIZE, offset: nextOffset });
      // Defensive: a malformed body must render the in-page error state, never
      // reach `.map` during render (which would escape to the app error screen).
      if (!page || !Array.isArray(page.accounts)) {
        throw new Error('The payment list response was malformed.');
      }
      setAccounts(page.accounts);
      setHasMore(nextOffset + page.accounts.length < page.total);
    } catch (err) {
      if (err instanceof RateLimitError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Could not load your payments.');
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(offset);
  }, [load, offset]);

  useEffect(() => {
    setRememberedClaimLinks(getRememberedClaimLinks());
  }, []);

  async function handleCopyClaimLink(accountId: string, claimUrl: string) {
    try {
      await navigator.clipboard.writeText(claimUrl);
      setCopiedAccountId(accountId);
      analytics.claimLinkCopied({ claimId: accountId, copyLocation: 'dashboard_detail' });
    } catch {
      // Clipboard API unavailable: no-op.
    }
  }

  function handleWhatsAppShare(accountId: string) {
    analytics.claimLinkShared({ claimId: accountId, shareMethod: 'whatsapp' });
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950"
      >
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        <button
          type="button"
          onClick={() => void load(offset)}
          className="mt-2 rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 dark:border-red-700 dark:text-red-200"
        >
          Try again
        </button>
      </div>
    );
  }

  const safeAccounts = Array.isArray(accounts) ? accounts : [];

  if (safeAccounts.length === 0) {
    return offset === 0 ? (
      <EmptyState />
    ) : (
      <p className="text-sm text-slate-500 dark:text-slate-400">No more payments.</p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {safeAccounts.map((account) => {
          const claimUrl = RECOVERABLE_CLAIM_STATUSES.has(account.status)
            ? rememberedClaimLinks[account.accountId]
            : undefined;
          const whatsappShareUrl = claimUrl
            ? `https://wa.me/?text=${encodeURIComponent(
                `Here is your payment claim link via Bridgelet: ${claimUrl}`,
              )}`
            : null;

          return (
            <li
              key={account.accountId}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {account.amount} {account.asset}
                </span>
                <StatusBadge status={account.status} />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono" title={account.accountId}>
                  {shortId(account.accountId)}
                </span>
                <span>Sent {formatDate(account.createdAt)}</span>
                <span>Expires {formatDate(account.expiresAt)}</span>
              </div>

              {claimUrl && whatsappShareUrl && (
                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <p className="break-all text-xs text-slate-600 dark:text-slate-300">
                    Claim link saved in this browser:{' '}
                    <a
                      href={claimUrl}
                      data-testid={`recovered-claim-link-${account.accountId}`}
                      className="font-medium underline underline-offset-2 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      {claimUrl}
                    </a>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopyClaimLink(account.accountId, claimUrl)}
                      className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {copiedAccountId === account.accountId ? 'Copied' : 'Copy link'}
                    </button>
                    <a
                      href={whatsappShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleWhatsAppShare(account.accountId)}
                      className="rounded border border-green-600 px-3 py-1 text-xs font-medium text-green-700 transition hover:bg-green-50 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-950"
                    >
                      Share on WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
          disabled={offset === 0}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Previous
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Page {Math.floor(offset / PAGE_SIZE) + 1}
        </span>
        <button
          type="button"
          onClick={() => setOffset((value) => value + PAGE_SIZE)}
          disabled={!hasMore}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Next
        </button>
      </div>
    </div>
  );
}
