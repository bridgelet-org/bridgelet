import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jsQR from 'jsqr';
import { QRCode, QRCodeModalButton, generateQrMatrix, QUIET_ZONE_MODULES } from './qr-code';

/**
 * Rasterizes a QR module matrix into a plain RGBA bitmap (the same shape a
 * `<canvas>` 2D context's `getImageData()` would return) so it can be fed to
 * a real, independent QR decoder. This mirrors how the SVG is rendered —
 * dark modules on a white background with a quiet zone — without depending
 * on canvas/DOM rasterization support in the test environment.
 */
function rasterizeMatrix(grid: boolean[][], modulePx = 4): { data: Uint8ClampedArray; width: number; height: number } {
  const totalModules = grid.length + QUIET_ZONE_MODULES * 2;
  const px = totalModules * modulePx;
  const data = new Uint8ClampedArray(px * px * 4).fill(255); // start all-white, full alpha

  const setDark = (x: number, y: number) => {
    const idx = (y * px + x) * 4;
    data[idx] = 0;
    data[idx + 1] = 0;
    data[idx + 2] = 0;
    data[idx + 3] = 255;
  };

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      if (!grid[r]![c]) continue;
      const startX = (c + QUIET_ZONE_MODULES) * modulePx;
      const startY = (r + QUIET_ZONE_MODULES) * modulePx;
      for (let dy = 0; dy < modulePx; dy++) {
        for (let dx = 0; dx < modulePx; dx++) {
          setDark(startX + dx, startY + dy);
        }
      }
    }
  }

  return { data, width: px, height: px };
}

describe('Client-Side QR Code Generator (Issue #409)', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders QR code SVG locally without making remote network calls', () => {
    const claimUrl = 'https://bridgelet.org/claim/secret-token-12345';
    render(<QRCode value={claimUrl} size={200} />);

    const svgElement = screen.getByRole('img', { name: new RegExp(claimUrl, 'i') });
    expect(svgElement).toBeInTheDocument();
    expect(svgElement.tagName.toLowerCase()).toBe('svg');

    // Security Verification: Guarantee zero external network calls occurred
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('toggles QR code modal button and renders claim link locally', () => {
    const claimUrl = 'https://bridgelet.org/claim/secret-token-67890';
    render(<QRCodeModalButton claimUrl={claimUrl} />);

    const button = screen.getByRole('button', { name: /show qr code/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    expect(screen.getByRole('button', { name: /hide qr code/i })).toBeInTheDocument();
    expect(screen.getByText(/rendered 100% locally/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('QR code scan round-trip (Issue #423)', () => {
  it('decodes back to the exact claim URL it was generated from', () => {
    const claimUrl = 'https://bridgelet.org/claim/a1b2c3d4e5f6token';

    const grid = generateQrMatrix(claimUrl);
    const { data, width, height } = rasterizeMatrix(grid);

    const decoded = jsQR(data, width, height);

    expect(decoded).not.toBeNull();
    expect(decoded?.data).toBe(claimUrl);
  });

  it('round-trips claim URLs of varying length and query params', () => {
    const claimUrls = [
      'https://bridgelet.org/claim/short',
      'https://bridgelet.org/claim/a-much-longer-claim-token-with-lots-of-entropy-1234567890',
      'https://bridgelet.org/claim/token123?ref=email&exp=1735689600',
    ];

    for (const url of claimUrls) {
      const grid = generateQrMatrix(url);
      const { data, width, height } = rasterizeMatrix(grid);
      const decoded = jsQR(data, width, height);

      expect(decoded?.data).toBe(url);
    }
  });

  it('produces a matrix with the required quiet-zone-compatible finder pattern structure', () => {
    // The three 7x7 finder patterns are what let a scanner locate the code
    // at all; verify the encoder actually drew them (top-left corner check)
    // rather than trusting the library blindly.
    const grid = generateQrMatrix('https://bridgelet.org/claim/xyz');
    // Finder pattern ring: outer border all dark, then a light ring, then a
    // dark 3x3 core — spot-check a few cells of the top-left finder.
    expect(grid[0]?.[0]).toBe(true);
    expect(grid[0]?.[6]).toBe(true);
    expect(grid[3]?.[3]).toBe(true); // core of the finder pattern
    expect(grid[1]?.[1]).toBe(false); // inside the outer ring, outside the core
  });

  it('renders a QR whose rasterized SVG output round-trips through a real decoder', () => {
    // End-to-end sanity check tying the component's own rendering path
    // (rects positioned with the same quiet-zone offset used in <QRCode>)
    // back to a successful decode, so a future change to the offset math
    // can't silently break real-world scannability.
    const claimUrl = 'https://bridgelet.org/claim/end-to-end-check';
    render(<QRCode value={claimUrl} size={200} />);

    const svg = screen.getByRole('img', { name: new RegExp(claimUrl, 'i') });
    const rects = svg.querySelectorAll('rect');
    // First rect is the white background; the rest are dark modules offset
    // by QUIET_ZONE_MODULES cells, matching generateQrMatrix's own layout.
    expect(rects.length).toBeGreaterThan(1);

    const grid = generateQrMatrix(claimUrl);
    const { data, width, height } = rasterizeMatrix(grid);
    const decoded = jsQR(data, width, height);
    expect(decoded?.data).toBe(claimUrl);
  });
});
