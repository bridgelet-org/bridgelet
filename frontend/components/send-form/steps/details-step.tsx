'use client';

import type { SendFormState } from '../index';

type DetailsStepProps = {
  state: SendFormState;
  onChange: (patch: Partial<SendFormState>) => void;
  onBack: () => void;
  onNext: () => void;
};

export function DetailsStep({ state, onChange, onBack, onNext }: DetailsStepProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-2">
          Network
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="relative flex cursor-pointer items-center justify-center rounded-lg border border-slate-900 bg-white p-3 shadow-sm hover:bg-slate-50">
            <input type="radio" name="network" value="stellar" defaultChecked className="sr-only" />
            <span className="text-sm font-medium text-slate-900">Stellar</span>
            <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">✓</span>
          </label>
          
          <label className="relative flex cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-3 opacity-70">
            <input type="radio" name="network" value="base" disabled className="sr-only" />
            <span className="text-sm font-medium text-slate-500">Base</span>
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600">Coming Soon</span>
          </label>
          
          <label className="relative flex cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-3 opacity-70">
            <input type="radio" name="network" value="polygon" disabled className="sr-only" />
            <span className="text-sm font-medium text-slate-500">Polygon</span>
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600">Coming Soon</span>
          </label>

          <label className="relative flex cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-3 opacity-70">
            <input type="radio" name="network" value="solana" disabled className="sr-only" />
            <span className="text-sm font-medium text-slate-500">Solana</span>
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600">Coming Soon</span>
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="recipient-email" className="block text-sm font-medium text-slate-900">
          Recipient email
        </label>
        <input
          id="recipient-email"
          type="email"
          required
          value={state.recipientEmail}
          onChange={(e) => onChange({ recipientEmail: e.target.value })}
          placeholder="recipient@example.com"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
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
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <select
            aria-label="Asset"
            value={state.assetCode}
            onChange={(e) => onChange({ assetCode: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="XLM">XLM</option>
            <option value="USDC">USDC</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="memo" className="block text-sm font-medium text-slate-900">
          Memo{' '}
          <span className="font-normal text-slate-500">(optional)</span>
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
