import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Issue #765 — issued-asset funding pre-checks.
 *
 * `fundEphemeralAccount` must refuse to prompt the wallet for an issued asset
 * the sender cannot pay (no trustline / too little balance), and must refuse an
 * issued asset with no configured issuer at all — before any signing happens.
 */
const { loadAccountMock } = vi.hoisted(() => ({ loadAccountMock: vi.fn() }));

vi.mock('@stellar/stellar-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@stellar/stellar-sdk')>();
  return {
    ...actual,
    Horizon: {
      ...actual.Horizon,
      Server: vi.fn().mockImplementation(() => ({
        loadAccount: loadAccountMock,
        submitTransaction: vi.fn(),
      })),
    },
  };
});

vi.mock('@/lib/wallet', () => ({
  signFreighterTransaction: vi.fn(),
  isFreighterTransactionSigningAvailable: vi.fn(),
}));

import { fundEphemeralAccount } from '@/lib/fund-ephemeral-account';

const FROM = 'GCQCSGSQLB4TPCPVP6QKIVBAW5RQWYESS2WQI3KET2U4XKFACRJRQEUI';
const TO = 'GCQZD2HXO42UGHOSUFQZG27FBOAYV35QZ5SIVE5AEJ5M5N57FAPESIYI';
const ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

describe('fundEphemeralAccount issued-asset pre-check (#765)', () => {
  beforeEach(() => {
    loadAccountMock.mockReset();
  });

  it('rejects an issued asset that has no configured issuer', async () => {
    await expect(
      fundEphemeralAccount({ from: FROM, to: TO, amount: '5', assetCode: 'USDC' }),
    ).rejects.toMatchObject({ name: 'FundingError', code: 'UNSUPPORTED_ASSET' });
    expect(loadAccountMock).not.toHaveBeenCalled();
  });

  it('fails fast with MISSING_TRUSTLINE when the wallet has no such trustline', async () => {
    loadAccountMock.mockResolvedValue({
      balances: [{ asset_type: 'native', balance: '100.0000000' }],
    });

    await expect(
      fundEphemeralAccount({
        from: FROM,
        to: TO,
        amount: '5',
        assetCode: 'USDC',
        assetIssuer: ISSUER,
      }),
    ).rejects.toMatchObject({ name: 'FundingError', code: 'MISSING_TRUSTLINE' });
  });

  it('fails fast with INSUFFICIENT_BALANCE when the wallet holds too little', async () => {
    loadAccountMock.mockResolvedValue({
      balances: [
        { asset_type: 'native', balance: '100.0000000' },
        {
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: ISSUER,
          balance: '1.0000000',
        },
      ],
    });

    await expect(
      fundEphemeralAccount({
        from: FROM,
        to: TO,
        amount: '5',
        assetCode: 'USDC',
        assetIssuer: ISSUER,
      }),
    ).rejects.toMatchObject({ name: 'FundingError', code: 'INSUFFICIENT_BALANCE' });
  });

  it('wraps low-level build failures as SUBMIT_FAILED', async () => {
    loadAccountMock.mockRejectedValue(new Error('horizon unreachable'));

    await expect(
      fundEphemeralAccount({ from: FROM, to: TO, amount: '5', assetCode: 'XLM' }),
    ).rejects.toMatchObject({ name: 'FundingError', code: 'SUBMIT_FAILED' });
  });
});
