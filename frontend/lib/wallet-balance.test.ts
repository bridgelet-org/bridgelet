import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAccountBalance, clearBalanceCache } from './wallet-balance';

const VALID_PUBLIC_KEY = 'G' + 'A'.repeat(55);

describe('getAccountBalance (Issue #420)', () => {
  beforeEach(() => {
    clearBalanceCache();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null for an empty public key without calling fetch', async () => {
    const balance = await getAccountBalance('', 'XLM');
    expect(balance).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns the native balance for XLM', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        balances: [
          { asset_type: 'native', balance: '42.5000000' },
          { asset_type: 'credit_alphanum4', asset_code: 'USDC', balance: '10.0000000' },
        ],
      }),
    } as Response);

    const balance = await getAccountBalance(VALID_PUBLIC_KEY, 'XLM');
    expect(balance).toBe(42.5);
  });

  it('returns the matching asset_code balance for non-XLM assets', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        balances: [
          { asset_type: 'native', balance: '5.0000000' },
          { asset_type: 'credit_alphanum4', asset_code: 'USDC', balance: '99.0000000' },
        ],
      }),
    } as Response);

    const balance = await getAccountBalance(VALID_PUBLIC_KEY, 'USDC');
    expect(balance).toBe(99);
  });

  it('returns 0 when the account exists but holds no line of the requested asset', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ balances: [{ asset_type: 'native', balance: '5.0000000' }] }),
    } as Response);

    const balance = await getAccountBalance(VALID_PUBLIC_KEY, 'USDC');
    expect(balance).toBe(0);
  });

  it('returns null (fails open) when the account is not found', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response);

    const balance = await getAccountBalance(VALID_PUBLIC_KEY, 'XLM');
    expect(balance).toBeNull();
  });

  it('returns null (fails open) when the network request throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('network error'));

    const balance = await getAccountBalance(VALID_PUBLIC_KEY, 'XLM');
    expect(balance).toBeNull();
  });

  it('caches the account response for repeated lookups', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ balances: [{ asset_type: 'native', balance: '5.0000000' }] }),
    } as Response);

    await getAccountBalance(VALID_PUBLIC_KEY, 'XLM');
    await getAccountBalance(VALID_PUBLIC_KEY, 'XLM');

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
