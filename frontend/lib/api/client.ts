import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import type { RedeemClaimResponse, VerifyClaimResponse } from '@/lib/api/types';

export interface BridgeletClientOptions {
  /** Base URL of the bridgelet-sdk backend. Empty string resolves relative to the app origin. */
  baseUrl?: string;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

/** Thrown when the API responds with 429 Too Many Requests. */
export class RateLimitError extends Error {
  readonly retryAfter: number | null;

  constructor(retryAfter: number | null) {
    super(
      retryAfter != null
        ? `Please wait ${retryAfter} second${retryAfter !== 1 ? 's' : ''} before retrying.`
        : 'Too many requests. Please wait a moment before retrying.',
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Thrown for any non-ok, non-429 response. Wraps the backend's `ApiError`
 * envelope in a real `Error` instance so callers can rely on `err.message`
 * and `instanceof` checks. Accepts both the legacy flat shape
 * (`{ error: string, message: string }`) and the nested spec shape
 * (`{ error: { code: string, message: string, ... } }`).
 */
export class BridgeletApiError extends Error {
  readonly statusCode: number;
  readonly error: string | undefined;

  constructor(body: unknown, statusCode: number) {
    const parsed = (body ?? {}) as Record<string, unknown>;
    let message: string;
    let errorCode: string | undefined;

    if (parsed.error && typeof parsed.error === 'object') {
      const nested = parsed.error as Record<string, unknown>;
      message =
        typeof nested.message === 'string'
          ? nested.message
          : `Request failed with status ${statusCode}.`;
      errorCode = typeof nested.code === 'string' ? nested.code : undefined;
    } else {
      message =
        typeof parsed.message === 'string'
          ? parsed.message
          : `Request failed with status ${statusCode}.`;
      errorCode = typeof parsed.error === 'string' ? parsed.error : undefined;
    }

    super(message);
    this.name = 'BridgeletApiError';
    this.statusCode = statusCode;
    this.error = errorCode;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Client for the unguarded claim endpoints (`POST /claims/verify`,
 * `POST /claims/redeem`).
 *
 * Both endpoints are open to the public on the backend so the browser can
 * call them directly against `baseUrl` — no bearer token is involved.
 */
export class BridgeletClient {
  private baseUrl: string;
  private maxRetries: number;
  private baseDelayMs: number;
  private maxDelayMs: number;

  constructor(options: BridgeletClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env['NEXT_PUBLIC_API_BASE_URL'] ?? '';
    this.maxRetries = options.maxRetries ?? 5;
    this.baseDelayMs = options.baseDelayMs ?? 500;
    this.maxDelayMs = options.maxDelayMs ?? 30_000;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    tuning: { maxRetries?: number; timeoutMs?: number } = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    const maxRetries = tuning.maxRetries ?? this.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let response: Response | null = null;
      let thrown: unknown = null;
      try {
        response = await fetchWithTimeout(url, { ...options, headers }, tuning.timeoutMs);
      } catch (err) {
        thrown = err;
      }

      if (!response) {
        if (attempt < maxRetries) {
          await this.backoff(attempt);
          continue;
        }
        throw thrown;
      }

      if (response.status === 429) {
        const raw = response.headers.get('Retry-After');
        const retryAfter = raw != null ? parseInt(raw, 10) || null : null;
        throw new RateLimitError(retryAfter);
      }

      if (!response.ok) {
        // Only retry server-side failures (5xx); 4xx are deterministic.
        if (attempt < maxRetries && response.status >= 500) {
          await this.backoff(attempt);
          continue;
        }
        const body = await response.json().catch(() => ({}));
        throw new BridgeletApiError(body, response.status);
      }

      return response.json() as Promise<T>;
    }

    throw new Error('Request failed after exhausting retries.');
  }

  private async backoff(attempt: number): Promise<void> {
    const delay = Math.min(this.baseDelayMs * Math.pow(2, attempt), this.maxDelayMs);
    const jitter = Math.random() * delay;
    await sleep(delay + jitter);
  }

  /** Verify a claim token — resolves when the token is claimable. */
  verifyClaim(claimToken: string): Promise<VerifyClaimResponse> {
    return this.request<VerifyClaimResponse>('/claims/verify', {
      method: 'POST',
      body: JSON.stringify({ claimToken }),
    });
  }

  /**
   * Redeem a claim token by sweeping funds to the destination address.
   *
   * No automatic retries: a redeem is not idempotent-friendly for the user
   * (a retry can't fix a contract/validation error and burns the backend's
   * 5 requests/min budget), and the sweep includes an on-chain step. The
   * explicit "Try again" button is the only thing that re-submits.
   */
  redeemClaim(claimToken: string, destinationAddress: string): Promise<RedeemClaimResponse> {
    return this.request<RedeemClaimResponse>(
      '/claims/redeem',
      {
        method: 'POST',
        body: JSON.stringify({ claimToken, destinationAddress }),
      },
      { maxRetries: 0, timeoutMs: 60_000 },
    );
  }
}

let _defaultClient: BridgeletClient | null = null;

export function getDefaultClient(): BridgeletClient {
  if (!_defaultClient) {
    _defaultClient = new BridgeletClient();
  }
  return _defaultClient;
}