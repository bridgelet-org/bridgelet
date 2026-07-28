import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createEphemeralAccount,
  BridgeletApiError,
  RateLimitError,
  type EphemeralAccount,
} from '../../../lib/bridgelet';
import { fetchWithTimeout } from '../../../lib/fetch-with-timeout';

vi.mock('../../../lib/fetch-with-timeout', () => ({
  fetchWithTimeout: vi.fn(),
  RequestTimeoutError: class RequestTimeoutError extends Error {
    constructor() {
      super('The request timed out. Please try again.');
      this.name = 'RequestTimeoutError';
    }
  },
}));

const ACCOUNT: EphemeralAccount = {
  accountId: 'acct_123',
  publicKey: 'GABC123',
  claimUrl: 'https://app.example.com/claim/tok_1',
  amount: '25',
  asset: 'XLM',
  status: 'pending',
  expiresAt: '2026-07-27T00:00:00Z',
  createdAt: '2026-07-26T00:00:00Z',
};

describe('createEphemeralAccount', () => {
  const mockedFetchWithTimeout = vi.mocked(fetchWithTimeout);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs to the internal /api/accounts route and returns the typed account', async () => {
    mockedFetchWithTimeout.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ACCOUNT,
      headers: new Headers(),
    } as Response);

    const result = await createEphemeralAccount({
      fundingSource: 'GFUNDER123',
      recovery_address: 'GRECOVERY123',
      amount: '25',
      expiresIn: 86400,
    });

    expect(mockedFetchWithTimeout).toHaveBeenCalledTimes(1);
    expect(mockedFetchWithTimeout).toHaveBeenCalledWith(
      '/api/accounts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        body: JSON.stringify({
          fundingSource: 'GFUNDER123',
          recovery_address: 'GRECOVERY123',
          amount: '25',
          expiresIn: 86400,
        }),
      }),
    );

    // No Authorization header leaves the browser — the internal route
    // handler attaches the Bearer token server-side.
    const [, init] = mockedFetchWithTimeout.mock.calls[0]!;
    expect((init!.headers as Headers).has('Authorization')).toBe(false);
    expect((init!.headers as Headers).get('Content-Type')).toBe('application/json');

    expect(result).toEqual(ACCOUNT);
  });

  it('parses a 4xx error envelope into a BridgeletApiError', async () => {
    mockedFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({
        error: { code: 'INSUFFICIENT_BALANCE', message: 'Not enough funds.' },
      }),
      headers: new Headers(),
    } as Response);

    const promise = createEphemeralAccount({
      fundingSource: 'GFUNDER123',
      recovery_address: 'GRECOVERY123',
      amount: '25',
      expiresIn: 86400,
    });

    await expect(promise).rejects.toBeInstanceOf(BridgeletApiError);
    await expect(promise).rejects.toMatchObject({
      message: 'Not enough funds.',
      statusCode: 402,
      error: 'INSUFFICIENT_BALANCE',
    });
  });

  it('throws a RateLimitError with retryAfter on 429', async () => {
    mockedFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '7' }),
      json: vi.fn(),
    } as unknown as Response);

    const promise = createEphemeralAccount({
      fundingSource: 'GFUNDER123',
      recovery_address: 'GRECOVERY123',
      amount: '25',
      expiresIn: 86400,
    });

    await expect(promise).rejects.toBeInstanceOf(RateLimitError);
    await expect(promise).rejects.toMatchObject({ retryAfter: 7 });
  });
});
