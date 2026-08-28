'use client';

import { useState } from 'react';
import { RateLimitBanner } from '@/components/rate-limit-banner';
import { RateLimitError } from '@/lib/api/client';
import { ChainSelector } from '@/components/chain-selector';
import { WalletConnect } from '@/components/wallet-connect';
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
  /**
   * #435: True when this browser session was the one that claimed the token.
   * Determines whether to show "you already claimed this" vs "claimed by someone else".
   */
  claimedByMe?: boolean;
  /**
   * #433: Destination wallet address reported after a successful sweep,
   * shown in the final success confirmation state.
   */
  sweepDestination?: string;
  /**
   * #433: Amount in stroops actually swept (may differ from amountStroops after fees).
   */
  sweepAmountStroops?: string;
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

function shortenAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

// ─── Display metadata for every real backend status ───────────────────────────

const HEADERS: Record<ClaimStatus, string> = {
  [AccountStatus.INITIALIZING]: 'Setting up your payment',
  [AccountStatus.PENDING_PAYMENT]: 'Waiting for payment',
  [AccountStatus.PENDING_CLAIM]: 'You have a payment waiting',
  [AccountStatus.CLAIMING]: 'Funds are moving to your wallet',
  [AccountStatus.PARTIAL_SWEEP]: 'Finishing up your claim',
  [AccountStatus.CLAIMED]: 'Payment claimed',
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
  [AccountStatus.EXPIRED]: 'border-amber-200 dark:border-amber-700',
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
    label: 'Sending',
  },
  [AccountStatus.PARTIAL_SWEEP]: {
    dot: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Processing',
  },
  [AccountStatus.CLAIMED]: {
    dot: 'bg-green-500',
    text: 'text-green-700 dark:text-green-400',
    label: 'Claimed',
  },
  [AccountStatus.EXPIRED]: {
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
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

/**
 * #432: AvailablePanel offers both paths side-by-side:
 *   1. Connect an existing Freighter wallet — prefills the address and shows a
 *      confirmation step before the sweep fires.
 *   2. Enter an address manually (original "no-wallet" path).
 *
 * #433: After a successful claim, shows a distinct sweep-in-progress state
 * and then a final success card with the destination and amount.
 */
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
  // Wallet-connect state
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [walletConnectError, setWalletConnectError] = useState<string | null>(null);

  // Manual-entry state
  const [destinationAddress, setDestinationAddress] = useState('');

  // Confirmation-before-sweep
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);

  // Sweep execution state
  const [claiming, setClaiming] = useState(false);
  const [rateLimit, setRateLimit] = useState<number | null | undefined>(undefined);
  const [claimError, setClaimError] = useState<string | null>(null);

  // #433 post-claim states
  const [sweepInProgress, setSweepInProgress] = useState(false);
  const [sweepDone, setSweepDone] = useState<{ address: string; amount?: string } | null>(null);

  const manualIsValid = /^G[A-Z2-7]{55}$/.test(destinationAddress);

  // Called when user clicks "Use this address" from either wallet-connect or manual entry.
  function requestConfirm(address: string) {
    setPendingAddress(address);
    setClaimError(null);
    setRateLimit(undefined);
  }

  function cancelConfirm() {
    setPendingAddress(null);
  }

  async function executeClaim(address: string) {
    setClaiming(true);
    setClaimError(null);
    setRateLimit(undefined);
    try {
      await onClaim?.(address);
      // #433: show "funds moving" state before final success
      setSweepInProgress(true);
      setPendingAddress(null);
      // Give users brief "funds are moving" feedback, then show success.
      // In production the parent component will poll and update status, but
      // we optimistically show the final state after a short pause.
      setTimeout(() => {
        setSweepInProgress(false);
        setSweepDone({ address, amount: amountStroops });
      }, 2000);
    } catch (err) {
      if (err instanceof RateLimitError) {
        setRateLimit(err.retryAfter);
      } else {
        setClaimError(
          err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        );
      }
      setPendingAddress(null);
    } finally {
      setClaiming(false);
    }
  }

  // #433: Sweep-in-progress state — distinct from claim initiation.
  if (sweepInProgress) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 dark:border-blue-800 dark:bg-blue-950"
      >
        <span
          className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent dark:border-blue-400"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
            Funds are moving to your wallet
          </p>
          <p className="text-xs text-blue-600 mt-0.5 dark:text-blue-400">
            Your transfer is being processed on the Stellar network. This usually takes a few
            seconds.
          </p>
        </div>
      </div>
    );
  }

  // #433: Final success state — shows destination and amount.
  if (sweepDone) {
    return (
      <div role="status" aria-live="polite" className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-4 dark:border-green-800 dark:bg-green-950">
          <svg
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400"
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
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">
              Payment sent successfully!
            </p>
            {sweepDone.amount && (
              <p className="text-sm text-green-700 mt-0.5 dark:text-green-300">
                {stroopsToDisplay(sweepDone.amount, assetCode)} has been sent to your wallet.
              </p>
            )}
            <p className="mt-1 break-all font-mono text-xs text-green-600 dark:text-green-400">
              {sweepDone.address}
            </p>
          </div>
        </div>
        {sweepNote && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800">
            🛠 Dev note: {sweepNote}
          </p>
        )}
      </div>
    );
  }

  // #432: Confirmation step — shown before executing the sweep.
  if (pendingAddress) {
    return (
      <div role="dialog" aria-label="Confirm destination address" className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Sending to
          </p>
          <p className="break-all font-mono text-sm text-slate-900 dark:text-slate-100">
            {pendingAddress}
          </p>
          {amountStroops && (
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Amount:{' '}
              <span className="text-slate-900 dark:text-slate-100">
                {stroopsToDisplay(amountStroops, assetCode)}
              </span>
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Double-check this address — Stellar transfers cannot be reversed.
          </p>
        </div>

        {rateLimit !== undefined && <RateLimitBanner retryAfter={rateLimit} />}
        {claimError && (
          <p
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 dark:text-red-300 dark:bg-red-950 dark:border-red-800"
          >
            {claimError}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => executeClaim(pendingAddress)}
            disabled={claiming}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 dark:bg-green-700 dark:hover:bg-green-600"
          >
            {claiming ? 'Sending…' : 'Confirm & send'}
          </button>
          <button
            type="button"
            onClick={cancelConfirm}
            disabled={claiming}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Payment details */}
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

      <hr className="border-slate-100 dark:border-slate-800" />

      {/* #432: Existing-wallet connect path */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Already have a Stellar wallet?
        </p>
        {connectedAddress ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-950">
              <div className="min-w-0">
                <p className="text-xs font-medium text-green-800 dark:text-green-300">
                  Freighter connected
                </p>
                <p className="break-all font-mono text-xs text-green-700 dark:text-green-400">
                  {connectedAddress}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConnectedAddress(null);
                  setWalletConnectError(null);
                }}
                className="shrink-0 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Disconnect
              </button>
            </div>
            <button
              type="button"
              onClick={() => requestConfirm(connectedAddress)}
              className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 dark:bg-green-700 dark:hover:bg-green-600"
            >
              Claim to {shortenAddress(connectedAddress)}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <WalletConnect
              onConnected={(wallet) => {
                setConnectedAddress(wallet.publicKey);
                setWalletConnectError(null);
              }}
              onRejected={(msg) => {
                setWalletConnectError(msg ?? 'Wallet connection was declined. You can enter your address manually below.');
              }}
            />
            {walletConnectError && (
              <p
                role="alert"
                className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800"
              >
                {walletConnectError}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <hr className="flex-1 border-slate-200 dark:border-slate-700" />
        <span>or enter address manually</span>
        <hr className="flex-1 border-slate-200 dark:border-slate-700" />
      </div>

      {/* Manual address entry — original new-wallet path */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          New to Stellar?
        </p>
        <div className="space-y-3">
          {rateLimit !== undefined && <RateLimitBanner retryAfter={rateLimit} />}
          {claimError && (
            <p
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 dark:text-red-300 dark:bg-red-950 dark:border-red-800"
            >
              {claimError}
            </p>
          )}

          <div>
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
            {destinationAddress.length > 0 && !manualIsValid && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Enter a valid Stellar public key (starts with G, 56 characters).
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => requestConfirm(destinationAddress)}
            disabled={!manualIsValid}
            className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 dark:bg-green-700 dark:hover:bg-green-600"
          >
            Claim now
          </button>
        </div>
      </div>

      <div className="pt-1">
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

/**
 * #433: ProcessingPanel covers CLAIMING and PARTIAL_SWEEP.
 * CLAIMING = "funds are moving" — distinct visual from the initial claim step.
 * PARTIAL_SWEEP = nearly done, can retry.
 */
function ProcessingPanel({ status, sweepNote }: { status: ClaimStatus; sweepNote?: string }) {
  const isClaiming = status === AccountStatus.CLAIMING;
  return (
    <div className="space-y-3">
      <div
        className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
          isClaiming
            ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
            : 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950'
        }`}
      >
        <span
          className={`mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-t-transparent ${
            isClaiming
              ? 'border-blue-400 dark:border-blue-500'
              : 'border-indigo-400 dark:border-indigo-500'
          }`}
          aria-hidden="true"
        />
        <div>
          {isClaiming ? (
            <>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                Funds are moving to your wallet
              </p>
              <p className="text-xs text-blue-600 mt-0.5 dark:text-blue-400">
                Your transfer is being processed on the Stellar network. This page will update
                automatically — it typically takes a few seconds.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
                Almost there — finalizing your transfer
              </p>
              <p className="text-xs text-indigo-600 mt-0.5 dark:text-indigo-400">
                Your claim was authorized and the sweep is finishing up. If it&apos;s taking longer
                than a few minutes, you can retry below.
              </p>
            </>
          )}
        </div>
      </div>
      {sweepNote && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800">
          🛠 Dev note: {sweepNote}
        </p>
      )}
    </div>
  );
}

/**
 * #435: ClaimedPanel distinguishes "you claimed this" vs "someone else claimed this".
 * Never offers a re-claim action. Always links to support for disputes.
 */
function ClaimedPanel({
  claimedByMe,
  sweepDestination,
  sweepAmountStroops,
  assetCode,
  supportEmail,
}: Pick<
  ClaimStatusCardProps,
  'claimedByMe' | 'sweepDestination' | 'sweepAmountStroops' | 'assetCode' | 'supportEmail'
>) {
  if (claimedByMe) {
    // "You claimed this" — success confirmation view.
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950">
          <svg
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400"
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
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">
              You already claimed this payment
            </p>
            {sweepAmountStroops && (
              <p className="text-sm text-green-700 mt-0.5 dark:text-green-300">
                {stroopsToDisplay(sweepAmountStroops, assetCode)} was sent to your wallet.
              </p>
            )}
            {sweepDestination && (
              <p className="mt-1 break-all font-mono text-xs text-green-600 dark:text-green-400">
                {sweepDestination}
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Check your Stellar wallet for the incoming transfer. It may take a moment to appear.
          {supportEmail && (
            <>
              {' '}If you have questions,{' '}
              <a
                href={`mailto:${supportEmail}`}
                className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200"
              >
                contact support
              </a>
              .
            </>
          )}
        </p>
      </div>
    );
  }

  // "Claimed by someone else" — could be a forwarded / shared link.
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <svg
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            This payment has already been claimed
          </p>
          <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">
            Each claim link can only be used once. The funds have been transferred to a wallet.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <p className="font-medium text-slate-800 mb-1 dark:text-slate-200">
          Think this is a mistake?
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
          <li>If you received this link from someone, it may have been used already.</li>
          <li>Contact the sender and ask them to send you a new payment link.</li>
          {supportEmail && (
            <li>
              For disputes, reach us at{' '}
              <a
                href={`mailto:${supportEmail}`}
                className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-slate-100"
              >
                {supportEmail}
              </a>
              .
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

/**
 * #434: ExpiredPanel — visually distinct from other error states (amber vs red),
 * explains that funds are automatically returned to the sender, no claim action offered.
 */
function ExpiredPanel({
  expiresAt,
  supportEmail,
}: Pick<ClaimStatusCardProps, 'expiresAt' | 'supportEmail'>) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
        <svg
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            This claim link has expired
          </p>
          {expiresAt && (
            <p className="text-xs text-amber-700 mt-0.5 dark:text-amber-400">
              Expired on {formatExpiry(expiresAt)}.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950">
        <p className="font-medium text-amber-800 mb-1 dark:text-amber-200">What happened?</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-amber-700 dark:text-amber-300">
          <li>
            The funds from this link have been <strong>automatically returned to the sender</strong>
            — no money has been lost.
          </li>
          <li>Contact the sender and ask them to create a new payment link for you.</li>
          {supportEmail && (
            <li>
              Need help?{' '}
              <a
                href={`mailto:${supportEmail}`}
                className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
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
  claimedByMe,
  sweepDestination,
  sweepAmountStroops,
}: ClaimStatusCardProps) {
  // Derive header for CLAIMED based on claimedByMe
  const header =
    status === AccountStatus.CLAIMED
      ? claimedByMe
        ? 'Payment claimed by you'
        : 'Payment already claimed'
      : HEADERS[status];

  return (
    <article
      aria-label={`Claim status: ${status}`}
      aria-live="polite"
      aria-atomic="true"
      aria-relevant="additions text"
      className={`rounded-xl border-2 ${BORDER_COLORS[status]} bg-white p-5 shadow-sm space-y-4 dark:bg-slate-900`}
    >
      <header className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{header}</h2>
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
      {status === AccountStatus.CLAIMED && (
        <ClaimedPanel
          claimedByMe={claimedByMe}
          sweepDestination={sweepDestination}
          sweepAmountStroops={sweepAmountStroops}
          assetCode={assetCode}
          supportEmail={supportEmail}
        />
      )}
      {status === AccountStatus.EXPIRED && (
        <ExpiredPanel expiresAt={expiresAt} supportEmail={supportEmail} />
      )}
      {status === AccountStatus.FAILED && <FailedPanel supportEmail={supportEmail} />}
    </article>
  );
}

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

      <div>
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
