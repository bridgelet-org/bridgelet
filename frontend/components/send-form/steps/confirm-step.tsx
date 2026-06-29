'use client';

import { useState } from 'react';
import type { SendFormState } from '../index';

type ConfirmStepProps = {
  state: SendFormState;
  onBack: () => void;
};

export function ConfirmStep({ state, onBack }: ConfirmStepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nfcStatus, setNfcStatus] = useState<string | null>(null);

  async function handleNfcWrite() {
    try {
      if ('NDEFReader' in window) {
        const ndef = new (window as any).NDEFReader();
        setNfcStatus('Ready... Please tap your NFC tag to the back of your device.');
        
        const claimUrl = (window as any)._demoClaimUrl || 'https://bridgelet.app/claim/placeholder-token';
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

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';
      let fetchedClaimUrl = 'https://bridgelet.app/claim/placeholder-token';

      if (process.env.NODE_ENV === 'development' || isDemo) {
        const res = await fetch('/api/accounts', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to create account');
        const data = await res.json();
        fetchedClaimUrl = `${window.location.origin}${data.claimUrl}?demo=true`;
      } else {
        await new Promise((res) => setTimeout(res, 800));
      }

      setSubmitted(true);
      
      // Pass the fetched URL to the NFC functionality
      (window as any)._demoClaimUrl = fetchedClaimUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    const displayClaimUrl = typeof window !== 'undefined' ? (window as any)._demoClaimUrl : '';
    
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

        {displayClaimUrl && (
          <div className="mt-3">
            <p className="text-sm font-medium text-green-800 mb-1">Share this link with your recipient:</p>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={displayClaimUrl} 
                className="w-full rounded border border-green-200 bg-white px-2 py-1 text-sm text-slate-600 focus:outline-none"
              />
              <a 
                href={displayClaimUrl} 
                target="_blank" 
                rel="noreferrer"
                className="whitespace-nowrap rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700"
              >
                Open link
              </a>
            </div>
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
