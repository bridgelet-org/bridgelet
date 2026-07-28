'use client';

import { useEffect, useState } from 'react';

type ExpiryPreset = '24h' | '7d' | '30d' | 'custom';

type ExpiryStepProps = {
  expiresIn: number;
  onChange: (expiresIn: number) => void;
  onBack: () => void;
  onNext: () => void;
};

const PRESETS: { value: ExpiryPreset; label: string; seconds: number }[] = [
  { value: '24h', label: '24 hours', seconds: 24 * 60 * 60 },
  { value: '7d', label: '7 days', seconds: 7 * 24 * 60 * 60 },
  { value: '30d', label: '30 days', seconds: 30 * 24 * 60 * 60 },
  { value: 'custom', label: 'Custom', seconds: 0 },
];

export function ExpiryStep({ expiresIn, onChange, onBack, onNext }: ExpiryStepProps) {
  const [selectedPreset, setSelectedPreset] = useState<ExpiryPreset>(
    PRESETS.find((p) => p.seconds === expiresIn)?.value || 'custom',
  );
  const [customDays, setCustomDays] = useState(
    selectedPreset === 'custom' ? Math.max(1, Math.round(expiresIn / (24 * 60 * 60))) : '',
  );

  useEffect(() => {
    const preset = PRESETS.find((p) => p.seconds === expiresIn)?.value;
    if (preset) {
      setSelectedPreset(preset);
    }
  }, [expiresIn]);

  function handlePresetChange(preset: ExpiryPreset) {
    setSelectedPreset(preset);
    if (preset === 'custom') {
      const days = Math.max(1, Math.round(expiresIn / (24 * 60 * 60)));
      setCustomDays(String(days));
      onChange(days * 24 * 60 * 60);
    } else {
      setCustomDays('');
      const seconds = PRESETS.find((p) => p.value === preset)!.seconds;
      onChange(seconds);
    }
  }

  function handleCustomDaysChange(value: string) {
    setCustomDays(value);
    const days = parseInt(value, 10);
    if (!isNaN(days) && days >= 1) {
      onChange(days * 24 * 60 * 60);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600">
        Choose how long the claim link will remain valid. After this period, unclaimed funds are
        automatically returned to your wallet.
      </p>

      <fieldset>
        <legend className="text-sm font-medium text-slate-900">Expiry window</legend>
        <div className="mt-2 space-y-2">
          {PRESETS.map((preset) => (
            <label
              key={preset.value}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                selectedPreset === preset.value
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="expiry"
                value={preset.value}
                checked={selectedPreset === preset.value}
                onChange={() => handlePresetChange(preset.value)}
                className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <span className="text-sm font-medium text-slate-900">{preset.label}</span>
            </label>
          ))}
        </div>

        {selectedPreset === 'custom' && (
          <div className="mt-3 ml-7">
            <label htmlFor="custom-days" className="block text-sm font-medium text-slate-700">
              Number of days
            </label>
            <input
              id="custom-days"
              type="number"
              min="1"
              max="90"
              value={customDays}
              onChange={(e) => handleCustomDaysChange(e.target.value)}
              className="mt-1 block w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            <p className="mt-1 text-xs text-slate-500">Between 1 and 90 days</p>
          </div>
        )}
      </fieldset>

      <div
        role="alert"
        className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3"
      >
        <svg
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
        <p className="text-sm text-amber-800">
          Unclaimed funds are automatically returned to your wallet after the expiry window.
        </p>
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
          Continue
        </button>
      </div>
    </form>
  );
}
