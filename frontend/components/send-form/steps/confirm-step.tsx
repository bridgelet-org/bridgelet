'use client';

import { useState } from 'react';
import type { SendFormState } from '../index';
import { useNfc } from '@/hooks/use-nfc';
import { BridgeletClient, RateLimitError } from '@/lib/api/client';
import { createEphemeralAccount, type EphemeralAccount } from '@/lib/bridgelet';
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

/**
 * Default claim window for accounts created from the send form.
 * CreateAccountRequest.expiresIn is required by the backend (min 3600,
 * max 2592000 seconds). This constant is kept as a fallback only;
 * the send form now lets the sender choose the expiry.
 */
const DEFAULT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;
const MAX_RETRIES = 3;

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

type SubmitPhase = 'idle' | 'preparing' | 'awaiting-freighter' | 'submitting';

export function ConfirmStep({ state, onBack }: ConfirmStepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [signingModeUsed, setSigningModeUsed] = useState<'freighter-client' | 'backend' | null>(
    null,
  );
  const [errorInfo, setErrorInfo] = useState<AccountCreationErrorInfo | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const { isSupported, writeUrl, isWriting, error: nfcError } = useNfc();

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
    setSubmitting(true);
    setSubmitPhase('preparing');
    setErrorInfo(null);
    setRetryAfter(null);
    try {
      const payload = buildCreateAccountPayload();

      setSubmitPhase('awaiting-freighter');
      const signing = await tryFreighterSenderSigning(client, payload);

      setSubmitPhase('submitting');
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

      setClaimUrl(account.claimUrl);
      setSubmitted(true);
    } catch (err) {
      const info = classifyError(err);
      setErrorInfo(info);
      if (err instanceof RateLimitError) {
        setRetryAfter(err.retryAfter);
      } else {
        setRetryAfter(null);
      }
      setRetryCount(attempt);
    } finally {
      setSubmitting(false);
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
    return 'Sending…';
  }

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-green-200 bg-green-50 px-4 py-4"
      >
        <p className="font-medium text-green-800">Payment sent!</p>
        <p className="mt-1 text-sm text-green-700">
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
        {signingModeUsed === 'freighter-client' && (
          <p className="mt-2 text-xs text-green-700">
            Account creation was authorised with Freighter client-side signing.
          </p>
        )}

        {isSupported && claimUrl && (
          <div className="mt-4 border-t border-green-200 pt-4">
            <button
              onClick={() => writeUrl(claimUrl)}
              disabled={isWriting}
              className="inline-flex items-center rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800 disabled:opacity-60"
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
            {nfcError && <p className="mt-2 text-xs text-red-600">{nfcError}</p>}
          </div>
        )}
      </div>
    );
  }

  const canRetry = errorInfo !== null && errorInfo.retryable && retryCount < MAX_RETRIES;

  const supportEmail = publicEnv.NEXT_PUBLIC_SUPPORT_EMAIL;

  return (
    <div className="space-y-4">
      <dl className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="flex justify-between py-1.5">
          <dt className="font-medium text-slate-700">From wallet</dt>
          <dd className="max-w-[56%] break-all text-right font-mono text-xs text-slate-600">
            {state.publicKey}
          </dd>
        </div>
        <div className="flex justify-between py-1.5">
          <dt className="font-medium text-slate-700">Recipient</dt>
          <dd className="text-slate-600">
            {[state.recipientName, state.recipientEmail].filter(Boolean).join(' — ') ||
              'Not specified'}
          </dd>
        </div>
        <div className="flex justify-between py-1.5">
          <dt className="font-medium text-slate-700">Amount</dt>
          <dd className="text-slate-600">
            {state.amountXlm} {state.assetCode}
          </dd>
        </div>
        {state.memo && (
          <div className="flex justify-between py-1.5">
            <dt className="font-medium text-slate-700">Memo</dt>
            <dd className="text-slate-600">{state.memo}</dd>
          </div>
        )}
        <div className="flex justify-between py-1.5">
          <dt className="font-medium text-slate-700">Signing</dt>
          <dd className="text-slate-600">Freighter (experimental) with backend fallback</dd>
        </div>
      </dl>

      {errorInfo && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start">
            <svg
              className="mr-2 h-5 w-5 shrink-0 text-red-600"
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
              <p className="text-sm font-medium text-red-800">{errorInfo.userMessage}</p>
              <p className="mt-1 text-sm text-red-700">{errorInfo.suggestion}</p>
              {retryAfter !== null && (
                <p className="mt-1 text-xs text-red-600">
                  Please wait {retryAfter} second{retryAfter !== 1 ? 's' : ''} before retrying.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Back
        </button>
        {errorInfo && canRetry ? (
          <button
            type="button"
            onClick={handleRetry}
            disabled={submitting}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-60"
          >
            {submitting ? submittingLabel() : `Try Again (${MAX_RETRIES - retryCount} left)`}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {submitting ? submittingLabel() : 'Confirm & Send'}
          </button>
        )}
      </div>

      {errorInfo && retryCount >= MAX_RETRIES && supportEmail && (
        <p className="text-sm text-slate-600">
          Still having trouble?{' '}
          <a
            href={`mailto:${supportEmail}`}
            className="font-medium text-red-700 underline hover:text-red-800"
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
