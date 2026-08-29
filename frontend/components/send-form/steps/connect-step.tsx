'use client';

import { useEffect, useState } from 'react';
import {
  connectFreighter,
  loadPersistedWallet,
  persistWallet,
  clearPersistedWallet,
} from '@/lib/wallet';
import { ChainSelector } from '@/components/chain-selector';
import { isValidStellarAddress } from '@/lib/validation/stellar-address';

type ConnectStepProps = {
  publicKey: string;
  onConnected: (publicKey: string) => void;
  /** Override browser extension detection for tests. Defaults to auto-detect. */
  extensionSupportedOverride?: boolean;
};

/**
 * Detects whether we are running in a browser context that supports
 * browser extensions (i.e. a real Chromium/Firefox desktop browser).
 * On platforms such as Safari mobile, in-app webviews, or non-extension
 * environments, Freighter cannot be installed, so we skip the
 * extension-install prompt and suggest an alternative.
 */
function isBrowserExtensionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  // navigator.userAgent is available in every browser; the presence of
  // "Chrome" or "Firefox" in the UA string is a coarse but practical signal
  // that the user is in a desktop browser where extensions can be installed.
  const ua = navigator.userAgent;
  return /Chrome\//.test(ua) || /Firefox\//.test(ua) || /Edg\//.test(ua);
}

export function ConnectStep({ publicKey, onConnected, extensionSupportedOverride }: ConnectStepProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Start with `true` so server-rendered HTML always shows the connect button,
  // preventing a hydration mismatch (useState lazy initializers run on the server
  // in Next.js App Router SSR). After mount we only switch to `false` when the
  // environment genuinely doesn't support extensions — never back to `true` —
  // so no spurious re-render occurs in Chromium where the check returns `true`.
  const [extensionSupported, setExtensionSupported] = useState<boolean>(true);

  useEffect(() => {
    const supported =
      extensionSupportedOverride !== undefined
        ? extensionSupportedOverride
        : isBrowserExtensionSupported();
    // Only update (and re-render) when the result is false — i.e. we need to
    // swap from the connect button to the fallback banner. In Chromium this is
    // always true so setExtensionSupported is never called and the button stays
    // stable in the DOM, which is critical for Playwright click reliability.
    if (!supported) {
      setExtensionSupported(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once after mount

  // On mount, restore a previously persisted wallet so the user doesn't
  // have to re-connect every time they navigate back through the flow.
  useEffect(() => {
    if (publicKey) return; // parent already has a key — nothing to restore
    const saved = loadPersistedWallet();
    if (saved?.publicKey) {
      // Issue #420 — never trust a persisted address blindly; a corrupted
      // or tampered localStorage value should never silently become the
      // funding/recovery address for a payment.
      if (!isValidStellarAddress(saved.publicKey)) {
        clearPersistedWallet();
        return;
      }
      onConnected(saved.publicKey);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount only

  async function handleConnect() {
    setStatus('connecting');
    setError(null);
    try {
      const wallet = await connectFreighter();
      // Issue #420 — reject a malformed destination/funding address before
      // it ever reaches the send form, rather than letting an invalid key
      // silently flow through to submission.
      if (!isValidStellarAddress(wallet.publicKey)) {
        setStatus('error');
        setError('Freighter returned an address in an unexpected format. Please try reconnecting.');
        return;
      }
      persistWallet(wallet);
      setStatus('idle');
      onConnected(wallet.publicKey);
    } catch (err) {
      setStatus('error');
      if (err instanceof Error) {
        // Surface rejection errors clearly to distinguish from "not installed"
        if (
          err.message.toLowerCase().includes('user declined') ||
          err.message.toLowerCase().includes('rejected') ||
          err.message.toLowerCase().includes('did not return a public key')
        ) {
          setError(
            'Connection request was declined. Please approve the Freighter prompt and try again.',
          );
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to connect wallet. Please try again.');
      }
    }
  }

  function handleDisconnect() {
    clearPersistedWallet();
    // Inform parent that the key is cleared by calling with empty string
    onConnected('');
  }

  if (publicKey) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            Wallet connected
          </p>
          <p className="mt-0.5 break-all font-mono text-xs text-green-700 dark:text-green-400">
            {publicKey}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDisconnect}
          className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Disconnect wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Connect your Freighter wallet to authorise payments. No password required — signing with
        your key proves you control the address.
      </p>

      <div className="py-2">
        <ChainSelector />
      </div>

      {extensionSupported ? (
        <>
          <button
            type="button"
            onClick={handleConnect}
            disabled={status === 'connecting'}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {status === 'connecting' ? 'Connecting…' : 'Connect Freighter Wallet'}
          </button>
          {status === 'error' && error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Don&apos;t have Freighter?{' '}
            <a
              href="https://docs.freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Install Freighter
            </a>
          </p>
        </>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Browser not supported for wallet extensions
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            Freighter is a browser extension for Chrome, Firefox, and Edge. Please open this page
            in a supported desktop browser to connect your wallet.
          </p>
          <a
            href="https://docs.freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
          >
            Learn about Freighter →
          </a>
        </div>
      )}
    </div>
  );
}
