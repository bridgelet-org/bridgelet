'use client';

import { useEffect, useState } from 'react';
import type { SendFormState } from '../index';
import { getXlmUsdRate, formatFiat } from '@/lib/xlm-price';

const SUPPORTED_ASSETS = ['XLM', 'USDC'] as const;

// Simple format check — the backend performs authoritative validation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  recipientEmail?: string;
  amountXlm?: string;
  assetCode?: string;
};

export function validateDetails(state: SendFormState): FieldErrors {
  const errors: FieldErrors = {};

  if (state.recipientEmail.trim() && !EMAIL_PATTERN.test(state.recipientEmail.trim())) {
    errors.recipientEmail = 'Enter a valid email address, or leave the field empty.';
  }

  const amount = Number(state.amountXlm);
  if (state.amountXlm.trim() === '' || Number.isNaN(amount)) {
    errors.amountXlm = 'Enter an amount.';
  } else if (amount <= 0) {
    errors.amountXlm = 'Amount must be greater than 0.';
  }

  if (!SUPPORTED_ASSETS.includes(state.assetCode as (typeof SUPPORTED_ASSETS)[number])) {
    errors.assetCode = 'Select an asset.';
  }

  return errors;
}

type DetailsStepProps = {
  state: SendFormState;
  onChange: (patch: Partial<SendFormState>) => void;
  onBack: () => void;
  onNext: () => void;
};

export function DetailsStep({ state, onChange, onBack, onNext }: DetailsStepProps) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState(false);
  const [usdRate, setUsdRate] = useState<number | null>(null);

  // Fetch the XLM/USD rate once on mount; the helper caches for 60s.
  useEffect(() => {
    let cancelled = false;
    getXlmUsdRate().then((rate) => {
      if (!cancelled && rate > 0) setUsdRate(rate);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-validate on every change once the user has attempted to submit,
  // so error messages clear as soon as the input becomes valid.
  useEffect(() => {
    if (touched) setErrors(validateDetails(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.recipientEmail, state.amountXlm, state.assetCode, touched]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validateDetails(state);
    setErrors(nextErrors);
    setTouched(true);
    if (Object.keys(nextErrors).length === 0) onNext();
  }

  const amount = Number(state.amountXlm);
  const showConversion =
    state.assetCode === 'XLM' && usdRate !== null && !Number.isNaN(amount) && amount > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="recipient-name" className="block text-sm font-medium text-slate-900">
          Recipient name <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id="recipient-name"
          type="text"
          maxLength={100}
          value={state.recipientName}
          onChange={(e) => onChange({ recipientName: e.target.value })}
          placeholder="e.g. Amina"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div>
        <label htmlFor="recipient-email" className="block text-sm font-medium text-slate-900">
          Recipient email <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id="recipient-email"
          type="email"
          value={state.recipientEmail}
          onChange={(e) => onChange({ recipientEmail: e.target.value })}
          placeholder="recipient@example.com"
          aria-invalid={errors.recipientEmail ? true : undefined}
          aria-describedby={errors.recipientEmail ? 'recipient-email-error' : undefined}
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 ${
            errors.recipientEmail
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-slate-300 focus:border-slate-500 focus:ring-slate-500'
          }`}
        />
        {errors.recipientEmail && (
          <p id="recipient-email-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.recipientEmail}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-slate-900">
          Amount
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="amount"
            type="number"
            required
            min="0.0000001"
            step="any"
            value={state.amountXlm}
            onChange={(e) => onChange({ amountXlm: e.target.value })}
            placeholder="0.00"
            aria-invalid={errors.amountXlm ? true : undefined}
            aria-describedby={errors.amountXlm ? 'amount-error' : undefined}
            className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 ${
              errors.amountXlm
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:border-slate-500 focus:ring-slate-500'
            }`}
          />
          <select
            aria-label="Asset"
            required
            value={state.assetCode}
            onChange={(e) => onChange({ assetCode: e.target.value })}
            aria-invalid={errors.assetCode ? true : undefined}
            aria-describedby={errors.assetCode ? 'asset-error' : undefined}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {SUPPORTED_ASSETS.map((asset) => (
              <option key={asset} value={asset}>
                {asset}
              </option>
            ))}
          </select>
        </div>
        {errors.amountXlm && (
          <p id="amount-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.amountXlm}
          </p>
        )}
        {errors.assetCode && (
          <p id="asset-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.assetCode}
          </p>
        )}
        {/* Live XLM → USD conversion; hidden when the rate is unavailable */}
        <p aria-live="polite" className="mt-1 min-h-5 text-sm text-slate-500">
          {showConversion && (
            <>
              ≈ {formatFiat(amount, usdRate)} USD
              <span className="sr-only"> at the current XLM/USD rate</span>
            </>
          )}
        </p>
      </div>

      <div>
        <label htmlFor="memo" className="block text-sm font-medium text-slate-900">
          Memo <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id="memo"
          type="text"
          maxLength={28}
          value={state.memo}
          onChange={(e) => onChange({ memo: e.target.value })}
          placeholder="e.g. Invoice #42"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Review Payment
        </button>
      </div>
    </form>
  );
}
