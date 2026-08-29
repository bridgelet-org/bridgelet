'use client';

import { useState } from 'react';
import { connectFreighter, type ConnectedWallet } from '@/lib/wallet';

type WalletConnectProps = {
  onConnected?: (wallet: ConnectedWallet) => void;
  /**
   * #432: Called when the user explicitly declines the Freighter connection
   * request or when Freighter is not installed. The message explains what
   * happened so the parent can display it contextually.
   */
  onRejected?: (message: string) => void;
};

export function WalletConnect({ onConnected, onRejected }: WalletConnectProps) {
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setStatus('connecting');
    setError(null);
    try {
      const connected = await connectFreighter();
      setWallet(connected);
      setStatus('idle');
      onConnected?.(connected);
    } catch (err) {
      setStatus('error');
      const message = err instanceof Error ? err.message : 'Failed to connect wallet.';
      setError(message);
      // #432: surface rejection to parent so it can show contextual guidance
      onRejected?.(message);
    }
  }

  if (wallet) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <p className="text-sm font-medium text-green-800">Wallet connected</p>
        <p className="mt-0.5 break-all font-mono text-xs text-green-700">{wallet.publicKey}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleConnect}
        disabled={status === 'connecting'}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
        type="button"
      >
        {status === 'connecting' ? 'Connecting…' : 'Connect Freighter Wallet'}
      </button>
      {status === 'error' && error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-slate-500">
        Auth is wallet-based — signing a transaction with your Freighter key proves you control this
        address. No password or JWT is required.{' '}
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
