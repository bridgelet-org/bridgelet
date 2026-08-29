/**
 * Issue #457 — Unit tests for the BridgeletClient SDK wrapper.
 *
 * Tests retry logic, error handling, rate limiting, and API methods.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BridgeletClient,
  BridgeletApiError,
  RateLimitError,
} from './create-bridgelet-client';

// Mock fetchWithTimeout
vi.mock('./fetch-with-timeout', () => ({
  fetchWithTimeout: vi.fn(),
  RequestTimeoutError: class RequestTimeoutError extends Error {
    constructor() {
      super('Request timed out');
      this.name = 'RequestTimeoutError';
    }
  },
}));

import { fetchWithTimeout } from './fetch-with-timeout';

const mockFetch = vi.mocked(fetchWithTimeout);

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    headers: new Headers(),
  } as unknown as Response;
}

function errorResponse(status: number, body: unknown): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

function rateLimitResponse(retryAfter?: number): Response {
  const headers = new Headers();
  if (retryAfter != null) headers.set('Retry-After', String(retryAfter));
  return {
    ok: false,
    status: 429,
    json: () => Promise.resolve({ message: 'Too many requests' }),
    headers,
  } as unknown as Response;
}

describe('BridgeletClient', () => {
  let client: BridgeletClient;

  beforeEach(() => {
    // Backoff sleeps must actually elapse, so advance the fake clock as real
    // time passes (retry tests await real setTimeout-based backoffs).
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    client = new BridgeletClient({
      baseUrl: 'https://api.test.com',
      internalBaseUrl: 'https://app.test.com',
      maxRetries: 2,
      baseDelayMs: 100,
      maxDelayMs: 1000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    mockFetch.mockReset();
  });

  describe('error classes', () => {
    it('BridgeletApiError parses flat error shape', () => {
      const err = new BridgeletApiError({ error: 'not_found', message: 'Claim not found' }, 404);
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('BridgeletApiError');
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Claim not found');
      expect(err.error).toBe('not_found');
    });

    it('BridgeletApiError parses nested error shape', () => {
      const err = new BridgeletApiError(
        { error: { code: 'INVALID_TOKEN', message: 'Token expired' } },
        400,
      );
      expect(err.message).toBe('Token expired');
      expect(err.error).toBe('INVALID_TOKEN');
    });

    it('BridgeletApiError falls back to status message', () => {
      const err = new BridgeletApiError({}, 500);
      expect(err.message).toBe('Request failed with status 500.');
    });

    it('RateLimitError includes retryAfter', () => {
      const err = new RateLimitError(30);
      expect(err.name).toBe('RateLimitError');
      expect(err.retryAfter).toBe(30);
      expect(err.message).toContain('30');
    });

    it('RateLimitError handles null retryAfter', () => {
      const err = new RateLimitError(null);
      expect(err.retryAfter).toBeNull();
      expect(err.message).toContain('moment');
    });
  });

  describe('retry logic', () => {
    it('retries on 500 errors', async () => {
      mockFetch
        .mockResolvedValueOnce(errorResponse(500, { message: 'Server error' }))
        .mockResolvedValueOnce(jsonResponse({ id: '123', status: 'created' }));

      const result = await client.getAccount('123');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ id: '123', status: 'created' });
    });

    it('retries on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce(jsonResponse({ id: '123', status: 'created' }));

      const result = await client.getAccount('123');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws after exhausting retries', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'));

      await expect(client.getAccount('123')).rejects.toThrow('fetch failed');
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('does not retry on 400 errors', async () => {
      mockFetch.mockResolvedValueOnce(
        errorResponse(400, { message: 'Bad request' }),
      );

      await expect(client.getAccount('123')).rejects.toThrow(BridgeletApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('rate limiting', () => {
    it('throws RateLimitError on 429', async () => {
      mockFetch.mockResolvedValueOnce(rateLimitResponse(30));

      await expect(client.getAccount('123')).rejects.toThrow(RateLimitError);
    });

    it('extracts Retry-After header', async () => {
      mockFetch.mockResolvedValueOnce(rateLimitResponse(60));

      try {
        await client.getAccount('123');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(RateLimitError);
        expect((err as RateLimitError).retryAfter).toBe(60);
      }
    });
  });

  describe('API methods', () => {
    it('createAccount posts to /api/accounts', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: '1', status: 'created' }));

      const result = await client.createAccount({
        fundingSource: 'wallet',
        recovery_address: 'GRECOVERY123',
        amount: '10',
        asset_code: 'XLM',
        expiresIn: 3600,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://app.test.com/api/accounts',
        expect.objectContaining({ method: 'POST' }),
        expect.any(Number),
      );
      expect(result).toEqual({ id: '1', status: 'created' });
    });

    it('verifyClaim posts to /claims/verify', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'created', amount: '10' }));

      const result = await client.verifyClaim('test-token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/claims/verify',
        expect.objectContaining({ method: 'POST' }),
        expect.any(Number),
      );
    });

    it('redeemClaim posts to /claims/redeem', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ status: 'claimed', stellarTxHash: 'abc123' }),
      );

      const result = await client.redeemClaim('test-token', 'GBBD47...');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/claims/redeem',
        expect.objectContaining({ method: 'POST' }),
        expect.any(Number),
      );
    });

    it('getAccount fetches /api/accounts/:id', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: '123', status: 'created' }));

      await client.getAccount('123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://app.test.com/api/accounts/123',
        expect.anything(),
        expect.any(Number),
      );
    });
  });
});
