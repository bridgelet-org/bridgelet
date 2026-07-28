'use client';

import { useState, useEffect } from 'react';

type NfcShareButtonProps = {
  claimUrl: string;
};

export function NfcShareButton({ claimUrl }: NfcShareButtonProps) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'writing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setIsSupported(true);
    }
  }, []);

  async function handleNfcWrite() {
    if (!isSupported) {
      setStatus('error');
      setErrorMessage('Web NFC is only supported on Android Chrome.');
      return;
    }

    setStatus('writing');
    setErrorMessage(null);

    try {
      const NDEFReader = (window as unknown as { NDEFReader: new () => { write: (data: { records: Array<{ recordType: string; data: string }> }) => Promise<void> } }).NDEFReader;
      const ndef = new NDEFReader();
      await ndef.write({
        records: [{ recordType: 'url', data: claimUrl }],
      });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to write claim link to NFC tag.'
      );
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleNfcWrite}
        disabled={status === 'writing'}
        className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-purple-700 disabled:opacity-60"
      >
        <span>📱</span>
        <span>
          {status === 'writing'
            ? 'Tap NFC tag to write…'
            : status === 'success'
            ? 'Written to NFC Tag!'
            : 'Share via NFC Tap'}
        </span>
      </button>

      {!isSupported && (
        <p className="text-[11px] text-slate-500">
          NFC sharing requires Web NFC (Android Chrome).
        </p>
      )}

      {status === 'error' && errorMessage && (
        <p className="text-xs text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
