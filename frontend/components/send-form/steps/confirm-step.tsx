'use client';

import { useState, useEffect } from 'react';
import type { SendFormState } from '../index';

type ConfirmStepProps = {
  state: SendFormState;
  onBack: () => void;
};

export function ConfirmStep({ state, onBack }: ConfirmStepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      // Placeholder: wire up to POST /api/accounts + POST /send in a real impl.
      await new Promise((res) => setTimeout(res, 800));
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  const [nfcStatus, setNfcStatus] = useState<string>('');
  const [isNfcSupported, setIsNfcSupported] = useState(false);

  // Safe to check on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setIsNfcSupported(true);
    }
  }, []);

  async function handleNfcWrite() {
    try {
      if ('NDEFReader' in window) {
        const ndef = new (window as any).NDEFReader();
        setNfcStatus('Ready... Please tap your NFC tag to the back of your device.');
        
        const claimUrl = 'https://bridgelet.app/claim/placeholder-token';
        await ndef.write(claimUrl);
        
        setNfcStatus('Successfully written to NFC tag!');
        setTimeout(() => setNfcStatus(''), 3000);
      }
    } catch (error) {
      console.error('NFC Write Error:', error);
      setNfcStatus('Failed to write to NFC tag. Ensure NFC is enabled and try again.');
      setTimeout(() => setNfcStatus(''), 4000);
    }
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
          A claim link has been sent to <strong>{state.recipientEmail}</strong>. They have 24
          hours to claim their funds.
        </p>

        {isNfcSupported && (
          <div className="mt-4 pt-4 border-t border-green-200/60">
            <p className="text-sm font-medium text-green-800 mb-2">In-person disbursement:</p>
            <button
              onClick={handleNfcWrite}
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm2.293-11.707a1 1 0 0 0-1.414-1.414l-3 3a1 1 0 0 0 0 1.414l3 3a1 1 0 0 0 1.414-1.414L12.414 12l1.879-1.879zM15 12c0-.398-.158-.797-.473-1.102l-1.5-1.5a1 1 0 1 0-1.414 1.414L12.672 12l-1.059 1.059a1 1 0 0 0 1.414 1.414l1.5-1.5C14.842 12.797 15 12.398 15 12z"/>
              </svg>
              Tap to NFC Tag
            </button>
            {nfcStatus && (
              <p className={`mt-2 text-xs font-medium ${nfcStatus.includes('Failed') ? 'text-red-600' : 'text-slate-700'}`}>
                {nfcStatus}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

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
          <dd className="text-slate-600">{state.recipientEmail}</dd>
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
      </dl>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
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
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Confirm & Send'}
        </button>
      </div>
    </div>
  );
}
