import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BridgeletClient, BridgeletApiError, RateLimitError } from '@/lib/api/client';

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => {
        const key = Object.keys(headers).find((h) => h.toLowerCase() === name.toLowerCase());
        return key ? headers[key] : null;
      },
    },
    json: async () => body,
  } as unknown as Response;
}

const fetchMock = vi.fn();

describe('BridgeletClient.redeemClaim', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeClient() {
    return new BridgeletClient({ baseUrl: 'https://api.test', maxRetries: 5 });
  }

  it('returns the redeemed claim on success with a single request', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: true, amountSwept: '100.0000000', asset: 'native' }),
    );

    const result = await makeClient().redeemClaim('tok', 'G' + 'A'.repeat(55));

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('makes exactly one request for a non-transient 4xx and surfaces the backend code', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'DESTINATION_NOT_FUNDED', message: 'destination has no trustline' } },
        400,
      ),
    );

    await expect(makeClient().redeemClaim('tok', 'G' + 'A'.repeat(55))).rejects.toMatchObject({
      name: 'BridgeletApiError',
      statusCode: 400,
      error: 'DESTINATION_NOT_FUNDED',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry 5xx responses', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'SWEEP_CONTRACT_FAILED' } }, 500));

    await expect(makeClient().redeemClaim('tok', 'G' + 'A'.repeat(55))).rejects.toBeInstanceOf(
      BridgeletApiError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws RateLimitError without retrying on 429', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'rate limited' }, 429, { 'retry-after': '42' }));

    await expect(makeClient().redeemClaim('tok', 'G' + 'A'.repeat(55))).rejects.toBeInstanceOf(
      RateLimitError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
