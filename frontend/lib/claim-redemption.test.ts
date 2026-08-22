import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  submitClaimRedemption,
  pollClaimStatus,
  type ClaimRedemptionOutcome,
} from '@/lib/claim-redemption';
import { BridgeletClient, BridgeletApiError, RateLimitError } from '@/lib/create-bridgelet-client';
import { RequestTimeoutError } from '@/lib/fetch-with-timeout';
import { AccountStatus } from '@/lib/api/types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/create-bridgelet-client', () => {
  const BridgeletApiError = class BridgeletApiError extends Error {
    statusCode: number;
    constructor(body: unknown, statusCode: number) {
      super('API error');
      this.name = 'BridgeletApiError';
      this.statusCode = statusCode;
    }
  };
  const RateLimitError = class RateLimitError extends Error {
    retryAfter: number | null;
    constructor(retryAfter: number | null) {
      super('Rate limited');
      this.name = 'RateLimitError';
      this.retryAfter = retryAfter;
    }
  };
  return {
    BridgeletClient: vi.fn(),
    BridgeletApiError,
    RateLimitError,
  };
});

vi.mock('@/lib/fetch-with-timeout', () => ({
  fetchWithTimeout: vi.fn(),
  RequestTimeoutError: class RequestTimeoutError extends Error {
    constructor() {
      super('The request timed out. Please try again.');
      this.name = 'RequestTimeoutError';
    }
  },
}));

function mockClient(overrides: Record<string, unknown> = {}) {
  const defaults = {
    redeemClaim: vi.fn(),
    verifyClaim: vi.fn(),
  };
  return { ...defaults, ...overrides } as unknown as BridgeletClient;
}

describe('pollClaimStatus', () => {
  it('returns the status when verifyClaim returns a non-pending_claim status', async () => {
    const client = mockClient({
      verifyClaim: vi.fn().mockResolvedValue({ status: AccountStatus.CLAIMED, amountStroops: '0' }),
    });
    const result = await pollClaimStatus(client, 'token');
    expect(result).toBe(AccountStatus.CLAIMED);
  });

  it('returns PENDING_CLAIM when verifyClaim keeps returning pending_claim (all polls succeeded)', async () => {
    const client = mockClient({
      verifyClaim: vi.fn().mockResolvedValue({ status: AccountStatus.PENDING_CLAIM }),
    });
    const result = await pollClaimStatus(client, 'token', { maxStatusPolls: 2, pollIntervalMs: 1 });
    expect(result).toBe(AccountStatus.PENDING_CLAIM);
  });

  it('returns CLAIMED on 409 BridgeletApiError', async () => {
    const client = mockClient({
      verifyClaim: vi.fn().mockRejectedValue(new BridgeletApiError({}, 409)),
    });
    const result = await pollClaimStatus(client, 'token', { maxStatusPolls: 1, pollIntervalMs: 1 });
    expect(result).toBe(AccountStatus.CLAIMED);
  });
});

describe('submitClaimRedemption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns confirmed when redeemClaim succeeds', async () => {
    const client = mockClient({
      redeemClaim: vi.fn().mockResolvedValue({
        success: true,
        isPartial: false,
        message: 'sweep complete',
      }),
    });
    vi.mocked(BridgeletClient).mockReturnValue(client);

    const outcome = await submitClaimRedemption('token', 'G' + 'A'.repeat(55));
    expect(outcome.kind).toBe('confirmed');
    if (outcome.kind === 'confirmed') {
      expect(outcome.isPartial).toBe(false);
      expect(outcome.message).toBe('sweep complete');
    }
  });

  it('returns confirmed with isPartial=true when partial sweep', async () => {
    const client = mockClient({
      redeemClaim: vi.fn().mockResolvedValue({
        success: true,
        isPartial: true,
        message: 'partial sweep',
      }),
    });
    vi.mocked(BridgeletClient).mockReturnValue(client);

    const outcome = await submitClaimRedemption('token', 'G' + 'A'.repeat(55));
    expect(outcome.kind).toBe('confirmed');
    if (outcome.kind === 'confirmed') {
      expect(outcome.isPartial).toBe(true);
    }
  });

  it('returns failed-needs-support for 409 Already Claimed', async () => {
    const client = mockClient({
      redeemClaim: vi.fn().mockRejectedValue(new BridgeletApiError({}, 409)),
    });
    vi.mocked(BridgeletClient).mockReturnValue(client);

    const outcome = await submitClaimRedemption('token', 'G' + 'A'.repeat(55));
    expect(outcome.kind).toBe('failed-needs-support');
  });

  it('returns failed-needs-support for 410 Expired', async () => {
    const client = mockClient({
      redeemClaim: vi.fn().mockRejectedValue(new BridgeletApiError({}, 410)),
    });
    vi.mocked(BridgeletClient).mockReturnValue(client);

    const outcome = await submitClaimRedemption('token', 'G' + 'A'.repeat(55));
    expect(outcome.kind).toBe('failed-needs-support');
  });

  it('returns failed-needs-support for 404 Not Found', async () => {
    const client = mockClient({
      redeemClaim: vi.fn().mockRejectedValue(new BridgeletApiError({}, 404)),
    });
    vi.mocked(BridgeletClient).mockReturnValue(client);

    const outcome = await submitClaimRedemption('token', 'G' + 'A'.repeat(55));
    expect(outcome.kind).toBe('failed-needs-support');
  });

  it('returns failed-safe-to-retry for RateLimitError', async () => {
    const client = mockClient({
      redeemClaim: vi.fn().mockRejectedValue(new RateLimitError(30)),
    });
    vi.mocked(BridgeletClient).mockReturnValue(client);

    const outcome = await submitClaimRedemption('token', 'G' + 'A'.repeat(55));
    expect(outcome.kind).toBe('failed-safe-to-retry');
    if (outcome.kind === 'failed-safe-to-retry') {
      expect(outcome.retryInSeconds).toBe(30);
    }
  });

  it('returns failed-safe-to-retry for RequestTimeoutError when poll still shows pending_claim', async () => {
    const client = mockClient({
      redeemClaim: vi.fn().mockRejectedValue(new RequestTimeoutError()),
      verifyClaim: vi.fn().mockResolvedValue({ status: AccountStatus.PENDING_CLAIM }),
    });
    vi.mocked(BridgeletClient).mockReturnValue(client);

    const outcome = await submitClaimRedemption('token', 'G' + 'A'.repeat(55), {
      maxStatusPolls: 2,
      pollIntervalMs: 1,
    });
    expect(outcome.kind).toBe('failed-safe-to-retry');
  });

  it('returns pending-confirmation for RequestTimeoutError when poll shows CLAIMED', async () => {
    const client = mockClient({
      redeemClaim: vi.fn().mockRejectedValue(new RequestTimeoutError()),
      verifyClaim: vi.fn().mockResolvedValue({ status: AccountStatus.CLAIMED }),
    });
    vi.mocked(BridgeletClient).mockReturnValue(client);

    const outcome = await submitClaimRedemption('token', 'G' + 'A'.repeat(55), {
      maxStatusPolls: 2,
      pollIntervalMs: 1,
    });
    expect(outcome.kind).toBe('pending-confirmation');
  });

  it('returns pending-confirmation for RequestTimeoutError when poll shows PARTIAL_SWEEP', async () => {
    const client = mockClient({
      redeemClaim: vi.fn().mockRejectedValue(new RequestTimeoutError()),
      verifyClaim: vi.fn().mockResolvedValue({ status: AccountStatus.PARTIAL_SWEEP }),
    });
    vi.mocked(BridgeletClient).mockReturnValue(client);

    const outcome = await submitClaimRedemption('token', 'G' + 'A'.repeat(55), {
      maxStatusPolls: 2,
      pollIntervalMs: 1,
    });
    expect(outcome.kind).toBe('pending-confirmation');
  });

  it('returns failed-needs-support for RequestTimeoutError when poll fails', async () => {
    const client = mockClient({
      redeemClaim: vi.fn().mockRejectedValue(new RequestTimeoutError()),
      verifyClaim: vi.fn().mockRejectedValue(new Error('poll failed')),
    });
    vi.mocked(BridgeletClient).mockReturnValue(client);

    const outcome = await submitClaimRedemption('token', 'G' + 'A'.repeat(55), {
      maxStatusPolls: 1,
      pollIntervalMs: 1,
    });
    expect(outcome.kind).toBe('failed-needs-support');
  });
});