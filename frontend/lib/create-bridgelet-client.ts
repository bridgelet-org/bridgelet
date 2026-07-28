import { fetchWithTimeout, RequestTimeoutError } from '@/lib/fetch-with-timeout';
import type {
  CreateAccountRequest,
  AccountResponse,
  VerifyClaimRequest,
  RedeemClaimRequest,
  RedeemClaimResponse,
} from '@/lib/bridgelet';
import { ClaimView } from '@/lib/claim-view';

export interface BridgeletClientOptions {
  /** Base URL of the bridgelet-sdk backend, used for the unguarded /claims/* routes. */
  baseUrl?: string;
  /**
   * Base URL of this Next.js app's own server, used for the guarded
   * account-creation route. Left empty to use relative paths (same origin).
   */
  internalBaseUrl?: string;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface PreparedAccountTransaction {
  unsignedTxXdr: string;
  networkPassphrase?: string;
  expiresAt?: string;
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
 * (`{ error: { code: string, message: string, ...} }`).
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

function isTransientError(err: unknown): boolean {
  if (err instanceof RequestTimeoutError) return true;
  if (err instanceof TypeError) return true;
  return false;
}

/**
 * Single canonical client for talking to bridgelet-sdk.
 *
 * - `/claims/verify` and `/claims/redeem` are unguarded on the backend, so
 *   they're called directly against `baseUrl`.
 * - `/accounts` requires a verified Bearer JWT (JwtAuthGuard). That token is
 *   never sent from the browser: account creation goes through this app's
 *   own `/api/accounts` route handler, which attaches the real credential
 *   server-side (see app/api/accounts/route.ts).
 */
export class BridgeletClient {
  private baseUrl: string;
  private internalBaseUrl: string;
  private maxRetries: number;
  private baseDelayMs: number;
  private maxDelayMs: number;

  constructor(options: BridgeletClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env['NEXT_PUBLIC_API_BASE_URL'] ?? '';
    this.internalBaseUrl = options.internalBaseUrl ?? '';
    this.maxRetries = options.maxRetries ?? 5;
    this.baseDelayMs = options.baseDelayMs ?? 500;
    this.maxDelayMs = options.maxDelayMs ?? 30_000;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const response = await fetchWithTimeout(url, { ...options, headers }).catch((err) => {
        lastError = err;
        return null;
      });

      if (!response) {
        if (attempt < this.maxRetries && isTransientError(lastError)) {
          await this.backoff(attempt);
          continue;
        }
        throw lastError;
      }

      if (response.status === 429) {
        const raw = response.headers.get('Retry-After');
        const retryAfter = raw != null ? parseInt(raw, 10) || null : null;
        throw new RateLimitError(retryAfter);
      }

      if (!response.ok) {
        if (attempt < this.maxRetries && response.status >= 500) {
          lastError = response;
          await this.backoff(attempt);
          continue;
        }
        const body = await response.json().catch(() => ({}));
        throw new BridgeletApiError(body, response.status);
      }

      return response.json() as Promise<T>;
    }

    throw lastError;
  }

  private async backoff(attempt: number): Promise<void> {
    const delay = Math.min(this.baseDelayMs * Math.pow(2, attempt), this.maxDelayMs);
    const jitter = Math.random() * delay;
    await sleep(delay + jitter);
  }

  // ─── Accounts (proxied through this app's own server) ───────────────────────

  createAccount(data: CreateAccountRequest): Promise<AccountResponse> {
    return this.request<AccountResponse>(`${this.internalBaseUrl}/api/accounts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  prepareAccountTransaction(data: CreateAccountRequest): Promise<PreparedAccountTransaction> {
    return this.request<PreparedAccountTransaction>(
      `${this.internalBaseUrl}/api/accounts/prepare`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }

  getAccount(accountId: string): Promise<AccountResponse> {
    return this.request<AccountResponse>(
      `${this.internalBaseUrl}/api/accounts/${encodeURIComponent(accountId)}`,
    );
  }

  redeemClaim(claimToken: string, destinationAddress: string): Promise<RedeemClaimResponse> {
    const body: RedeemClaimRequest = { claimToken, destinationAddress };
    return this.request<RedeemClaimResponse>(`${this.baseUrl}/claims/redeem`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
  verifyClaim(claimToken: string): Promise<ClaimView> {
    const body: VerifyClaimRequest = { claimToken };
    return this.request(`${this.baseUrl}/claims/verify`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

let _defaultClient: BridgeletClient | null = null;

export function getDefaultClient(): BridgeletClient {
  if (!_defaultClient) {
    _defaultClient = new BridgeletClient();
  }
  return _defaultClient;
}
