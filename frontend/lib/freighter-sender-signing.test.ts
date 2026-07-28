import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BridgeletApiError } from '@/lib/create-bridgelet-client';
import {
  FreighterSenderSigningError,
  isFreighterSenderSigningEnabled,
  isPrepareUnavailableError,
  isUserRejectedSigningError,
  toCreateAccountRequestWithFreighterSignature,
  tryFreighterSenderSigning,
} from '@/lib/freighter-sender-signing';

vi.mock('@/lib/wallet', () => ({
  isFreighterTransactionSigningAvailable: vi.fn(),
  signFreighterTransaction: vi.fn(),
}));

import {
  isFreighterTransactionSigningAvailable,
  signFreighterTransaction,
} from '@/lib/wallet';

const PAYLOAD = {
  fundingSource: 'G' + 'A'.repeat(55),
  recovery_address: 'G' + 'A'.repeat(55),
  amount: '10',
  expiresIn: 86400,
};

describe('freighter-sender-signing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_ENABLE_FREIGHTER_SENDER_SIGNING;
    vi.mocked(isFreighterTransactionSigningAvailable).mockReturnValue(true);
  });

  it('defaults the experiment feature flag to enabled', () => {
    expect(isFreighterSenderSigningEnabled()).toBe(true);
  });

  it('disables the experiment when the feature flag is off', () => {
    process.env.NEXT_PUBLIC_ENABLE_FREIGHTER_SENDER_SIGNING = 'false';
    expect(isFreighterSenderSigningEnabled()).toBe(false);
  });

  it('detects prepare-unavailable API statuses', () => {
    expect(isPrepareUnavailableError(new BridgeletApiError({}, 404))).toBe(true);
    expect(isPrepareUnavailableError(new BridgeletApiError({}, 501))).toBe(true);
    expect(isPrepareUnavailableError(new BridgeletApiError({}, 500))).toBe(false);
  });

  it('detects Freighter user rejection messages', () => {
    expect(isUserRejectedSigningError(new Error('User rejected the request'))).toBe(true);
    expect(isUserRejectedSigningError(new Error('network failed'))).toBe(false);
  });

  it('returns freighter-client mode when prepare and sign succeed', async () => {
    const client = {
      prepareAccountTransaction: vi.fn().mockResolvedValue({ unsignedTxXdr: 'AAAA_UNSIGNED' }),
    };
    vi.mocked(signFreighterTransaction).mockResolvedValue({
      signedTxXdr: 'AAAA_SIGNED',
      signerAddress: PAYLOAD.fundingSource,
      networkPassphrase: 'Test SDF Network ; September 2015',
    });

    const result = await tryFreighterSenderSigning(client, PAYLOAD);

    expect(result.mode).toBe('freighter-client');
    if (result.mode === 'freighter-client') {
      expect(result.signed.signedTxXdr).toBe('AAAA_SIGNED');
      expect(
        toCreateAccountRequestWithFreighterSignature(PAYLOAD, result.signed).signingMode,
      ).toBe('freighter-client');
    }
  });

  it('falls back to backend when prepare is unavailable', async () => {
    const client = {
      prepareAccountTransaction: vi
        .fn()
        .mockRejectedValue(new BridgeletApiError({ message: 'not found' }, 404)),
    };

    await expect(tryFreighterSenderSigning(client, PAYLOAD)).resolves.toEqual({
      mode: 'backend',
      reason: 'prepare-unavailable',
    });
  });

  it('falls back to backend when Freighter signing API is unavailable', async () => {
    vi.mocked(isFreighterTransactionSigningAvailable).mockReturnValue(false);
    const client = {
      prepareAccountTransaction: vi.fn(),
    };

    await expect(tryFreighterSenderSigning(client, PAYLOAD)).resolves.toEqual({
      mode: 'backend',
      reason: 'freighter-signing-unavailable',
    });
    expect(client.prepareAccountTransaction).not.toHaveBeenCalled();
  });

  it('throws when the signer address does not match the funding source', async () => {
    const client = {
      prepareAccountTransaction: vi.fn().mockResolvedValue({ unsignedTxXdr: 'AAAA_UNSIGNED' }),
    };
    vi.mocked(signFreighterTransaction).mockResolvedValue({
      signedTxXdr: 'AAAA_SIGNED',
      signerAddress: 'G' + 'B'.repeat(55),
      networkPassphrase: 'Test SDF Network ; September 2015',
    });

    await expect(tryFreighterSenderSigning(client, PAYLOAD)).rejects.toBeInstanceOf(
      FreighterSenderSigningError,
    );
  });

  it('throws when the user rejects Freighter signing (no backend fallback)', async () => {
    const client = {
      prepareAccountTransaction: vi.fn().mockResolvedValue({ unsignedTxXdr: 'AAAA_UNSIGNED' }),
    };
    vi.mocked(signFreighterTransaction).mockRejectedValue(new Error('User declined request'));

    await expect(tryFreighterSenderSigning(client, PAYLOAD)).rejects.toMatchObject({
      code: 'USER_REJECTED',
    });
  });
});
