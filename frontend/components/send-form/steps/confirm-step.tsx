'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SendFormState } from '../index';
import { useNfc } from '@/hooks/use-nfc';
import { BridgeletClient, RateLimitError } from '@/lib/api/client';
import { createEphemeralAccount, type EphemeralAccount } from '@/lib/bridgelet';
import { estimateCreateAccountFee } from '@/lib/fee-estimation';
import { getXlmUsdRate } from '@/lib/xlm-price';
import {
  FreighterSenderSigningError,
  toCreateAccountRequestWithFreighterSignature,
  tryFreighterSenderSigning,
} from '@/lib/freighter-sender-signing';
import {
  classifyAccountCreationError,
  AccountCreationErrorCode,
  type AccountCreationErrorInfo,
} from '@/lib/account-errors';
import { publicEnv } from '@/lib/env';
import { isValidStellarAddress } from '@/lib/validation/stellar-address';
import { CopyToClipboard } from '@/components/copy-to-clipboard';
import { QRCodeModalButton } from '@/components/qr-code';

/**
 * Default claim window for accounts created from the send form.
 * CreateAccountRequest.expiresIn is required by the backend (min 3600,
 * max 2592000 seconds). This constant is kept as a fallback only;
 * the send form now lets the sender choose the expiry.
 */
const DEFAULT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;
const MAX_RETRIES = 3;

/**
 * Issue #421 — After this many ms still waiting on the network response,
 * the UI switches from "Sending…" to a distinct "Confirming on Stellar
 * network…" state. This isn't driven by a second API call — the create-
 * account request is a single round trip — but it gives the sender an
 * honest signal that their transaction has left the client and is now
 * waiting on network/ledger confirmation rather than still being built.
 */
const CONFIRMING_AFTER_MS = 2500;

/**
 * Issue #421 — After this many ms still waiting, show a non-blocking
 * "this is taking longer than usual" notice. We deliberately do NOT abort
 * the request at this point: the underlying client already retries with
 * backoff, and the transaction may have already landed on-chain even if
 * the HTTP response is slow — cancelling client-side could desync the UI
 * from a payment that actually succeeded.
 */
const SLOW_RESPONSE_AFTER_MS = 15_000;

const client = new BridgeletClient();

function classifyError(err: unknown): AccountCreationErrorInfo {
  if (err instanceof FreighterSenderSigningError) {
    return {
      code: AccountCreationErrorCode.INVALID_REQUEST,
      userMessage: err.message,
      retryable: err.code === 'USER_REJECTED',
      suggestion:
        err.code === 'SIGNER_MISMATCH'
          ? 'Reconnect the Freighter wallet that funds this payment, then try again.'
          : 'Approve the Freighter prompt, or go back and reconnect your wallet.',
    };
  }
  if (err instanceof RateLimitError) {
    return {
      code: AccountCreationErrorCode.RATE_LIMITED,
      userMessage: err.message,
      retryable: true,
      suggestion: 'Please wait before retrying.',
    };
  }
  return classifyAccountCreationError(err);
}

type ConfirmStepProps = {
  state: SendFormState;
  onBack: () => void;
};

type SubmitPhase =
  | 'idle'
  | 'preparing'
  | 'awaiting-freighter'
  | 'submitting'
  | 'confirming'
  | 'success';

interface FeeDisplay {
  xlm: string;
  fiat: string | null;
  capacityUsage: number;
}

export function ConfirmStep({ state, onBack }: ConfirmStepProps) {
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [signingModeUsed, setSigningModeUsed] = useState<'freighter-client' | 'backend' | null>(
    null,
  );
  const [errorInfo, setErrorInfo] = useState<AccountCreationErrorInfo | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const { isSupported, writeUrl, isWriting, error: nfcError } = useNfc();

  // Issue #421 — pending/confirming state timers
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const confirmingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingTimers = useCallback(() => {
    if (confirmingTimerRef.current) clearTimeout(confirmingTimerRef.current);
    if (slowWarningTimerRef.current) clearTimeout(slowWarningTimerRef.current);
    confirmingTimerRef.current = null;
    slowWarningTimerRef.current = null;
  }, []);

  // Clear any in-flight timers if the component unmounts mid-submission.
  useEffect(() => clearPendingTimers, [clearPendingTimers]);

  // Fee estimation state
  const [feeDisplay, setFeeDisplay] = useState<FeeDisplay | null>(null);
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeError, setFeeError] = useState<string | null>(null);

  const fetchFee = useCallback(async () => {
    setFeeLoading(true);
    setFeeError(null);
    try {
      const xlmRate = await getXlmUsdRate();
      const fee = await estimateCreateAccountFee(xlmRate > 0 ? xlmRate : null);
      setFeeDisplay({ xlm: fee.xlm, fiat: fee.fiat, capacityUsage: fee.capacityUsage });
    } catch {
      setFeeError('Could not fetch fee estimate. Network fee may apply.');
    } finally {
      setFeeLoading(false);
    }
  }, []);

  // Fetch fee on mount and refresh every 30 seconds while idle
  useEffect(() => {
    fetchFee();
    const interval = setInterval(() => {
      if (submitPhase === 'idle') fetchFee();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchFee, submitPhase]);

  const submitting = submitPhase !== 'idle' && submitPhase !== 'success';

  function buildCreateAccountPayload() {
    return {
      fundingSource: state.publicKey,
      recovery_address: state.publicKey,
      amount: state.amountXlm,
      asset_code: state.assetCode !== 'XLM' ? state.assetCode : undefined,
      expiresIn: state.expiresIn || DEFAULT_EXPIRES_IN_SECONDS,
      metadata: {
        recipientName: state.recipientName || undefined,
        recipientEmail: state.recipientEmail || undefined,
        memo: state.memo || undefined,
      },
    };
  }

  async function executeCreateAccount(attempt: number) {
    // Issue #420 — defense-in-depth: the funding/recovery address should
    // already be a real Stellar public key by the time it reaches this
    // step (ConnectStep validates it on connect), but never send a
    // malformed address to the backend — catch it here too.
    if (!isValidStellarAddress(state.publicKey)) {
      setErrorInfo({
        code: AccountCreationErrorCode.INVALID_REQUEST,
        userMessage: 'Your connected wallet address is invalid.',
        retryable: false,
        suggestion: 'Go back and reconnect a valid Stellar wallet before sending.',
      });
      return;
    }

    setSubmitPhase('preparing');
    setErrorInfo(null);
    setRetryAfter(null);
    setShowSlowWarning(false);
    clearPendingTimers();
    try {
      const payload = buildCreateAccountPayload();

      setSubmitPhase('awaiting-freighter');
      const signing = await tryFreighterSenderSigning(client, payload);

      setSubmitPhase('submitting');
      // Issue #421 — once the request is actually in flight, arm the
      // "confirming" transition and the slow-response notice. Both check
      // the phase before acting so a fast response that already reached
      // success/error isn't clobbered by a late timer firing.
      confirmingTimerRef.current = setTimeout(() => {
        setSubmitPhase((prev) => (prev === 'submitting' ? 'confirming' : prev));
      }, CONFIRMING_AFTER_MS);
      slowWarningTimerRef.current = setTimeout(() => {
        setShowSlowWarning(true);
      }, SLOW_RESPONSE_AFTER_MS);

      let account: EphemeralAccount;
      if (signing.mode === 'freighter-client') {
        account = await createEphemeralAccount(
          toCreateAccountRequestWithFreighterSignature(payload, signing.signed),
        );
        setSigningModeUsed('freighter-client');
      } else {
        account = await createEphemeralAccount(payload);
        setSigningModeUsed('backend');
      }

      if (!account.claimUrl) {
        throw new Error(
          'Account was created but no claim link was returned. Please contact support.',
        );
      }

      clearPendingTimers();
      setShowSlowWarning(false);
      setClaimUrl(account.claimUrl);
      setExpiresAt(account.expiresAt ?? null);
      setSubmitPhase('success');
    } catch (err) {
      clearPendingTimers();
      setShowSlowWarning(false);
      const info = classifyError(err);
      setErrorInfo(info);
      if (err instanceof RateLimitError) {
        setRetryAfter(err.retryAfter);
      } else {
        setRetryAfter(null);
      }
      setRetryCount(attempt);
      setSubmitPhase('idle');
    }
  }

  function handleConfirm() {
    executeCreateAccount(1);
  }

  function handleRetry() {
    const nextAttempt = retryCount + 1;
    if (nextAttempt > MAX_RETRIES) return;
    executeCreateAccount(nextAttempt);
  }

  function submittingLabel(): string {
    if (submitPhase === 'awaiting-freighter') return 'Waiting for Freighter…';
    if (submitPhase === 'preparing') return 'Preparing transaction…';
    if (submitPhase === 'confirming') return 'Confirming on Stellar network…';
    return 'Sending…';
  }

  if (submitPhase === 'success') {
    const claimLink = claimUrl || (typeof window !== 'undefined' ? `${window.location.origin}/claim` : 'https://bridgelet.org/claim');
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Here is your payment claim link via Bridgelet: ${claimLink}`)}`;
    // Issue #422 — prefer the server-reported expiry (`account.expiresAt`)
    // for the deadline shown to the sender; fall back to a client-computed
    // one from the chosen expiry window if the API didn't return it.
    const deadlineLabel = formatExpiryDeadline(
      expiresAt ?? new Date(Date.now() + (state.expiresIn || DEFAULT_EXPIRES_IN_SECONDS) * 1000).toISOString(),
    );

    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 space-y-4 dark:border-green-800 dark:bg-green-950"
      >
        <div>
          <p className="font-medium text-green-800 dark:text-green-300">Payment sent!</p>
          <p className="mt-1 text-sm text-green-700 dark:text-green-400">
            {state.recipientEmail ? (
              <>
                A claim link has been sent to <strong>{state.recipientEmail}</strong>.
              </>
            ) : (
              <>Your claim link is ready to share with your recipient.</>
            )}{' '}
            They have {formatExpiryLabel(state.expiresIn || DEFAULT_EXPIRES_IN_SECONDS)} to claim
            their funds.
          </p>
        </div>
        {signingModeUsed === 'freighter-client' && (
          <p className="text-xs text-green-700 dark:text-green-400">
            Account creation was authorised with Freighter client-side signing.
          </p>
        )}

        {/* Issue #422 — dedicated success screen: claim link, copy, and expiry */}
        {claimUrl && (
          <div className="space-y-2 rounded-lg border border-green-300 bg-white p-3 dark:border-green-700 dark:bg-slate-900">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Claim link
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={claimUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 break-all font-mono text-sm text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500 dark:text-slate-100"
              >
                {claimUrl}
              </a>
              <CopyToClipboard value={claimUrl} label="Copy link" copiedLabel="Copied!" variant="button" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400" data-testid="claim-link-expiry">
              This link expires on <strong>{deadlineLabel}</strong>. Funds are returned to your
              wallet automatically if it isn&apos;t claimed by then.
            </p>
          </div>
        )}

        {claimUrl && (
          <div>
            <QRCodeModalButton claimUrl={claimUrl} />
          </div>
        )}

        {claimUrl && (
          <div className="flex flex-wrap gap-2 pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
            >
              <span>Share via WhatsApp</span>
            </a>
          </div>
        )}

        {isSupported && claimUrl && (
          <div className="border-t border-green-200 pt-4 dark:border-green-800">
            <button
              onClick={() => writeUrl(claimUrl)}
              disabled={isWriting}
              className="inline-flex items-center rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800 disabled:opacity-60 dark:bg-green-600 dark:hover:bg-green-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              {isWriting ? 'Ready to tap... hold tag to back of phone' : 'Write to NFC Tag'}
            </button>
            {nfcError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{nfcError}</p>}
          </div>
        )}
      </div>
    );
  }

  const canRetry = errorInfo !== null && errorInfo.retryable && retryCount < MAX_RETRIES;

  const supportEmail = publicEnv.NEXT_PUBLIC_SUPPORT_EMAIL;

  return (
    <div className="space-y-4">
      <dl className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex justify-between py-1.5">
          <dt className="font-medium text-slate-700 dark:text-slate-300">From wallet</dt>
          <dd className="max-w-[56%] break-all text-right font-mono text-xs text-slate-600 dark:text-slate-400">
            {state.publicKey}
          </dd>
        </div>
        <div className="flex justify-between py-1.5">
          <dt className="font-medium text-slate-700 dark:text-slate-300">Recipient</dt>
          <dd className="text-slate-600 dark:text-slate-400">
            {[state.recipientName, state.recipientEmail].filter(Boolean).join(' — ') ||
              'Not specified'}
          </dd>
        </div>
        <div className="flex justify-between py-1.5">
          <dt className="font-medium text-slate-700 dark:text-slate-300">Amount</dt>
          <dd className="text-slate-600 dark:text-slate-400">
            {state.amountXlm} {state.assetCode}
          </dd>
        </div>
        {state.memo && (
          <div className="flex justify-between py-1.5">
            <dt className="font-medium text-slate-700 dark:text-slate-300">Memo</dt>
            <dd className="text-slate-600 dark:text-slate-400">{state.memo}</dd>
          </div>
        )}
        {/* Issue #425 — expiry summary */}
        <div className="flex justify-between py-1.5">
          <dt className="font-medium text-slate-700 dark:text-slate-300">Claim expires</dt>
          <dd className="text-slate-600 dark:text-slate-400">
            {formatExpiryLabel(state.expiresIn || DEFAULT_EXPIRES_IN_SECONDS)} from now
          </dd>
        </div>
        <div className="flex justify-between py-1.5">
          <dt className="font-medium text-slate-700 dark:text-slate-300">Signing</dt>
          <dd className="text-slate-600 dark:text-slate-400">Freighter (experimental) with backend fallback</dd>
        </div>
      </dl>

      {/* Issue #426 — fee estimation */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Estimated network fee
          </span>
          <button
            type="button"
            onClick={fetchFee}
            disabled={feeLoading}
            aria-label="Refresh fee estimate"
            className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-40 dark:text-slate-500 dark:hover:text-slate-200"
          >
            {/* Refresh icon */}
            <svg
              className={`h-4 w-4 ${feeLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        <div aria-live="polite" className="mt-1">
          {feeLoading && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Fetching fee estimate…</p>
          )}
          {!feeLoading && feeError && (
            <p className="text-sm text-amber-700 dark:text-amber-400">{feeError}</p>
          )}
          {!feeLoading && feeDisplay && (
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {feeDisplay.xlm} XLM
                {feeDisplay.fiat && (
                  <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                    {feeDisplay.fiat}
                  </span>
                )}
              </p>
              {feeDisplay.capacityUsage > 0.8 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Network is currently busy — fees may be higher than usual.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {errorInfo && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-start">
            <svg
              className="mr-2 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">{errorInfo.userMessage}</p>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">{errorInfo.suggestion}</p>
              {retryAfter !== null && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Please wait {retryAfter} second{retryAfter !== 1 ? 's' : ''} before retrying.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Issue #421 — distinct visual states for the submit/pending gap */}
      {submitting && (
        <div
          role="status"
          aria-live="polite"
          data-testid="submit-pending-state"
          data-phase={submitPhase}
          className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950"
        >
          <svg
            className="h-5 w-5 shrink-0 animate-spin text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              {submittingLabel()}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              {submitPhase === 'confirming'
                ? "Your transaction has been submitted and is waiting for network confirmation. Don't close this page."
                : 'Please wait — this only takes a few seconds.'}
            </p>
          </div>
        </div>
      )}

      {/* Issue #421 — timeout handling: a non-blocking notice if confirmation is unusually slow */}
      {submitting && showSlowWarning && (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
        >
          This is taking longer than usual. The Stellar network may be busy — your payment has not
          failed, and we&apos;ll keep waiting for a confirmation.
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Back
        </button>
        {errorInfo && canRetry ? (
          <button
            type="button"
            onClick={handleRetry}
            disabled={submitting}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
          >
            {submitting ? submittingLabel() : `Try Again (${MAX_RETRIES - retryCount} left)`}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {submitting ? submittingLabel() : 'Confirm & Send'}
          </button>
        )}
      </div>

      {errorInfo && retryCount >= MAX_RETRIES && supportEmail && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Still having trouble?{' '}
          <a
            href={`mailto:${supportEmail}`}
            className="font-medium text-red-700 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            Contact support
          </a>
          .
        </p>
      )}
    </div>
  );
}

function formatExpiryLabel(seconds: number): string {
  const days = Math.round(seconds / (24 * 60 * 60));
  if (days === 1) return '24 hours';
  if (days < 7) return `${days} days`;
  if (days === 7) return '7 days';
  if (days === 30) return '30 days';
  return `${days} days`;
}

/**
 * Issue #422 — Formats an ISO timestamp as an absolute, human-readable
 * deadline (e.g. "September 4, 2026 at 3:45 PM") so the sender knows
 * exactly when the claim link stops working, not just a relative window.
 */
function formatExpiryDeadline(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return 'an unknown date';
  return date.toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}
