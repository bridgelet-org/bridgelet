import { describe, expect, it, vi } from 'vitest';
import { submitClaimWithRetry } from '@/lib/claim-retry';
import { BridgeletApiError, RateLimitError, type BridgeletClient } from '@/lib/api/client';
import { RequestTimeoutError } from '@/lib/fetch-with-timeout';

function fakeClient(
  redeem: (...args: unknown[]) => unknown,
  verify: (...args: unknown[]) => unknown = vi.fn(),
): BridgeletClient {
  return { redeemClaim: redeem, verifyClaim: verify } as unknown as BridgeletClient;
}

describe('submitClaimWithRetry', () => {
  it('submits exactly one request by default and returns success', async () => {
    const redeemClaim = vi.fn().mockResolvedValue({ success: true, isPartial: false });
    const result = await submitClaimWithRetry(
      fakeClient(redeemClaim),
      'tok',
      'G' + 'A'.repeat(55),
    );

    expect(result.outcome.kind).toBe('success');
    expect(redeemClaim).toHaveBeenCalledTimes(1);
  });

  it('makes exactly one request when the backend rejects with a 5xx', async () => {
    const redeemClaim = vi
      .fn()
      .mockRejectedValue(new BridgeletApiError({ error: { message: 'boom' } }, 500));
    const result = await submitClaimWithRetry(
      fakeClient(redeemClaim),
      'tok',
      'G' + 'A'.repeat(55),
    );

    expect(result.outcome.kind).toBe('terminal');
    expect(redeemClaim).toHaveBeenCalledTimes(1);
  });

  it('passes the backend error code through for a terminal failure', async () => {
    const redeemClaim = vi.fn().mockRejectedValue(
      new BridgeletApiError(
        { error: { code: 'DESTINATION_NOT_FUNDED', message: 'no trustline' } },
        400,
      ),
    );
    const result = await submitClaimWithRetry(
      fakeClient(redeemClaim),
      'tok',
      'G' + 'A'.repeat(55),
    );

    expect(result.outcome).toMatchObject({
      kind: 'terminal',
      error: { statusCode: 400, code: 'DESTINATION_NOT_FUNDED' },
    });
    expect(redeemClaim).toHaveBeenCalledTimes(1);
  });

  it('rethrows a 429 rate-limit error instead of reporting a retryable one', async () => {
    const redeemClaim = vi.fn().mockRejectedValue(new RateLimitError(30));
    await expect(
      submitClaimWithRetry(fakeClient(redeemClaim), 'tok', 'G' + 'A'.repeat(55)),
    ).rejects.toBeInstanceOf(RateLimitError);
    expect(redeemClaim).toHaveBeenCalledTimes(1);
  });

  it('reports alreadyClaimed for a 409', async () => {
    const redeemClaim = vi
      .fn()
      .mockRejectedValue(new BridgeletApiError({ error: { message: 'claimed' } }, 409));
    const result = await submitClaimWithRetry(
      fakeClient(redeemClaim),
      'tok',
      'G' + 'A'.repeat(55),
    );

    expect(result.outcome.kind).toBe('alreadyClaimed');
    expect(redeemClaim).toHaveBeenCalledTimes(1);
  });

  it('probes for truth after a timeout and reports ambiguous when still claimable', async () => {
    const redeemClaim = vi.fn().mockRejectedValue(new RequestTimeoutError());
    const verifyClaim = vi.fn().mockResolvedValue({
      valid: true,
      amount: '1.0000000',
      asset: 'native',
      expiresAt: new Date().toISOString(),
    });

    const result = await submitClaimWithRetry(
      fakeClient(redeemClaim, verifyClaim),
      'tok',
      'G' + 'A'.repeat(55),
      { maxAttempts: 1, pollTimeoutMs: 15, pollIntervalMs: 5 },
    );

    expect(result.outcome.kind).toBe('ambiguous');
    expect(redeemClaim).toHaveBeenCalledTimes(1);
  });
});
