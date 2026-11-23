'use client';

import { useRef, useState, type FocusEvent } from 'react';
import { analytics, type SendFormFirstField } from '@/lib/analytics';

const EXPIRY_OPTIONS = [
  { value: 24, label: '24 hours' },
  { value: 72, label: '3 days' },
  { value: 168, label: '7 days' },
];

type ExpiryStepProps = {
  expiresInHours: number;
  onChange: (hours: number) => void;
  onFirstInteraction: (field: SendFormFirstField) => void;
  onBack: () => void;
  onNext: () => void;
};

export function ExpiryStep({
  expiresInHours,
  onChange,
  onFirstInteraction,
  onBack,
  onNext,
}: ExpiryStepProps) {
  const [selected, setSelected] = useState<number>(expiresInHours);
  const [error, setError] = useState<string | null>(null);
  // Value the sender started from, set on their first change. Cleared once
  // `Send Form Field Changed` (§4.2) has been reported for that edit.
  const changedFrom = useRef<number | null>(null);

  function handleSelect(value: number) {
    if (changedFrom.current === null) changedFrom.current = selected;
    setSelected(value);
  }

  // Reports at most once per edit. Called when focus leaves the radio group,
  // and again from Continue/Back because some browsers (Safari) do not focus a
  // radio on click, so a blur may never arrive. A change that ends up back at
  // its starting value reports nothing.
  function reportFieldChange() {
    const from = changedFrom.current;
    changedFrom.current = null;
    if (from === null || from === selected) return;
    analytics.sendFormFieldChanged({ fieldName: 'expiration', expiryDays: selected / 24 });
  }

  function handleGroupBlur(event: FocusEvent<HTMLFieldSetElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    reportFieldChange();
  }

  function handleBack() {
    reportFieldChange();
    onBack();
  }

  function handleContinue() {
    if (!EXPIRY_OPTIONS.some((o) => o.value === selected)) {
      setError('Please choose how long the claim link should stay valid.');
      return;
    }
    setError(null);
    reportFieldChange();
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

      <fieldset onBlur={handleGroupBlur}>
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
                  onChange={() => handleSelect(option.value)}
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
          onClick={handleBack}
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