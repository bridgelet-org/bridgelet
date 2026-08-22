'use client';

import { useState } from 'react';
import { RateLimitBanner } from '@/components/rate-limit-banner';
import { RateLimitError } from '@/lib/api/client';
import { ChainSelector } from '@/components/chain-selector';
import { AccountStatus } from '@/lib/api/types';

/**
 * ClaimStatus now mirrors the backend's real AccountStatus enum (Issue 5)
 * instead of the old three-value `'available' | 'claimed' | 'expired'`
 * model, which had no way to represent INITIALIZING, PENDING_PAYMENT,
 * CLAIMING, PARTIAL_SWEEP, or FAILED accounts.
 */
export type ClaimStatus = AccountStatus;

export interface ClaimStatusCardProps {
  /** Current lifecycle status of the account, as returned by the backend. */
  status: ClaimStatus;
  /** Payment amount in stroops (1 XLM = 10_000_000). Required for `pending_claim`. */
  amountStroops?: string;
  /** ISO 4217 asset code, e.g. "XLM" or "USDC". */
  assetCode?: string;
  /** ISO 8601 timestamp when the token expires / expired. */
  expiresAt?: string;
  /** Optional sender memo. */
  memo?: string;
  /** Called when the recipient submits a destination address to claim to. Also used to retry a PARTIAL_SWEEP. */
  onClaim?: (destinationAddress: string) => void | Promise<void>;
  /** Developer-facing note from the API (e.g. sweep_status stub message). */
  sweepNote?: string;
  /** Support contact email shown in the expired/failed states. */
  supportEmail?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stroopsToDisplay(stroops: string, assetCode = 'XLM'): string {
  const num = parseFloat(stroops);
  if (Number.isNaN(num)) return `— ${assetCode}`;
  const xlm = num / 10_000_000;
  return `${xlm.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 7 })} ${assetCode}`;
}

function formatExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

// ─── Display metadata for every real backend status ───────────────────────────

const HEADERS: Record<ClaimStatus, string> = {
  [AccountStatus.INITIALIZING]: 'Setting up your payment',
  [AccountStatus.PENDING_PAYMENT]: 'Waiting for payment',
  [AccountStatus.PENDING_CLAIM]: 'You have a payment waiting',
  [AccountStatus.CLAIMING]: 'Claim in progress',
  [AccountStatus.PARTIAL_SWEEP]: 'Finishing up your claim',
  [AccountStatus.CLAIMED]: 'Payment already claimed',
  [AccountStatus.EXPIRED]: 'Payment link expired',
  [AccountStatus.FAILED]: 'Something went wrong',
};

const BORDER_COLORS: Record<ClaimStatus, string> = {
  [AccountStatus.INITIALIZING]: 'border-slate-200 dark:border-slate-700',
  [AccountStatus.PENDING_PAYMENT]: 'border-amber-200 dark:border-amber-800',
  [AccountStatus.PENDING_CLAIM]: 'border-green-200 dark:border-green-800',
  [AccountStatus.CLAIMING]: 'border-blue-200 dark:border-blue-800',
  [AccountStatus.PARTIAL_SWEEP]: 'border-blue-200 dark:border-blue-800',
  [AccountStatus.CLAIMED]: 'border-blue-200 dark:border-blue-800',
  [AccountStatus.EXPIRED]: 'border-red-200 dark:border-red-800',
  [AccountStatus.FAILED]: 'border-red-200 dark:border-red-800',
};

const BADGE_STYLES: Record<ClaimStatus, { dot: string; text: string; label: string }> = {
  [AccountStatus.INITIALIZING]: {
    dot: 'bg-slate-400',
    text: 'text-slate-600 dark:text-slate-400',
    label: 'Setting up',
  },
  [AccountStatus.PENDING_PAYMENT]: {
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'Awaiting payment',
  },
  [AccountStatus.PENDING_CLAIM]: {
    dot: 'bg-green-500',
    text: 'text-green-700 dark:text-green-400',
    label: 'Available',
  },
  [AccountStatus.CLAIMING]: {
    dot: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Processing',
  },
  [AccountStatus.PARTIAL_SWEEP]: {
    dot: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Processing',
  },
  [AccountStatus.CLAIMED]: {
    dot: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Claimed',
  },
  [AccountStatus.EXPIRED]: {
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-400',
    label: 'Expired',
  },
  [AccountStatus.FAILED]: {
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-400',
    label: 'Failed',
  },
};

function StatusBadge({ status }: { status: ClaimStatus }) {
  const { dot, text, label } = BADGE_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${text}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

// ─── State panels ─────────────────────────────────────────────────────────────

function AvailablePanel({
  amountStroops,
  assetCode,
  expiresAt,
  memo,
  onClaim,
  sweepNote,
}: Pick<
  ClaimStatusCardProps,
  'amountStroops' | 'assetCode' | 'expiresAt' | 'memo' | 'onClaim' | 'sweepNote'
>) {
  const [claiming, setClaiming] = useState(false);
  const [done, setDone] = useState(false);
  const [rateLimit, setRateLimit] = useState<number | null | undefined>(undefined);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [destinationAddress, setDestinationAddress] = useState('');

  // Matches the backend's Stellar public key validation (StrKey ed25519 public keys).
  const isValidAddress = /^G[A-Z2-7]{55}$/.test(destinationAddress);

  async function handleClaim() {
    if (!isValidAddress) return;
    setClaiming(true);
    setRateLimit(undefined);
    setClaimError(null);
    try {
      await onClaim?.(destinationAddress);
      setDone(true);
    } catch (err) {
      if (err instanceof RateLimitError) {
        setRateLimit(err.retryAfter);
      } else {
        // `handleClaim` is wired up as `onClick={handleClaim}` directly, so
        // nothing awaits or catches this async function's own returned
        // promise. Rethrowing here would just become an unhandled
        // rejection with no user-visible feedback — surface it in state
        // instead.
        setClaimError(
          err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        );
      }
    } finally {
      setClaiming(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-2">
        <p role="status" className="text-sm font-medium text-green-700 dark:text-green-400">
          Claim submitted! Check your wallet for the incoming transfer.
        </p>
        {sweepNote && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800">
            🛠 Dev note: {sweepNote}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Screen-reader-only live region for claiming state changes */}
      <p role="status" aria-live="assertive" className="sr-only">
        {claiming ? 'Claim in progress. This may take a few moments.' : ''}
      </p>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="font-medium text-slate-700 dark:text-slate-300">Amount</dt>
          <dd className="font-semibold text-slate-900 dark:text-slate-100">
            {amountStroops ? (
              stroopsToDisplay(amountStroops, assetCode)
            ) : (
              <span className="text-slate-400 dark:text-slate-500">—</span>
            )}
          </dd>
        </div>
        {expiresAt && (
          <div className="flex justify-between">
            <dt className="font-medium text-slate-700 dark:text-slate-300">Expires</dt>
            <dd className="text-slate-600 dark:text-slate-400">{formatExpiry(expiresAt)}</dd>
          </div>
        )}
        {memo && (
          <div className="flex justify-between">
            <dt className="font-medium text-slate-700 dark:text-slate-300">Memo</dt>
            <dd className="text-slate-600 dark:text-slate-400">{memo}</dd>
          </div>
        )}
      </dl>

      {rateLimit !== undefined && <RateLimitBanner retryAfter={rateLimit} />}
      {claimError && (
        <p
          role="alert"
          className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 dark:text-red-300 dark:bg-red-950 dark:border-red-800"
        >
          {claimError}
        </p>
      )}

      <div aria-busy={claiming || undefined}>
        <label
          htmlFor="destination-address"
          className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          Your Stellar wallet address
        </label>
        <input
          id="destination-address"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="G..."
          value={destinationAddress}
          onChange={(e) => setDestinationAddress(e.target.value.trim())}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus-visible:outline-green-500"
        />
        {destinationAddress.length > 0 && !isValidAddress && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Enter a valid Stellar public key (starts with G, 56 characters).
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleClaim}
        disabled={claiming || !isValidAddress}
        className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 dark:bg-green-700 dark:hover:bg-green-600"
      >
        {claiming ? 'Claiming…' : 'Claim now'}
      </button>

      <div className="pt-2">
        <ChainSelector />
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Funds are held on-chain. Claiming transfers them directly to your Stellar wallet.
      </p>
    </div>
  );
}

function NotReadyPanel({ status }: { status: ClaimStatus }) {
  const message =
    status === AccountStatus.INITIALIZING
      ? 'The sender is setting up this payment. This page will update automatically once it is ready.'
      : 'The sender\u2019s payment hasn\u2019t confirmed on-chain yet. This usually takes a few seconds to a couple of minutes.';
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
      <span
        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-amber-400 border-t-transparent dark:border-amber-500"
        aria-hidden="true"
      />
      <p className="text-sm text-amber-800 dark:text-amber-300">{message}</p>
    </div>
  );
}

function ProcessingPanel({ status, sweepNote }: { status: ClaimStatus; sweepNote?: string }) {
  const message =
    status === AccountStatus.PARTIAL_SWEEP
      ? 'Your claim was authorized and is finishing up. If this takes more than a few minutes, tap Claim now to retry the transfer.'
      : 'Your claim is being processed on-chain. This page will update automatically.';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950">
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-400 border-t-transparent dark:border-blue-500"
          aria-hidden="true"
        />
        <p className="text-sm text-blue-800 dark:text-blue-300">{message}</p>
      </div>
      {sweepNote && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800">
          🛠 Dev note: {sweepNote}
        </p>
      )}
    </div>
  );
}

function ClaimedPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950">
        <svg
          aria-hidden="true"
          className="h-6 w-6 shrink-0 text-blue-500 dark:text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
            Payment already claimed
          </p>
          <p className="text-xs text-blue-600 mt-0.5 dark:text-blue-400">
            These funds have been transferred to the recipient&apos;s wallet. Each claim link can
            only be used once.
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        If you believe this is a mistake, contact the sender for a new payment link.
      </p>
    </div>
  );
}

function ExpiredPanel({
  expiresAt,
  supportEmail,
}: Pick<ClaimStatusCardProps, 'expiresAt' | 'supportEmail'>) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
        <svg
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            This claim link has expired
          </p>
          {expiresAt && (
            <p className="text-xs text-red-600 mt-0.5 dark:text-red-400">
              Expired on {formatExpiry(expiresAt)}.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <p className="font-medium text-slate-800 mb-1 dark:text-slate-200">What to do next</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
          <li>Contact the sender and ask them to send a new payment link.</li>
          <li>Expired funds are automatically returned to the sender&apos;s wallet.</li>
          {supportEmail && (
            <li>
              Need help?{' '}
              <a
                href={`mailto:${supportEmail}`}
                className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-slate-100"
              >
                {supportEmail}
              </a>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function FailedPanel({ supportEmail }: Pick<ClaimStatusCardProps, 'supportEmail'>) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
        <svg
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            This payment couldn&apos;t be set up
          </p>
          <p className="text-xs text-red-600 mt-0.5 dark:text-red-400">
            Something went wrong while creating or funding this payment. It has not been claimed and
            no funds have moved.
          </p>
        </div>
      </div>
      {supportEmail && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Contact the sender, or reach us at{' '}
          <a
            href={`mailto:${supportEmail}`}
            className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-slate-100"
          >
            {supportEmail}
          </a>
          .
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Renders the correct UI for a claim token based on its current account
 * status. Every value of AccountStatus is handled explicitly (Issue 5) —
 * there is no silent "unknown status" fallback.
 */
export function ClaimStatusCard({
  status,
  amountStroops,
  assetCode = 'XLM',
  expiresAt,
  memo,
  onClaim,
  sweepNote,
  supportEmail,
}: ClaimStatusCardProps) {
  return (
    <article
      aria-label={`Claim status: ${status}`}
      aria-live="polite"
      aria-atomic="true"
      aria-relevant="additions text"
      className={`rounded-xl border-2 ${BORDER_COLORS[status]} bg-white p-5 shadow-sm space-y-4 dark:bg-slate-900`}
    >
      <header className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {HEADERS[status]}
        </h2>
        <StatusBadge status={status} />
      </header>

      <hr className="border-slate-100 dark:border-slate-800" />

      {(status === AccountStatus.INITIALIZING || status === AccountStatus.PENDING_PAYMENT) && (
        <NotReadyPanel status={status} />
      )}
      {status === AccountStatus.PENDING_CLAIM && (
        <AvailablePanel
          amountStroops={amountStroops}
          assetCode={assetCode}
          expiresAt={expiresAt}
          memo={memo}
          onClaim={onClaim}
          sweepNote={sweepNote}
        />
      )}
      {(status === AccountStatus.CLAIMING || status === AccountStatus.PARTIAL_SWEEP) && (
        <ProcessingPanel status={status} sweepNote={sweepNote} />
      )}
      {status === AccountStatus.CLAIMED && <ClaimedPanel />}
      {status === AccountStatus.EXPIRED && (
        <ExpiredPanel expiresAt={expiresAt} supportEmail={supportEmail} />
      )}
      {status === AccountStatus.FAILED && <FailedPanel supportEmail={supportEmail} />}
    </article>
  );
}
