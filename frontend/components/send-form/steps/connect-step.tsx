'use client';

import { useState } from 'react';
import { connectFreighter } from '@/lib/wallet';
import { ChainSelector } from '@/components/chain-selector';

type ConnectStepProps = {
  publicKey: string;
  onConnected: (publicKey: string) => void;
};

export function ConnectStep({ publicKey, onConnected }: ConnectStepProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setStatus('connecting');
    setError(null);
    try {
      const wallet = await connectFreighter();
      setStatus('idle');
      onConnected(wallet.publicKey);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to connect wallet.');
    }
  }

  if (publicKey) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <p className="text-sm font-medium text-green-800">Wallet connected</p>
        <p className="mt-0.5 break-all font-mono text-xs text-green-700">{publicKey}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Connect your Freighter wallet to authorise payments. No password required — signing with
        your key proves you control the address.
      </p>

      <div className="py-2">
        <ChainSelector />
      </div>
      <button
        type="button"
        onClick={handleConnect}
        disabled={status === 'connecting'}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
      >
        {status === 'connecting' ? 'Connecting…' : 'Connect Freighter Wallet'}
      </button>
      {status === 'error' && error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-500">
        <a
          href="https://docs.freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-slate-800"
        >
          Install Freighter
        </a>
      </p>
    </div>
  );
}
