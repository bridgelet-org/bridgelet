'use client';

import { useEffect, useState } from 'react';

export type MockScenario = 'happy' | 'expired' | 'already-claimed' | 'network-error';

const SESSION_KEY = 'bridgelet_mock_scenario';

const SCENARIOS: { value: MockScenario; label: string; description: string }[] = [
  { value: 'happy', label: 'Happy Path', description: 'All API calls succeed normally' },
  { value: 'expired', label: 'Expired', description: 'Claim token has expired' },
  { value: 'already-claimed', label: 'Already Claimed', description: 'Token was already redeemed' },
  { value: 'network-error', label: 'Network Error', description: 'Simulate a network failure' },
];

/** Read the active scenario from sessionStorage (SSR-safe). */
function readScenario(): MockScenario {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY) as MockScenario | null;
    return saved ?? 'happy';
  } catch {
    return 'happy';
  }
}

/**
 * Floating developer toolbar for toggling mock scenarios.
 *
 * Only rendered in development (`process.env.NODE_ENV === 'development'`).
 * The selected scenario is persisted to sessionStorage so it survives hot
 * reloads. MSW handlers should read the scenario via `sessionStorage` (or a
 * shared signal) to decide which response to return.
 */
export function DevToolbar() {
  const [scenario, setScenario] = useState<MockScenario>('happy');
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate from sessionStorage after first render to avoid SSR mismatch.
  useEffect(() => {
    setScenario(readScenario());
    setMounted(true);
  }, []);

  function handleChange(value: MockScenario) {
    setScenario(value);
    try {
      sessionStorage.setItem(SESSION_KEY, value);
    } catch {
      // sessionStorage unavailable in some test environments — ignore
    }
  }

  // Avoid rendering until hydrated so the radio group shows the correct value.
  if (!mounted) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Open developer toolbar"
        className="fixed bottom-4 right-4 z-[9999] flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800"
      >
        <span aria-hidden="true" className="text-[13px]">
          🛠
        </span>
      </button>
    );
  }

  return (
    <aside
      role="complementary"
      aria-label="Developer toolbar"
      className="fixed bottom-4 right-4 z-[9999] w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Mock Scenario
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse developer toolbar"
          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="1" y1="1" x2="11" y2="11" />
            <line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>
      </div>

      <fieldset>
        <legend className="sr-only">Choose a mock scenario</legend>
        <div className="flex flex-col gap-1.5">
          {SCENARIOS.map(({ value, label, description }) => {
            const id = `mock-scenario-${value}`;
            const isActive = scenario === value;
            return (
              <label
                key={value}
                htmlFor={id}
                className={`flex cursor-pointer items-start gap-2 rounded-lg p-1.5 transition ${
                  isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <input
                  id={id}
                  type="radio"
                  name="mock-scenario"
                  value={value}
                  checked={isActive}
                  onChange={() => handleChange(value)}
                  className="mt-0.5 accent-slate-800"
                />
                <span className="flex flex-col">
                  <span
                    className={`text-xs font-medium ${
                      isActive ? 'text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {label}
                  </span>
                  <span className="text-[10px] text-slate-400">{description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="mt-2 text-[10px] text-slate-400">Dev only · persisted to sessionStorage</p>
    </aside>
  );
}
