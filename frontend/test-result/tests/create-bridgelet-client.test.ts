import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { BridgeletClient } from '../../lib/create-bridgelet-client';
import { fetchWithTimeout, RequestTimeoutError } from '../../lib/fetch-with-timeout';

vi.mock('../../lib/fetch-with-timeout', () => ({
  fetchWithTimeout: vi.fn(),
  RequestTimeoutError: class RequestTimeoutError extends Error {
    constructor() {
      super('The request timed out. Please try again.');
      this.name = 'RequestTimeoutError';
    }
  },
}));

describe('BridgeletClient', () => {
  const mockedFetchWithTimeout = vi.mocked(fetchWithTimeout);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts account creation through the internal app route', async () => {
    mockedFetchWithTimeout.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accountId: 'acct_123',
        publicKey: 'GABC123',
        claimUrl: null,
        amount: '10',
        asset: 'XLM',
        status: 'active',
        expiresAt: '2026-07-18T00:00:00Z',
        createdAt: '2026-07-17T00:00:00Z',
      }),
      headers: new Headers(),
    } as Response);

    const client = new BridgeletClient({ internalBaseUrl: 'https://app.example.com' });
    const result = await client.createAccount({
      fundingSource: 'wallet',
      recovery_address: 'GRECOVERY123',
      amount: '10',
      expiresIn: 300,
    });

    expect(mockedFetchWithTimeout).toHaveBeenCalledWith(
      'https://app.example.com/api/accounts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        body: JSON.stringify({
          fundingSource: 'wallet',
          recovery_address: 'GRECOVERY123',
          amount: '10',
          expiresIn: 300,
        }),
      }),
    );

    expect(result).toEqual({
      accountId: 'acct_123',
      publicKey: 'GABC123',
      claimUrl: null,
      amount: '10',
      asset: 'XLM',
      status: 'active',
      expiresAt: '2026-07-18T00:00:00Z',
      createdAt: '2026-07-17T00:00:00Z',
    });
  });

  it('retries transient failures before succeeding on the public claims endpoint', async () => {
    mockedFetchWithTimeout
      .mockRejectedValueOnce(new RequestTimeoutError())
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, claim: 'verified' }),
        headers: new Headers(),
      } as Response);

    const client = new BridgeletClient({
      baseUrl: 'https://sdk.example.com',
      maxRetries: 1,
      baseDelayMs: 1,
      maxDelayMs: 2,
    });

    await expect(client.verifyClaim('claim-token-123')).resolves.toEqual({
      ok: true,
      claim: 'verified',
    });

    expect(mockedFetchWithTimeout).toHaveBeenCalledTimes(2);
    expect(mockedFetchWithTimeout).toHaveBeenNthCalledWith(
      1,
      'https://sdk.example.com/claims/verify',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        body: JSON.stringify({ claimToken: 'claim-token-123' }),
      }),
    );
  });

  it('throws a RateLimitError when the backend responds with 429 Too Many Requests', async () => {
    mockedFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '5' }),
      json: vi.fn(),
    } as unknown as Response);

    const client = new BridgeletClient({ baseUrl: 'https://sdk.example.com' });

    await expect(client.redeemClaim('claim-token-123', 'GABC...')).rejects.toMatchObject({
      name: 'RateLimitError',
      retryAfter: 5,
    });
  });
});
