'use client';

import { useState } from 'react';
import { NfcShareButton } from './nfc-share-button';

type SharePromptProps = {
  appUrl: string;
};

export function SharePrompt({ appUrl }: SharePromptProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — no-op
    }
  }

  const shareText = encodeURIComponent(`Send and claim crypto payments seamlessly with Bridgelet: ${appUrl}`);
  const whatsappUrl = `https://wa.me/?text=${shareText}`;

  return (
    <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50 p-5 space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-800">
          Do you send payments to your team or community?
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Bridgelet lets anyone send funds to recipients who have no crypto wallet — they claim
          directly from a link. Share it with employers, payroll managers, or community leaders.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 break-all">
          {appUrl}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700"
          type="button"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      <div className="pt-1 flex flex-col gap-3">
        <NfcShareButton claimUrl={appUrl} />

        <div className="flex flex-wrap gap-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-800"
          >
            Share on WhatsApp
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Just received a crypto payment via Bridgelet — the recipient needed no wallet. Check it out:')}&url=${encodeURIComponent(appUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800"
          >
            Share on X
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800"
          >
            Share on LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
}
