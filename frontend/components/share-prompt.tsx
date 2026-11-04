'use client';

import { useState } from 'react';
import { normalizeAppUrl } from '@/lib/env';
import { NfcShareButton } from './nfc-share-button';

type SharePromptProps = {
  appUrl?: string | null;
};

export function SharePrompt({ appUrl }: SharePromptProps) {
  const [copied, setCopied] = useState(false);
  const resolvedAppUrl = normalizeAppUrl(appUrl);

  async function handleCopy() {
    if (!resolvedAppUrl) return;
    try {
      await navigator.clipboard.writeText(resolvedAppUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable: no-op
    }
  }

  if (!resolvedAppUrl) return null;

  const shareText = encodeURIComponent(`Send and claim crypto payments seamlessly with Bridgelet: ${resolvedAppUrl}`);
  const whatsappUrl = `https://wa.me/?text=${shareText}`;

  return (
    <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50 p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
          Do you send payments to your team or community?
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Bridgelet lets anyone send funds to recipients who have no crypto wallet: they claim
          directly from a link. Share it with employers, payroll managers, or community leaders.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 break-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {resolvedAppUrl}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          type="button"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      <div className="pt-1 flex flex-col gap-3">
        <NfcShareButton claimUrl={resolvedAppUrl} />

        <div className="flex flex-wrap gap-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Share on WhatsApp
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Just received a crypto payment via Bridgelet: the recipient needed no wallet. Check it out:')}&url=${encodeURIComponent(appUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Share on X
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(resolvedAppUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Share on LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
}
