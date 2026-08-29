'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { create as createQrMatrix } from 'qrcode';

/** Minimum quiet-zone width, in modules, required by the QR Code spec (ISO/IEC 18004). */
export const QUIET_ZONE_MODULES = 4;

export interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  /** Issue #448 — Optional label for screen readers */
  label?: string;
  /** Issue #448 — Show download button */
  showDownload?: boolean;
  /** Issue #448 — Error correction level: L, M, Q, H */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Issue #448 — Pure client-side SVG QR code generator.
 * Encodes input value locally into SVG matrix without making ANY network requests.
 *
 * Enhanced to be a reusable, accessible component with download support.
 */
export function QRCode({
  value,
  size = 180,
  className = '',
  label,
  showDownload = false,
  errorCorrectionLevel = 'M',
}: QRCodeProps) {
  const grid = useMemo(
    () => generateQrMatrix(value, errorCorrectionLevel),
    [value, errorCorrectionLevel],
  );
  // A quiet (blank) zone of at least 4 modules is part of the QR spec —
  // without it, real-world scanners frequently fail to lock onto the finder
  // patterns near the edge of the image.
  const totalModules = grid.length + QUIET_ZONE_MODULES * 2;
  const cellSize = size / totalModules;
  const ariaLabel = label ?? `QR Code for ${value}`;

  const handleDownload = useCallback(() => {
    const svgEl = document.querySelector<SVGElement>(`[data-qr-value="${CSS.escape(value)}"]`);
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-code-${value.slice(0, 16)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [value]);

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rounded-lg bg-white p-2 shadow-inner"
        aria-label={ariaLabel}
        role="img"
        data-qr-value={value}
      >
        <rect x={0} y={0} width={size} height={size} fill="#FFFFFF" />
        {grid.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={(c + QUIET_ZONE_MODULES) * cellSize}
                y={(r + QUIET_ZONE_MODULES) * cellSize}
                width={cellSize + 0.1}
                height={cellSize + 0.1}
                fill="#0F172A"
              />
            ) : null
          )
        )}
      </svg>
      {showDownload && (
        <button
          onClick={handleDownload}
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-label={`Download QR code for ${value}`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
      )}
    </div>
  );
}

export function QRCodeModalButton({ claimUrl }: { claimUrl: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
        {isOpen ? 'Hide QR Code' : 'Show QR Code'}
      </button>

      {isOpen && (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-md dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Scan to claim funds (Client-side rendered)
          </p>
          <QRCode value={claimUrl} size={160} />
          <span className="text-[10px] text-slate-400">
            🔒 Rendered 100% locally in browser (no data sent to external APIs)
          </span>
        </div>
      )}
    </>
  );
}

/**
 * Issue #423 — Generates a spec-compliant QR code module matrix locally,
 * with no network calls.
 *
 * Uses the `qrcode` package's synchronous, pure-JS `create()` encoder (Reed–
 * Solomon error correction, real finder/timing/alignment patterns) so the
 * output is a genuinely scannable QR code — not just a QR-shaped pattern.
 * `create()` never touches the network or the DOM, so this is safe to call
 * during SSR and keeps the "zero external network calls" guarantee.
 */
export function generateQrMatrix(
  text: string,
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M',
): boolean[][] {
  const qr = createQrMatrix(text, { errorCorrectionLevel });
  const { size } = qr.modules;
  const matrix: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      row.push(qr.modules.get(r, c) === 1);
    }
    matrix.push(row);
  }
  return matrix;
}
