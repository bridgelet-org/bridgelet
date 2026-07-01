'use client';

import { useState } from 'react';

const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;

type WalletAddressInputProps = {
  value: string;
  onChange: (value: string) => void;
  onValid?: (address: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

export function WalletAddressInput({
  value,
  onChange,
  onValid,
  label = 'Stellar Wallet Address',
  placeholder = 'G...',
  error,
  disabled = false,
}: WalletAddressInputProps) {
  const [touched, setTouched] = useState(false);

  const validationError =
    touched &&
    value.length > 0 &&
    !STELLAR_ADDRESS.test(value)
      ? 'Enter a valid Stellar public key (starts with G, 56 characters).'
      : null;

  const displayError = error ?? validationError;
  const inputId = 'wallet-address-input';

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = e.target.value.trim();

    onChange(nextValue);

    if (onValid && STELLAR_ADDRESS.test(nextValue)) {
      onValid(nextValue);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-slate-900"
      >
        {label}
      </label>

      <input
        id={inputId}
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-invalid={!!displayError}
        aria-describedby={displayError ? `${inputId}-error` : undefined}
        className={`w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 placeholder-slate-400 transition focus:outline-none focus:ring-2 disabled:opacity-50 ${
          displayError
            ? 'border-red-400 focus:ring-red-300'
            : 'border-slate-300 focus:ring-indigo-500'
        }`}
      />

      {displayError && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-xs text-red-600"
        >
          {displayError}
        </p>
      )}

      <p className="text-xs text-slate-500">
        Don&apos;t have a wallet?{' '}
        <a
          href="https://lobstr.co"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-800"
        >
          Get Lobstr
        </a>
        {' or '}
        <a
          href="https://freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-800"
        >
          Freighter
        </a>.
      </p>
    </div>
  );
}