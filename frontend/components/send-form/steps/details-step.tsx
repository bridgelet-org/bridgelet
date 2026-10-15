'use client';

import { useEffect, useState } from 'react';
import type { SendFormState } from '../index';
import { ChainSelector } from '../../chain-selector';
import { getXlmUsdRate, formatFiat } from '@/lib/xlm-price';
import { isAssetAvailable, supportedAssetCodes } from '@/lib/bridgelet';

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

  if (!isAssetAvailable(state.assetCode)) {
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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>('stellar');
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const errors = validateDetails(state);
  // Issued assets are only offered when an issuer is configured for the active
  // network; otherwise offer them disabled with an explanatory hint.
  const availableAssets = supportedAssetCodes();
  const usdcAvailable = isAssetAvailable('USDC');

  useEffect(() => {
    let active = true;
    getXlmUsdRate().then((rate) => {
      if (active) setUsdRate(rate);
    });
    return () => { active = false; };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = state.recipientEmail.trim();
    const amount = state.amountXlm.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const amountValid = amount !== '' && Number.isFinite(Number(amount)) && Number(amount) > 0;
    if (!emailValid || !amountValid) {
      setValidationError('All fields are required. Enter a valid email address and amount.');
      return;
    }
    setValidationError(null);
    onNext();
  }

  const amount = Number(state.amountXlm);
  const isUsdStable = state.assetCode === 'USDC';
  const hasValidAmount = !Number.isNaN(amount) && amount > 0;
  // USDC is a USD stablecoin, so its fiat estimate is the amount itself (rate 1)
  // and does not depend on the XLM rate. XLM still needs the live rate.
  const conversionRate = isUsdStable ? 1 : usdRate;
  const showConversion =
    hasValidAmount && (isUsdStable || (state.assetCode === 'XLM' && usdRate !== null));

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
            placeholder="0.00"
            aria-invalid={errors.amountXlm ? true : undefined}
            aria-describedby={errors.amountXlm ? 'amount-error' : undefined}
            className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 ${
              errors.amountXlm
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
            {availableAssets.map((asset) => (
              <option key={asset} value={asset}>
                {asset}
              </option>
            ))}
            {!usdcAvailable && (
              <option value="USDC" disabled>
                USDC — unavailable
              </option>
            )}
          </select>
        </div>
        {!usdcAvailable && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            USDC isn&apos;t available on this network yet — send XLM for now.
          </p>
        )}
        {errors.amountXlm && (
          <p id="amount-error" role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.amountXlm}
          </p>
        )}
        {errors.assetCode && (
          <p id="asset-error" role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.assetCode}
          </p>
        )}
        {/* Live fiat estimate: XLM uses the CoinGecko rate, USDC is pegged to USD. */}
        <p aria-live="polite" className="mt-1 min-h-5 text-sm text-slate-500 dark:text-slate-400">
          {showConversion && conversionRate !== null && (
            <>
              ≈ {formatFiat(amount, conversionRate)} USD
              <span className="sr-only">
                {isUsdStable ? ' at the USDC peg' : ' at the current XLM/USD rate'}
              </span>
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

      {validationError && (
        <p role="alert" className="text-sm text-red-600">
          {validationError}
        </p>
      )}

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
