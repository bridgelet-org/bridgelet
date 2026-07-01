'use client';

import { useState } from 'react';
import { RateLimitBanner } from '@/components/rate-limit-banner';
import { RateLimitError } from '@/lib/redeem';
import { ChainSelector } from '@/components/chain-selector';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClaimStatus = 'available' | 'claimed' | 'expired';

export interface ClaimStatusCardProps {
  /** Current state of the claim token. */
  status: ClaimStatus;
  /** Payment amount in stroops (1 XLM = 10_000_000). Required for `available`. */
  amountStroops?: string;
  /** ISO 4217 asset code, e.g. "XLM" or "USDC". */
  assetCode?: string;
  /** ISO 8601 timestamp when the token expires / expired. */
  expiresAt?: string;
  /** Optional sender memo. */
  memo?: string;
  /** Called when the recipient taps "Claim now". */
  onClaim?: () => void | Promise<void>;
  /** Developer-facing note from the API (e.g. sweep_status stub message). */
  sweepNote?: string;
  /** Support contact email shown in the expired state. */
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ClaimStatus }) {
  const styles: Record<ClaimStatus, { dot: string; text: string; label: string }> = {
    available: { dot: 'bg-green-500', text: 'text-green-700', label: 'Available' },
    claimed:   { dot: 'bg-blue-500',  text: 'text-blue-700',  label: 'Claimed'   },
    expired:   { dot: 'bg-red-500',   text: 'text-red-700',   label: 'Expired'   },
  };
  const { dot, text, label } = styles[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${text}`}>
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
}: Pick<ClaimStatusCardProps, 'amountStroops' | 'assetCode' | 'expiresAt' | 'memo' | 'onClaim' | 'sweepNote'>) {
  const [claiming, setClaiming] = useState(false);
  const [done, setDone] = useState(false);
  const [rateLimit, setRateLimit] = useState<number | null | undefined>(undefined);

  async function handleClaim() {
    setClaiming(true);
    setRateLimit(undefined);
    try {
      await onClaim?.();
      setDone(true);
    } catch (err) {
      if (err instanceof RateLimitError) {
        setRateLimit(err.retryAfter);
      } else {
        throw err;
      }
    } finally {
      setClaiming(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-2">
        <p role="status" className="text-sm font-medium text-green-700">
          Claim submitted! Check your wallet for the incoming transfer.
        </p>
        {sweepNote && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            🛠 Dev note: {sweepNote}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="font-medium text-slate-700">Amount</dt>
          <dd className="font-semibold text-slate-900">
            {amountStroops
              ? stroopsToDisplay(amountStroops, assetCode)
              : <span className="text-slate-400">—</span>}
          </dd>
        </div>
        {expiresAt && (
          <div className="flex justify-between">
            <dt className="font-medium text-slate-700">Expires</dt>
            <dd className="text-slate-600">{formatExpiry(expiresAt)}</dd>
          </div>
        )}
        {memo && (
          <div className="flex justify-between">
            <dt className="font-medium text-slate-700">Memo</dt>
            <dd className="text-slate-600">{memo}</dd>
          </div>
        )}
      </dl>

      {rateLimit !== undefined && <RateLimitBanner retryAfter={rateLimit} />}

      <button
        type="button"
        onClick={handleClaim}
        disabled={claiming}
        className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-green-600"
      >
        {claiming ? 'Claiming…' : 'Claim now'}
      </button>

      <div className="pt-2">
        <ChainSelector />
      </div>

      <p className="text-xs text-slate-500">
        Funds are held on-chain. Claiming transfers them directly to your Stellar wallet.
      </p>
    </div>
  );
}

function ClaimedPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <svg
          aria-hidden="true"
          className="h-6 w-6 shrink-0 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-800">Payment already claimed</p>
          <p className="text-xs text-blue-600 mt-0.5">
            These funds have been transferred to the recipient&apos;s wallet. Each claim link
            can only be used once.
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-500">
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
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <svg
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-red-800">This claim link has expired</p>
          {expiresAt && (
            <p className="text-xs text-red-600 mt-0.5">
              Expired on {formatExpiry(expiresAt)}.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="font-medium text-slate-800 mb-1">What to do next</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
          <li>Contact the sender and ask them to send a new payment link.</li>
          <li>Expired funds are automatically returned to the sender&apos;s wallet.</li>
          {supportEmail && (
            <li>
              Need help?{' '}
              <a
                href={`mailto:${supportEmail}`}
                className="underline underline-offset-2 hover:text-slate-900"
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

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Renders the correct UI for a claim token based on its current status.
 *
 * - `available`  → amount + claim button
 * - `claimed`    → success notice (already redeemed)
 * - `expired`    → expiry date + contact-sender instructions
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
  const headers: Record<ClaimStatus, string> = {
    available: 'You have a payment waiting',
    claimed:   'Payment already claimed',
    expired:   'Payment link expired',
  };

  const borderColors: Record<ClaimStatus, string> = {
    available: 'border-green-200',
    claimed:   'border-blue-200',
    expired:   'border-red-200',
  };

  return (
    <article
      aria-label={`Claim status: ${status}`}
      aria-live="polite"
      aria-atomic="true"
      aria-relevant="additions text"
      className={`rounded-xl border-2 ${borderColors[status]} bg-white p-5 shadow-sm space-y-4`}
    >
      <header className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{headers[status]}</h2>
        <StatusBadge status={status} />
      </header>

      <hr className="border-slate-100" />

      {status === 'available' && (
        <AvailablePanel
          amountStroops={amountStroops}
          assetCode={assetCode}
          expiresAt={expiresAt}
          memo={memo}
          onClaim={onClaim}
          sweepNote={sweepNote}
        />
      )}
      {status === 'claimed' && <ClaimedPanel />}
      {status === 'expired' && (
        <ExpiredPanel expiresAt={expiresAt} supportEmail={supportEmail} />
      )}
    </article>
  );
}
