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

  if (submitted) {
    const claimLink = typeof window !== 'undefined' ? `${window.location.origin}/claim` : 'https://bridgelet.org/claim';
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Here is your payment claim link via Bridgelet: ${claimLink}`)}`;

    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 space-y-3"
      >
        <div>
          <p className="font-medium text-green-800">Payment sent!</p>
          <p className="mt-1 text-sm text-green-700">
            A claim link has been generated for <strong>{state.recipientEmail}</strong>. They have 24
            hours to claim their funds.
          </p>
        </div>
        <div className="pt-2 flex flex-wrap gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
          >
            <span>Share via WhatsApp</span>
          </a>
        </div>
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
