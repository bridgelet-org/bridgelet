import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analytics, buildBasePayload } from '@/lib/analytics';

function plausibleMock() {
  return vi.fn();
}

describe('buildBasePayload', () => {
  it('carries the fixed frontend platform value from the spec', () => {
    expect(buildBasePayload()).toEqual({ platform: 'web' });
  });
});

describe('track base payload merge', () => {
  beforeEach(() => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as unknown as { plausible?: unknown }).plausible;
  });

  it('attaches platform to every tracking call', () => {
    analytics.claimPageViewed();
    analytics.claimInitiated();
    analytics.claimSuccess();
    analytics.claimError('sweep_failed');
    analytics.claimVerified({
      claimId: 'tok_123',
      verificationTimeMs: 42,
      expiryDaysRemaining: 7,
    });
    analytics.claimCtaClicked({ claimId: 'tok_123' });

    const plausible = (window as unknown as { plausible: ReturnType<typeof plausibleMock> })
      .plausible;
    expect(plausible).toHaveBeenCalledTimes(6);

    for (const call of plausible.mock.calls) {
      expect(call[1]).toEqual({ props: expect.objectContaining({ platform: 'web' }) });
    }
  });

  it('merges event-specific props next to the base payload', () => {
    analytics.claimVerified({
      claimId: 'tok_123',
      assetType: 'XLM',
      expiryDaysRemaining: 7,
      verificationTimeMs: 42,
    });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[0]).toBe('Claim Verified');
    expect(call[1]).toEqual({
      props: {
        platform: 'web',
        journey: 'recipient',
        claim_id: 'tok_123',
        asset_type: 'XLM',
        expiry_days_remaining: 7,
        verification_time_ms: 42,
      },
    });
  });

  it('lets event props override the base payload', () => {
    analytics.claimError('network_error');

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[1].props).toEqual({ platform: 'web', reason: 'network_error' });
  });

  it('no-ops when the window object is unavailable', () => {
    const plausible = (window as unknown as { plausible: ReturnType<typeof plausibleMock> })
      .plausible;
    vi.stubGlobal('window', undefined);

    expect(() => analytics.claimPageViewed()).not.toThrow();
    expect(plausible).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
