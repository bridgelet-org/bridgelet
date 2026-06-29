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
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Network <span aria-label="required">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="relative flex cursor-pointer items-center justify-center rounded-lg border border-indigo-600 bg-white p-3 shadow-sm hover:bg-slate-50">
              <input type="radio" name="claim-network" value="stellar" defaultChecked className="sr-only" />
              <span className="text-sm font-medium text-slate-900">Stellar</span>
              <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">✓</span>
            </label>
            
            <label className="relative flex cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-3 opacity-70">
              <input type="radio" name="claim-network" value="base" disabled className="sr-only" />
              <span className="text-sm font-medium text-slate-500">Base</span>
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600">Coming Soon</span>
            </label>
            
            <label className="relative flex cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-3 opacity-70">
              <input type="radio" name="claim-network" value="polygon" disabled className="sr-only" />
              <span className="text-sm font-medium text-slate-500">Polygon</span>
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600">Coming Soon</span>
            </label>

            <label className="relative flex cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-3 opacity-70">
              <input type="radio" name="claim-network" value="solana" disabled className="sr-only" />
              <span className="text-sm font-medium text-slate-500">Solana</span>
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600">Coming Soon</span>
            </label>
          </div>
        </div>
        <div>
          <label htmlFor="stellar-address" className="block text-sm font-medium text-slate-700">
            Your Stellar wallet address <span aria-label="required">*</span>
          </label>
          <input id="stellar-address" type="text" required autoComplete="off"
            value={address} onChange={e => { setAddress(e.target.value); setError(null); }}
            placeholder="G..." aria-required="true"
            aria-invalid={error !== null}
            aria-describedby={error ? 'address-error' : 'address-hint'}
            className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {!error && <p id="address-hint" className="mt-1 text-xs text-slate-500">56-character Stellar public key starting with G.</p>}
          {error && <p id="address-error" role="alert" aria-live="assertive" className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <button type="submit" disabled={isLoading}
          aria-disabled={isLoading}
          className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
          {isLoading ? <span aria-live="polite">Processing…</span> : 'Claim payment'}
        </button>
      </div>
    </form>
  );
}
