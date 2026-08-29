import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import QRCode from 'qrcode';
import { ClaimQrCode } from './claim-qr-code';

// Issue #423 — the claim-link QR code on the send flow's success screen.

describe('ClaimQrCode', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the exact claim URL as a QR code image with descriptive alt text', async () => {
    const claimUrl = 'https://bridgelet.org/claim/secret-token-12345';
    render(<ClaimQrCode value={claimUrl} />);

    const img = await screen.findByRole('img', { name: /qr code that opens your bridgelet claim link/i });
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);

    // Zero-network guarantee: the claim URL/token is encoded locally and
    // never sent to any remote QR image API.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('encodes the exact value passed in, not a derived or shortened link', async () => {
    const claimUrl = 'https://bridgelet.org/claim/another-token-67890';
    const toDataURLSpy = vi.spyOn(QRCode, 'toDataURL');

    render(<ClaimQrCode value={claimUrl} />);

    await waitFor(() => expect(toDataURLSpy).toHaveBeenCalled());
    expect(toDataURLSpy.mock.calls[0]?.[0]).toBe(claimUrl);
  });

  it('offers a download link for the QR code once rendered', async () => {
    const claimUrl = 'https://bridgelet.org/claim/download-me';
    render(<ClaimQrCode value={claimUrl} />);

    const link = await screen.findByRole('link', { name: /download qr code/i });
    expect(link).toHaveAttribute('download', 'bridgelet-claim-qr.png');
    expect(link.getAttribute('href')).toMatch(/^data:image\/png;base64,/);
  });
});
