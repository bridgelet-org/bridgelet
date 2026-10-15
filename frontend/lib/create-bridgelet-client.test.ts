import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BridgeletClient } from '@/lib/create-bridgelet-client';

/**
 * Issue #764 — sender history.
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

describe('BridgeletClient.listAccounts (#764)', () => {
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

  it('returns the account list from the internal proxy', async () => {
    const accounts = [
      { accountId: 'a1', publicKey: 'G1', claimUrl: null, status: 'pending_claim' },
    ];
    fetchMock.mockResolvedValue(jsonResponse(accounts));

    const result = await makeClient().listAccounts();

    expect(result).toEqual(accounts);
    expect(fetchMock).toHaveBeenCalledWith('http://app.test/api/accounts', expect.any(Object));
  });

  it('forwards limit and offset as query parameters', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await makeClient().listAccounts({ limit: 10, offset: 5 });

    expect(fetchMock).toHaveBeenCalledWith('http://app.test/api/accounts?limit=10&offset=5', expect.any(Object));
  });

  it('omits the query string when no options are provided', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await makeClient().listAccounts({});

    expect(fetchMock).toHaveBeenCalledWith('http://app.test/api/accounts', expect.any(Object));
  });
});
