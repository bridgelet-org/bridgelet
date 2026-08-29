/**
 * Tests for claim-retry.ts — bounded retry with backoff, double-submit
 * prevention, and status polling fallback for claim redemption.
 *
 * Covers:
 *  - Safe-to-retry failures (network errors that never reached the server)
 *  - Ambiguous failures (timeouts, 5xx where the request may have been received)
 *  - Terminal failures (4xx rejections)
 *  - Already-claimed responses (409 / txHash present)
 *  - Status polling after ambiguous submissions
 *  - Double-submit prevention
 *  - Retry exhaustion
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BridgeletClient, BridgeletApiError } from './create-bridgelet-client';
import { RequestTimeoutError } from './fetch-with-timeout';
import {
  submitClaimWithRetry,
  pollClaimStatus,
  type ClaimRetryOptions,
} from './claim-retry';
import { AccountStatus } from '@/lib/api/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeClient(): BridgeletClient {
  return new BridgeletClient({
    baseUrl: 'https://api.test.com',
    internalBaseUrl: 'https://app.test.com',
    maxRetries: 0, // disable built-in retries so we test OUR retry logic
    timeoutMs: 5_000,
  });
}

const DEFAULT_OPTIONS: ClaimRetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 10, // fast for tests
  maxDelayMs: 100,
  pollTimeoutMs: 200, // fast for tests
  pollIntervalMs: 50,
};

const TOKEN = 'test-token-abc123';
const DEST = 'GBBD47HEH5GAOD6N7W6R6YJSS4OYXZKM5G6HTGVN5HFYVQS2WQRKTCYB';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('submitClaimWithRetry', () => {
  let client: BridgeletClient;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    client = makeClient();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Success cases ────────────────────────────────────────────────────────

  describe('successful submission', () => {
    it('returns success on first attempt', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          success: true,
          txHash: 'abc123',
          amountSwept: '100000000',
          asset: 'XLM',
          destination: DEST,
        }),
      );

      const result = await submitClaimWithRetry(client, TOKEN, DEST, DEFAULT_OPTIONS);

      expect(result.outcome.kind).toBe('success');
      expect(result.attempts).toBe(1);
      if (result.outcome.kind === 'success') {
        expect(result.outcome.response.success).toBe(true);
      }
    });

    it('marks as alreadyClaimed when txHash is present but success is false', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          success: false,
          txHash: 'already-done',
          amountSwept: '100000000',
          asset: 'XLM',
          destination: DEST,
        }),
      );

      const result = await submitClaimWithRetry(client, TOKEN, DEST, DEFAULT_OPTIONS);

      expect(result.outcome.kind).toBe('alreadyClaimed');
      expect(result.attempts).toBe(1);
    });
  });

  // ── Safe-to-retry cases ──────────────────────────────────────────────────

  describe('safe-to-retry (network errors)', () => {
    it('retries on TypeError (DNS/connection failure) and succeeds', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce(
          jsonResponse({
            success: true,
            txHash: 'abc123',
            amountSwept: '50000000',
            asset: 'XLM',
            destination: DEST,
          }),
        );

      const result = await submitClaimWithRetry(client, TOKEN, DEST, DEFAULT_OPTIONS);

      expect(result.outcome.kind).toBe('success');
      expect(result.attempts).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('returns ambiguous when all safe-to-retry retries are exhausted', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'));

      const result = await submitClaimWithRetry(client, TOKEN, DEST, {
        ...DEFAULT_OPTIONS,
        maxAttempts: 2,
      });

      // After exhausting retries on safe-to-retry, it falls through to
      // ambiguous (with poll). Since poll also fails (TypeError), we get ambiguous.
      expect(result.outcome.kind).toBe('ambiguous');
      expect(result.attempts).toBe(2);
    });
  });

  // ── Ambiguous cases ──────────────────────────────────────────────────────

  describe('ambiguous (timeout, 5xx)', () => {
    it('does NOT retry on timeout -- polls status instead', async () => {
      // First call: redeemClaim times out (ambiguous)
      mockFetch.mockRejectedValueOnce(new RequestTimeoutError());

      // Poll call: verifyClaim returns CLAIMED (sweep went through)
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ status: AccountStatus.CLAIMED, accountId: 'acc123' }),
      );

      const result = await submitClaimWithRetry(client, TOKEN, DEST, DEFAULT_OPTIONS);

      // 1 redeem attempt + 1 poll call = 2 fetches
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.outcome.kind).toBe('success');
      expect(result.attempts).toBe(1);
    });

    it('returns ambiguous when poll times out without resolution', async () => {
      // First call: redeemClaim returns 500 (ambiguous)
      mockFetch.mockResolvedValueOnce(
        errorResponse(500, { message: 'Server error' }),
      );

      // Poll calls: return CLAIMING (still processing) -- more than enough to fill 200ms pollTimeout
      mockFetch.mockResolvedValue(
        jsonResponse({ status: AccountStatus.CLAIMING, accountId: 'acc123' }),
      );

      const result = await submitClaimWithRetry(client, TOKEN, DEST, DEFAULT_OPTIONS);

      expect(result.outcome.kind).toBe('ambiguous');
      expect(result.attempts).toBe(1);
    });

    it('resolves to terminal when poll shows FAILED', async () => {
      // First call: 500 (ambiguous)
      mockFetch.mockResolvedValueOnce(
        errorResponse(500, { message: 'Server error' }),
      );

      // Poll: returns FAILED
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ status: AccountStatus.FAILED, accountId: 'acc123' }),
      );

      const result = await submitClaimWithRetry(client, TOKEN, DEST, DEFAULT_OPTIONS);

      expect(result.outcome.kind).toBe('terminal');
      expect(result.attempts).toBe(1);
    });
  });

  // ── Terminal cases ───────────────────────────────────────────────────────

  describe('terminal (4xx)', () => {
    it('does NOT retry on 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce(
        errorResponse(400, { error: 'INVALID_ADDRESS', message: 'Not a valid Stellar public key.' }),
      );

      const result = await submitClaimWithRetry(client, TOKEN, DEST, DEFAULT_OPTIONS);

      expect(result.outcome.kind).toBe('terminal');
      expect(result.attempts).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry on 410 Gone (expired)', async () => {
      mockFetch.mockResolvedValueOnce(
        errorResponse(410, { error: 'EXPIRED', message: 'Claim link has expired.' }),
      );

      const result = await submitClaimWithRetry(client, TOKEN, DEST, DEFAULT_OPTIONS);

      expect(result.outcome.kind).toBe('terminal');
      expect(result.attempts).toBe(1);
    });

    it('does NOT retry on 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce(
        errorResponse(404, { error: 'NOT_FOUND', message: 'Token not found.' }),
      );

      const result = await submitClaimWithRetry(client, TOKEN, DEST, DEFAULT_OPTIONS);

      expect(result.outcome.kind).toBe('terminal');
      expect(result.attempts).toBe(1);
    });
  });

  // ── Double-submit prevention ─────────────────────────────────────────────

  describe('double-submit prevention', () => {
    it('never resubmits after an ambiguous outcome -- polls instead', async () => {
      // First call: timeout (ambiguous)
      mockFetch.mockRejectedValueOnce(new RequestTimeoutError());

      // Poll calls: enough to fill poll timeout
      for (let i = 0; i < 20; i++) {
        mockFetch.mockResolvedValueOnce(
          jsonResponse({ status: AccountStatus.CLAIMING, accountId: 'acc123' }),
        );
      }

      const result = await submitClaimWithRetry(client, TOKEN, DEST, DEFAULT_OPTIONS);

      expect(result.outcome.kind).toBe('ambiguous');

      // First call should be redeemClaim (POST /claims/redeem)
      const firstCallUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(firstCallUrl).toContain('/claims/redeem');

      // No subsequent calls should be /claims/redeem -- all should be /claims/verify
      for (let i = 1; i < mockFetch.mock.calls.length; i++) {
        const url = mockFetch.mock.calls[i]?.[0] as string;
        expect(url).toContain('/claims/verify');
      }
    });

    it('does not retry after terminal response even with retries remaining', async () => {
      mockFetch.mockResolvedValueOnce(
        errorResponse(400, { error: 'INVALID_ADDRESS', message: 'Bad key' }),
      );

      const result = await submitClaimWithRetry(client, TOKEN, DEST, {
        ...DEFAULT_OPTIONS,
        maxAttempts: 5,
      });

      expect(result.outcome.kind).toBe('terminal');
      expect(result.attempts).toBe(1);
      // Only 1 fetch despite 5 max attempts
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ── Retry with backoff ───────────────────────────────────────────────────

  describe('retry with backoff', () => {
    it('retries safe-to-retry errors and eventually succeeds', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce(
          jsonResponse({
            success: true,
            txHash: 'ok',
            amountSwept: '100',
            asset: 'XLM',
            destination: DEST,
          }),
        );

      const result = await submitClaimWithRetry(client, TOKEN, DEST, {
        ...DEFAULT_OPTIONS,
        maxAttempts: 3,
        baseDelayMs: 100,
      });

      expect(result.outcome.kind).toBe('success');
      expect(result.attempts).toBe(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('exhausts retries and falls through to ambiguous polling', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'));

      const result = await submitClaimWithRetry(client, TOKEN, DEST, {
        ...DEFAULT_OPTIONS,
        maxAttempts: 2,
        baseDelayMs: 10,
        pollTimeoutMs: 100,
        pollIntervalMs: 20,
      });

      // After 2 failed retries, falls to ambiguous -> poll also fails
      expect(result.outcome.kind).toBe('ambiguous');
      expect(result.attempts).toBe(2);
    });
  });
});

// ─── pollClaimStatus tests ────────────────────────────────────────────────────

describe('pollClaimStatus', () => {
  let client: BridgeletClient;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    client = makeClient();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns CLAIMED when poll detects claimed status', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: AccountStatus.CLAIMED, accountId: 'acc1' }),
    );

    const result = await pollClaimStatus(client, TOKEN, {
      pollTimeoutMs: 1_000,
      pollIntervalMs: 50,
    });

    expect(result.status).toBe(AccountStatus.CLAIMED);
  });

  it('returns FAILED when poll detects failed status', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: AccountStatus.FAILED, accountId: 'acc1' }),
    );

    const result = await pollClaimStatus(client, TOKEN, {
      pollTimeoutMs: 1_000,
      pollIntervalMs: 50,
    });

    expect(result.status).toBe(AccountStatus.FAILED);
  });

  it('keeps polling while status is CLAIMING then resolves', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ status: AccountStatus.CLAIMING, accountId: 'acc1' }))
      .mockResolvedValueOnce(jsonResponse({ status: AccountStatus.CLAIMING, accountId: 'acc1' }))
      .mockResolvedValueOnce(jsonResponse({ status: AccountStatus.CLAIMED, accountId: 'acc1' }));

    const result = await pollClaimStatus(client, TOKEN, {
      pollTimeoutMs: 5_000,
      pollIntervalMs: 50,
    });

    expect(result.status).toBe(AccountStatus.CLAIMED);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('returns CLAIMING on poll timeout', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ status: AccountStatus.CLAIMING, accountId: 'acc1' }),
    );

    const result = await pollClaimStatus(client, TOKEN, {
      pollTimeoutMs: 100,
      pollIntervalMs: 50,
    });

    expect(result.status).toBe(AccountStatus.CLAIMING);
  });

  it('handles verifyClaim errors gracefully during polling', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonResponse({ status: AccountStatus.CLAIMED, accountId: 'acc1' }));

    const result = await pollClaimStatus(client, TOKEN, {
      pollTimeoutMs: 1_000,
      pollIntervalMs: 50,
    });

    expect(result.status).toBe(AccountStatus.CLAIMED);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ─── ClaimError classification ────────────────────────────────────────────────

describe('claim error codes', () => {
  it('SUBMISSION_FAILED_RETRYABLE is retryable', async () => {
    const { ClaimError } = await import('./claim-errors');
    const err = new ClaimError('SUBMISSION_FAILED_RETRYABLE', 'Safe to retry', true);
    expect(err.retryable).toBe(true);
    expect(err.code).toBe('SUBMISSION_FAILED_RETRYABLE');
  });

  it('SUBMISSION_TIMEOUT is not retryable', async () => {
    const { ClaimError } = await import('./claim-errors');
    const err = new ClaimError('SUBMISSION_TIMEOUT', 'Checking on it', false);
    expect(err.retryable).toBe(false);
    expect(err.code).toBe('SUBMISSION_TIMEOUT');
  });

  it('SUBMISSION_FAILED_FINAL is not retryable', async () => {
    const { ClaimError } = await import('./claim-errors');
    const err = new ClaimError('SUBMISSION_FAILED_FINAL', 'Contact support', false);
    expect(err.retryable).toBe(false);
    expect(err.code).toBe('SUBMISSION_FAILED_FINAL');
  });
});
