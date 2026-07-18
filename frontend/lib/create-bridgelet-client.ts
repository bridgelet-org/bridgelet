import { fetchWithTimeout, RequestTimeoutError } from '@/lib/fetch-with-timeout';
import type {
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  ClaimDetailsResponse,
  RedeemClaimRequest,
  RedeemClaimResponse,
} from '@/lib/bridgelet';

export const SWEEP_STUB_WARNING = 'Note: fund sweep is running in MVP stub mode. Tokens are reserved but not yet transferred on chain.';

export class RateLimitError extends Error {
  readonly retryAfter: number | null;
  constructor(retryAfter: number | null) {
    super(
      retryAfter != null
        ? `Please wait ${retryAfter} second${retryAfter !== 1 ? 's' : 
          ''} before retrying.`
        : `Too many requests. Please wait a moment before retrying.`,
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export interface BridgeletClientOptions {
  baseUrl?: string;
  apiKey?: string;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(err: unknown): boolean {
  if (err instanceof RequestTimeoutError) return true;

  if (err instanceof TypeError) {
    return true;
  }

  if (err instanceof Response) {
    const status = err.status;
    return status === 429 || status >= 500;
  }

  return false;
}

export class BridgeletClient {
  private baseUrl: string;
  private apiKey: string;
  private maxRetries: number;
  private baseDelayMs: number;
  private maxDelayMs: number;

  constructor(options: BridgeletClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env['NEXT_PUBLIC_API_BASE_URL'] ?? '';
    this.apiKey = options.apiKey ?? process.env['NEXT_PUBLIC_API_KEY'] ?? '';
    this.maxRetries = options.maxRetries ?? 5;
    this.baseDelayMs = options.baseDelayMs ?? 500;
    this.maxDelayMs = options.maxDelayMs ?? 30_000;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    if (this.apiKey) {
      headers.set('X-API-Key', this.apiKey);
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(url, { ...options, headers });

        if (!response.ok) {
          if (attempt < this.maxRetries && (response.status === 429 || response.status >= 500)) {
            lastError = response;
            await this.backoff(attempt);
            continue;
          }

          const body = await response.json().catch(() => ({}));
          throw body;
        }

        return response.json() as Promise<T>;
      } catch (err) {
        if (attempt < this.maxRetries && isTransientError(err)) {
          lastError = err;
          await this.backoff(attempt);
          continue;
        }

        throw err;
      }
    }

    throw lastError;
  }

  private async backoff(attempt: number): Promise<void> {
    const delay = Math.min(
      this.baseDelayMs * Math.pow(2, attempt),
      this.maxDelayMs,
    );
    const jitter = Math.random() * delay;
    await sleep(delay + jitter);
  }

  getClaimDetails(token: string): Promise<ClaimDetailsResponse> {
    return this.request<ClaimDetailsResponse>(`/claim/${encodeURIComponent(token)}`);
  }

  createPaymentIntent(data: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    return this.request<CreatePaymentIntentResponse>('/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  redeemClaim(
    token: string,
    data: RedeemClaimRequest,
  ): Promise<RedeemClaimResponse> {
    return this.request<RedeemClaimResponse>(
      `/claim/${encodeURIComponent(token)}/redeem`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }
}

let _defaultClient: BridgeletClient | null = null;

export function defaultClient(): BridgeletClient {
  if (!_defaultClient) {
    _defaultClient = new BridgeletClient();
  }
  return _defaultClient;
}

export function getClaimDetails(token: string):
Promise<ClaimDetailsResponse> {
  return defaultClient().getClaimDetails(token);
}

export function createPaymentIntent(
  data: CreatePaymentIntentRequest,
): Promise<CreatePaymentIntentResponse> {
  return defaultClient().createPaymentIntent(data);
}

export function redeemClaim(
  token: string,
  data: RedeemClaimRequest,
): Promise<RedeemClaimResponse> {
  return defaultClient().redeemClaim(token, data);
}
