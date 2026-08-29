'use client';

import { useEffect, useState } from 'react';
import type { SendFormState } from '../index';
import { ChainSelector } from '../../chain-selector';
import { getXlmUsdRate, formatFiat } from '@/lib/xlm-price';
import { isValidStellarAddress } from '@/lib/validation/stellar-address';
import { getAccountBalance } from '@/lib/wallet-balance';

const SUPPORTED_ASSETS = ['XLM', 'USDC'] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Issue #420 — Minimum send amount per asset. For XLM this reflects
 * Stellar's ~1 XLM base account reserve (the ephemeral account being
 * funded must clear the network's minimum balance to exist at all); the
 * same floor is applied to other supported assets for a simple, predictable
 * rule rather than tracking a separate reserve model per asset.
 */
const MIN_AMOUNT: Record<string, number> = { XLM: 1, USDC: 1 };

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
  } else {
    const min = MIN_AMOUNT[state.assetCode] ?? MIN_AMOUNT['XLM']!;
    if (amount < min) {
      errors.amountXlm = `Minimum amount is ${min} ${state.assetCode || 'XLM'}.`;
    }
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
  const [selectedChain, setSelectedChain] = useState('stellar');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState(false);
  const [usdRate, setUsdRate] = useState<number | null>(null);

  // Issue #420 — sender balance, used to block amounts above what the
  // connected wallet actually holds. Only looked up once we have a
  // well-formed Stellar address (the funding source from ConnectStep) —
  // never fired for a placeholder/invalid key.
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getXlmUsdRate().then((rate) => {
      if (!cancelled && rate > 0) setUsdRate(rate);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isValidStellarAddress(state.publicKey)) {
      setBalance(null);
      return;
    }
    getAccountBalance(state.publicKey, state.assetCode).then((b) => {
      if (!cancelled) setBalance(b);
    });
    return () => {
      cancelled = true;
    };
  }, [state.publicKey, state.assetCode]);

  useEffect(() => {
    if (touched) setErrors(validateDetails(state));
  }, [state.recipientEmail, state.amountXlm, state.assetCode, touched]);

  const amount = Number(state.amountXlm);
  const insufficientBalance =
    balance !== null && !Number.isNaN(amount) && amount > 0 && amount > balance;

  function markTouched() {
    if (!touched) {
      setTouched(true);
      setErrors(validateDetails(state));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validateDetails(state);
    setErrors(nextErrors);
    setTouched(true);
    if (Object.keys(nextErrors).length === 0 && !insufficientBalance) onNext();
  }

  const showConversion =
    state.assetCode === 'XLM' && usdRate !== null && !Number.isNaN(amount) && amount > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <ChainSelector
        selectedChainId={selectedChain}
        onSelectChain={setSelectedChain}
      />

      <div>
        <label htmlFor="recipient-name" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          Recipient name <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
        </label>
        <input
          id="recipient-name"
          type="text"
          maxLength={100}
          value={state.recipientName}
          onChange={(e) => onChange({ recipientName: e.target.value })}
          placeholder="e.g. Amina"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400"
        />
      </div>

      <div>
        <label htmlFor="recipient-email" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          Recipient email <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
        </label>
        <input
          id="recipient-email"
          type="email"
          value={state.recipientEmail}
          onChange={(e) => onChange({ recipientEmail: e.target.value })}
          onBlur={markTouched}
          placeholder="recipient@example.com"
          aria-invalid={errors.recipientEmail ? true : undefined}
          aria-describedby={errors.recipientEmail ? 'recipient-email-error' : undefined}
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 ${
            errors.recipientEmail
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500 dark:border-red-600'
              : 'border-slate-300 focus:border-slate-500 focus:ring-slate-500 dark:border-slate-600 dark:focus:border-slate-400 dark:focus:ring-slate-400'
          }`}
        />
        {errors.recipientEmail && (
          <p id="recipient-email-error" role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.recipientEmail}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
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
            onBlur={markTouched}
            placeholder="0.00"
            aria-invalid={errors.amountXlm || insufficientBalance ? true : undefined}
            aria-describedby={
              errors.amountXlm ? 'amount-error' : insufficientBalance ? 'amount-balance-error' : undefined
            }
            className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 ${
              errors.amountXlm || insufficientBalance
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500 dark:border-red-600'
                : 'border-slate-300 focus:border-slate-500 focus:ring-slate-500 dark:border-slate-600 dark:focus:border-slate-400 dark:focus:ring-slate-400'
            }`}
          />
          <select
            aria-label="Asset"
            required
            value={state.assetCode}
            onChange={(e) => onChange({ assetCode: e.target.value })}
            aria-invalid={errors.assetCode ? true : undefined}
            aria-describedby={errors.assetCode ? 'asset-error' : undefined}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400 dark:focus:ring-slate-400"
          >
            {SUPPORTED_ASSETS.map((asset) => (
              <option key={asset} value={asset}>
                {asset}
              </option>
            ))}
          </select>
        </div>
        {errors.amountXlm && (
          <p id="amount-error" role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.amountXlm}
          </p>
        )}
        {/* Issue #420 — amount above sender balance blocked client-side */}
        {!errors.amountXlm && insufficientBalance && (
          <p
            id="amount-balance-error"
            role="alert"
            className="mt-1 text-sm text-red-600 dark:text-red-400"
          >
            Amount exceeds your wallet balance of {balance} {state.assetCode}.
          </p>
        )}
        {errors.assetCode && (
          <p id="asset-error" role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.assetCode}
          </p>
        )}
        {/* Live XLM → USD conversion; hidden when the rate is unavailable */}
        <p aria-live="polite" className="mt-1 min-h-5 text-sm text-slate-500 dark:text-slate-400">
          {showConversion && (
            <>
              ≈ {formatFiat(amount, usdRate)} USD
              <span className="sr-only"> at the current XLM/USD rate</span>
            </>
          )}
        </p>
      </div>

      <div>
        <label htmlFor="memo" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          Memo <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
        </label>
        <input
          id="memo"
          type="text"
          maxLength={28}
          value={state.memo}
          onChange={(e) => onChange({ memo: e.target.value })}
          placeholder="e.g. Invoice #42"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Back
        </button>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          Review Payment
        </button>
      </div>
    </form>
  );
}
