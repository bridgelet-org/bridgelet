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
  baseUrl?: string;
  internalBaseUrl?: string;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  requestInterceptor?: (url: string, init: RequestInit) => RequestInit | Promise<RequestInit>;
  responseInterceptor?: (response: Response) => Response | Promise<Response>;
}

export interface PreparedAccountTransaction {
  unsignedTxXdr: string;
  networkPassphrase?: string;
  expiresAt?: string;
}

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

export class BridgeletApiError extends Error {
  readonly statusCode: number;
  readonly error: string | undefined;

  constructor(body: unknown, statusCode: number) {
    const parsed = (body ?? {}) as Record<string, unknown>;
    let message: string;
    let errorCode: string | undefined;

    if (parsed.error && typeof parsed.error === 'object') {
      const nested = parsed.error as Record<string, unknown>;
      message = typeof nested.message === 'string' ? nested.message : `Request failed with status ${statusCode}.`;
      errorCode = typeof nested.code === 'string' ? nested.code : undefined;
    } else {
      message = typeof parsed.message === 'string' ? parsed.message : `Request failed with status ${statusCode}.`;
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

export class BridgeletClient {
  private baseUrl: string;
  private internalBaseUrl: string;
  private maxRetries: number;
  private baseDelayMs: number;
  private maxDelayMs: number;
  private timeoutMs: number;
  private requestInterceptor?: (url: string, init: RequestInit) => RequestInit | Promise<RequestInit>;
  private responseInterceptor?: (response: Response) => Response | Promise<Response>;
  private inflightControllers = new Map<string, AbortController>();

  constructor(options: BridgeletClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env['NEXT_PUBLIC_API_BASE_URL'] ?? '';
    this.internalBaseUrl = options.internalBaseUrl ?? '';
    this.maxRetries = options.maxRetries ?? 5;
    this.baseDelayMs = options.baseDelayMs ?? 500;
    this.maxDelayMs = options.maxDelayMs ?? 30_000;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.requestInterceptor = options.requestInterceptor;
    this.responseInterceptor = options.responseInterceptor;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    let init: RequestInit = { ...options, headers };

    if (this.requestInterceptor) {
      init = await this.requestInterceptor(url, init);
    }

    const requestId = `${options.method ?? 'GET'}:${url}`;
    const controller = new AbortController();
    this.inflightControllers.set(requestId, controller);
    init.signal = controller.signal;

    let lastError: unknown;

    try {
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        let response = await fetchWithTimeout(url, init, this.timeoutMs).catch((err) => {
          lastError = err;
          return null as Response | null;
        });

        if (response && this.responseInterceptor) {
          response = await this.responseInterceptor(response);
        }

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
    } finally {
      this.inflightControllers.delete(requestId);
    }
  }

  private async backoff(attempt: number): Promise<void> {
    const delay = Math.min(this.baseDelayMs * Math.pow(2, attempt), this.maxDelayMs);
    const jitter = Math.random() * delay;
    await sleep(delay + jitter);
  }

  createAccount(data: CreateAccountRequest): Promise<AccountResponse> {
    return this.request<AccountResponse>(`${this.internalBaseUrl}/api/accounts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  prepareAccountTransaction(data: CreateAccountRequest): Promise<PreparedAccountTransaction> {
    return this.request<PreparedAccountTransaction>(
      `${this.internalBaseUrl}/api/accounts/prepare`,
      { method: 'POST', body: JSON.stringify(data) },
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

  cancelAll(): void {
    for (const [, controller] of this.inflightControllers) {
      controller.abort();
    }
    this.inflightControllers.clear();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/health`, { method: 'GET' }, 5000);
      return response.ok;
    } catch {
      return false;
    }
  }
}

let _defaultClient: BridgeletClient | null = null;

export function getDefaultClient(): BridgeletClient {
  if (!_defaultClient) {
    _defaultClient = new BridgeletClient();
  }
  return _defaultClient;
}
