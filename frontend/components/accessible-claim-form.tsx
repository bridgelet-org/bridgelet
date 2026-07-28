// #122 – Accessible claim form addressing WCAG 2.1 AA requirements
'use client';
import { useState } from 'react';

type Props = { onSubmit: (address: string) => void; isLoading?: boolean };

export function AccessibleClaimForm({ onSubmit, isLoading = false }: Props) {
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isValid = /^G[A-Z2-7]{55}$/.test(address);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) {
      setError('Enter a valid Stellar address (starts with G, 56 characters).');
      return;
    }
    setError(null);
    onSubmit(address);
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Claim payment form">
      <div className="space-y-4">
        <div>
          <label htmlFor="stellar-address" className="block text-sm font-medium text-slate-700">
            Your Stellar wallet address <span aria-label="required">*</span>
          </label>
          <input
            id="stellar-address"
            type="text"
            required
            autoComplete="off"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setError(null);
            }}
            placeholder="G..."
            aria-required="true"
            aria-invalid={error !== null}
            aria-describedby={error ? 'address-error' : 'address-hint'}
            className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {!error && (
            <p id="address-hint" className="mt-1 text-xs text-slate-500">
              56-character Stellar public key starting with G.
            </p>
          )}
          {error && (
            <p
              id="address-error"
              role="alert"
              aria-live="assertive"
              className="mt-1 text-xs text-red-600"
            >
              {error}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          aria-disabled={isLoading}
          className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {isLoading ? <span aria-live="polite">Processing…</span> : 'Claim payment'}
        </button>
      </div>
    </form>
  );
}
