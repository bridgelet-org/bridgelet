import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BridgeletClient, BridgeletApiError } from '@/lib/create-bridgelet-client';

/**
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

  const accounts = [{ accountId: 'a1', publicKey: 'G1', claimUrl: null, status: 'pending_claim' }];

  it('returns the normalised list from the internal proxy', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ accounts, total: 12 }));

    const result = await makeClient().listAccounts();

    expect(result).toEqual({ accounts, total: 12 });
    expect(fetchMock).toHaveBeenCalledWith('http://app.test/api/accounts', expect.any(Object));
  });

  it('wraps a legacy bare array in the object shape', async () => {
    fetchMock.mockResolvedValue(jsonResponse(accounts));

    const result = await makeClient().listAccounts();

    expect(result).toEqual({ accounts, total: accounts.length });
  });

  it('falls back to the page length when total is missing or invalid', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ accounts }));

    const result = await makeClient().listAccounts();

    expect(result).toEqual({ accounts, total: accounts.length });
  });

  it('throws BridgeletApiError for a malformed response body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: accounts }));

    await expect(makeClient().listAccounts()).rejects.toBeInstanceOf(BridgeletApiError);
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

describe('BridgeletClient.listAccountEvents (#978)', () => {
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

  const events = [
    {
      id: 'e1',
      accountId: 'a1',
      type: 'funded',
      txHash: null,
      details: {},
      createdAt: '2026-11-01T12:00:00.000Z',
    },
  ];

  it('loads lifecycle events from the internal proxy', async () => {
    fetchMock.mockResolvedValue(jsonResponse(events));

    const result = await makeClient().listAccountEvents('a1');

    expect(result).toEqual(events);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://app.test/api/accounts/a1/events',
      expect.any(Object),
    );
  });

  it('throws BridgeletApiError for a malformed events response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ events }));

    await expect(makeClient().listAccountEvents('a1')).rejects.toBeInstanceOf(BridgeletApiError);
  });
});
