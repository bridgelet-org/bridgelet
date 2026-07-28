// #115 – Freighter wallet integration with install fallback
'use client';
import { useState } from 'react';

type Props = { onAddress: (address: string) => void };

declare global {
  interface Window {
    freighter?: { getPublicKey(): Promise<string>; isConnected(): Promise<boolean> };
  }
}

export function FreighterConnect({ onAddress }: Props) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (typeof window === 'undefined' || !window.freighter) {
      setStatus('error');
      setError('Freighter is not installed.');
      return;
    }
    setStatus('connecting');
    setError(null);
    try {
      const key = await window.freighter.getPublicKey();
      onAddress(key);
      setStatus('idle');
    } catch {
      setStatus('error');
      setError('Failed to connect. Please unlock Freighter and try again.');
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={connect}
        disabled={status === 'connecting'}
        className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {status === 'connecting' ? 'Connecting…' : 'Connect Freighter Wallet'}
      </button>
      {status === 'error' && error && (
        <p className="text-sm text-red-600">
          {error}{' '}
          {!window?.freighter && (
            <a
              href="https://freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Install Freighter
            </a>
          )}
        </p>
      )}
    </div>
  );
}
