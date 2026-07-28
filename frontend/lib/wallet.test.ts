import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@stellar/freighter-api', () => ({
  default: {
    isConnected: vi.fn(),
    requestAccess: vi.fn(),
    getAddress: vi.fn(),
    signTransaction: vi.fn(),
  },
}));

import freighter from '@stellar/freighter-api';
import {
  isFreighterTransactionSigningAvailable,
  signFreighterTransaction,
} from '@/lib/wallet';

describe('wallet signing helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_CRYPTO_NETWORK = 'stellar-testnet';
  });

  it('detects freighter transaction signing availability', () => {
    expect(isFreighterTransactionSigningAvailable()).toBe(true);
  });

  it('signs an unsigned xdr and returns signer metadata', async () => {
    vi.mocked((freighter as any).signTransaction).mockResolvedValue({
      signedTxXdr: 'AAAA_SIGNED_XDR',
    });
    vi.mocked((freighter as any).getAddress).mockResolvedValue({
      address: 'G' + 'A'.repeat(55),
    });

    const result = await signFreighterTransaction('AAAA_UNSIGNED_XDR');

    expect((freighter as any).signTransaction).toHaveBeenCalledWith('AAAA_UNSIGNED_XDR', {
      networkPassphrase: 'Test SDF Network ; September 2015',
    });
    expect(result).toEqual({
      signedTxXdr: 'AAAA_SIGNED_XDR',
      signerAddress: 'G' + 'A'.repeat(55),
      networkPassphrase: 'Test SDF Network ; September 2015',
    });
  });

  it('supports signedTxXDR from freighter response', async () => {
    vi.mocked((freighter as any).signTransaction).mockResolvedValue({
      signedTxXDR: 'AAAA_ALT_SIGNED_XDR',
    });
    vi.mocked((freighter as any).getAddress).mockResolvedValue({
      address: 'G' + 'B'.repeat(55),
    });

    const result = await signFreighterTransaction('AAAA_UNSIGNED_XDR');
    expect(result.signedTxXdr).toBe('AAAA_ALT_SIGNED_XDR');
  });

  it('throws for missing unsigned xdr', async () => {
    await expect(signFreighterTransaction('   ')).rejects.toThrow(
      'Missing unsigned transaction XDR from server.',
    );
  });

  it('throws when freighter response does not include signed xdr', async () => {
    vi.mocked((freighter as any).signTransaction).mockResolvedValue({});

    await expect(signFreighterTransaction('AAAA_UNSIGNED_XDR')).rejects.toThrow(
      'Freighter did not return a signed transaction.',
    );
  });
});
