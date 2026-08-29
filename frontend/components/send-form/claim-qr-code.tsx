'use client';

/**
 * Issue #423 — QR code for the claim link shown on the send flow's success
 * screen, for in-person or SMS-limited disbursement scenarios where sharing
 * a long URL by hand is impractical.
 *
 * Uses the `qrcode` package to generate a spec-compliant PNG entirely
 * client-side (no network requests, no third-party QR image API), so the
 * claim URL/token never leaves the browser and the code reliably scans with
 * any standard QR reader.
 */

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type ClaimQrCodeProps = {
  /** The exact claim URL to encode. */
  value: string;
  size?: number;
  className?: string;
};

export function ClaimQrCode({ value, size = 180, className = '' }: ClaimQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (error) return null;

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      {dataUrl ? (
        <img
          src={dataUrl}
          width={size}
          height={size}
          className="rounded-lg bg-white p-2 shadow-inner"
          alt="QR code that opens your Bridgelet claim link when scanned with a phone camera"
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
          aria-hidden="true"
        />
      )}
      {dataUrl && (
        <a
          href={dataUrl}
          download="bridgelet-claim-qr.png"
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download QR code
        </a>
      )}
    </div>
  );
}
