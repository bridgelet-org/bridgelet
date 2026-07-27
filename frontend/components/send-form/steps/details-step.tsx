'use client';

import { useState } from 'react';
import type { SendFormState } from '../index';
import { ChainSelector } from '../../chain-selector';

type DetailsStepProps = {
  state: SendFormState;
  onChange: (patch: Partial<SendFormState>) => void;
  onBack: () => void;
  onNext: () => void;
};

export function DetailsStep({ state, onChange, onBack, onNext }: DetailsStepProps) {
  const [selectedChain, setSelectedChain] = useState('stellar');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <ChainSelector
        selectedChainId={selectedChain}
        onSelectChain={setSelectedChain}
      />

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
