import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BridgeletClient, BridgeletApiError } from '@/lib/create-bridgelet-client';

/**
 * Issue #764 & #956 — sender history and normalized accounts list response.
 *
 * `listAccounts` wraps the app's own `/api/accounts` proxy (which attaches the
 * SDK token server-side) and forwards `limit`/`offset` as query params.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

const fetchMock = vi.fn();

describe('BridgeletClient.listAccounts (#764, #956)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeClient() {
    return new BridgeletClient({ internalBaseUrl: 'http://app.test' });
  }

  it('normalizes the real SDK object shape { accounts, total }', async () => {
    const rawData = {
      accounts: [
        { accountId: 'a1', publicKey: 'G1', claimUrl: null, status: 'pending_claim' },
      ],
      total: 15,
    };
    fetchMock.mockResolvedValue(jsonResponse(rawData));

    const result = await makeClient().listAccounts();

    expect(result).toEqual({
      accounts: rawData.accounts,
      total: 15,
    });
    expect(fetchMock).toHaveBeenCalledWith('http://app.test/api/accounts', expect.any(Object));
  });

  it('backward-compatibly wraps a bare array into { accounts, total }', async () => {
    const rawArray = [
      { accountId: 'a1', publicKey: 'G1', claimUrl: null, status: 'pending_claim' },
      { accountId: 'a2', publicKey: 'G2', claimUrl: null, status: 'claimed' },
    ];
    fetchMock.mockResolvedValue(jsonResponse(rawArray));

    const result = await makeClient().listAccounts();

    expect(result).toEqual({
      accounts: rawArray,
      total: 2,
    });
  });

  it('throws a typed BridgeletApiError if the response shape is invalid', async () => {
    fetchMock.mockResolvedValue(jsonResponse('invalid-string-body'));

    await expect(makeClient().listAccounts()).rejects.toThrow(BridgeletApiError);
  });

  it('forwards limit and offset as query parameters', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ accounts: [], total: 0 }));

    await makeClient().listAccounts({ limit: 10, offset: 5 });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://app.test/api/accounts?limit=10&offset=5',
      expect.any(Object),
    );
  });

  it('omits the query string when no options are provided', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ accounts: [], total: 0 }));

    await makeClient().listAccounts({});

    expect(fetchMock).toHaveBeenCalledWith('http://app.test/api/accounts', expect.any(Object));
  });
});
