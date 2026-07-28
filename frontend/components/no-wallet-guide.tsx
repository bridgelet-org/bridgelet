// #109 – Collapsible no-wallet onboarding guide
'use client';
import { useState } from 'react';

export function NoWalletGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
        aria-expanded={open}
      >
        <span>I don&apos;t have a wallet — how do I get one?</span>
        <span aria-hidden>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t px-4 py-4 space-y-3 text-slate-600">
          <p>
            <strong>Option 1 — Lobstr (mobile, easiest):</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Download Lobstr from the App Store or Google Play.</li>
            <li>Create an account and activate your wallet (requires a small XLM deposit).</li>
            <li>Copy your Stellar address from the Receive screen and paste it above.</li>
          </ol>
          <p>
            <strong>Option 2 — Freighter (browser extension):</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>
              Install{' '}
              <a
                href="https://freighter.app"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Freighter
              </a>{' '}
              for Chrome or Firefox.
            </li>
            <li>Create a wallet and save your recovery phrase safely.</li>
            <li>
              Click <em>Connect Freighter</em> above to auto-fill your address.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
