'use client';

import { useState } from 'react';

const EXPIRY_OPTIONS = [
  { value: 24, label: '24 hours' },
  { value: 72, label: '3 days' },
  { value: 168, label: '7 days' },
];

type ExpiryStepProps = {
  expiresInHours: number;
  onChange: (hours: number) => void;
  onBack: () => void;
  onNext: () => void;
};

export function ExpiryStep({ expiresInHours, onChange, onBack, onNext }: ExpiryStepProps) {
  const [selected, setSelected] = useState<number>(expiresInHours);
  const [error, setError] = useState<string | null>(null);

  function handleContinue() {
    if (!EXPIRY_OPTIONS.some((o) => o.value === selected)) {
      setError('Please choose how long the claim link should stay valid.');
      return;
    }
    setError(null);
    onChange(selected);
    onNext();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        The payment is sent to a temporary inbox address. The claim link you share with the
        recipient will automatically expire after the period you choose below: unclaimed funds
        are returned to your wallet.
      </p>

      <fieldset>
        <legend className="text-sm font-medium text-slate-900">Claim link expires after</legend>
        <div className="mt-2 space-y-2">
          {EXPIRY_OPTIONS.map((option) => {
            const isSelected = selected === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm text-slate-800 transition ${
                  isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="expiry"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => setSelected(option.value)}
                  className="accent-slate-900"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
}