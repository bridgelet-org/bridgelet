/**
 * Unit tests for `frontend/lib/analytics.ts`
 *
 * Covers the §5.3–§5.4 events introduced by ameeribro4-sudo:
 *   - Claim Failed              (§5.3) — primary issue #586
 *   - Claim Success Viewed      (§5.4) — #587
 *   - Sender Signup CTA Clicked (§5.4) — #588
 *   - Explorer Link Clicked     (§5.4) — #589
 *
 * Also verifies the ClaimFailedErrorType taxonomy and helper exports.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analytics,
  CLAIM_FAILED_ERROR_TYPES,
  type ClaimFailedErrorType,
  type ExplorerSourceScreen,
  type ExplorerJourney,
} from '@/lib/analytics';

// ── Mock window.plausible ──────────────────────────────────────────────────────

const plausibleMock = vi.fn();

beforeEach(() => {
  plausibleMock.mockReset();
  (globalThis as any).window = {
    plausible: plausibleMock,
  };
});

// ── ClaimFailedErrorType taxonomy ─────────────────────────────────────────────

describe('ClaimFailedErrorType taxonomy', () => {
  it('exports exactly the five §5.3 error_type values', () => {
    const keys = Object.keys(CLAIM_FAILED_ERROR_TYPES) as ClaimFailedErrorType[];
    expect(keys).toHaveLength(5);
    expect(keys).toContain('network_error');
    expect(keys).toContain('token_expired');
    expect(keys).toContain('already_claimed');
    expect(keys).toContain('transaction_failed');
    expect(keys).toContain('unknown');
  });

  it('each key maps to itself (const enum pattern)', () => {
    for (const [k, v] of Object.entries(CLAIM_FAILED_ERROR_TYPES)) {
      expect(k).toBe(v);
    }
  });
});

// ── Claim Failed (§5.3) ───────────────────────────────────────────────────────

describe('analytics.claimFailed (§5.3)', () => {
  it('emits Claim Failed with all required fields', () => {
    analytics.claimFailed({
      claimId: 'claim-001',
      assetType: 'XLM',
      errorCode: 'SUBMISSION_FAILED_FINAL',
      errorType: 'transaction_failed',
      attemptNumber: 1,
    });

    expect(plausibleMock).toHaveBeenCalledOnce();
    expect(plausibleMock).toHaveBeenCalledWith('Claim Failed', {
      props: {
        journey: 'recipient',
        claim_id: 'claim-001',
        asset_type: 'XLM',
        error_code: 'SUBMISSION_FAILED_FINAL',
        error_type: 'transaction_failed',
        attempt_number: 1,
      },
    });
  });

  it('defaults error_code to "unknown" when omitted', () => {
    analytics.claimFailed({
      claimId: 'claim-002',
      errorType: 'network_error',
      attemptNumber: 1,
    });

    const { props } = plausibleMock.mock.calls[0][1];
    expect(props.error_code).toBe('unknown');
  });

  it('omits asset_type when not provided', () => {
    analytics.claimFailed({
      claimId: 'claim-003',
      errorType: 'unknown',
      attemptNumber: 1,
    });

    const { props } = plausibleMock.mock.calls[0][1];
    expect(props).not.toHaveProperty('asset_type');
  });

  it.each([
    'network_error',
    'token_expired',
    'already_claimed',
    'transaction_failed',
    'unknown',
  ] as ClaimFailedErrorType[])(
    'emits correct error_type for %s',
    (errorType) => {
      analytics.claimFailed({ claimId: 'claim-004', errorType, attemptNumber: 1 });
      const { props } = plausibleMock.mock.calls[0][1];
      expect(props.error_type).toBe(errorType);
    },
  );

  it('increments attempt_number across successive failures', () => {
    for (let i = 1; i <= 3; i++) {
      analytics.claimFailed({
        claimId: 'claim-seq',
        errorType: 'network_error',
        attemptNumber: i,
      });
    }
    const attempts = plausibleMock.mock.calls.map((c) => c[1].props.attempt_number);
    expect(attempts).toEqual([1, 2, 3]);
  });
});

// ── Claim Success Viewed (§5.4) ───────────────────────────────────────────────

describe('analytics.claimSuccessViewed (§5.4)', () => {
  it('emits Claim Success Viewed with claim_id and asset_type', () => {
    analytics.claimSuccessViewed({ claimId: 'claim-005', assetType: 'USDC' });

    expect(plausibleMock).toHaveBeenCalledWith('Claim Success Viewed', {
      props: {
        journey: 'recipient',
        claim_id: 'claim-005',
        asset_type: 'USDC',
      },
    });
  });

  it('omits asset_type when not provided', () => {
    analytics.claimSuccessViewed({ claimId: 'claim-006' });
    const { props } = plausibleMock.mock.calls[0][1];
    expect(props).not.toHaveProperty('asset_type');
  });
});

// ── Sender Signup CTA Clicked (§5.4) ─────────────────────────────────────────

describe('analytics.senderSignupCtaClicked (§5.4)', () => {
  it('emits Sender Signup CTA Clicked with fixed source value', () => {
    analytics.senderSignupCtaClicked({ claimId: 'claim-007' });

    expect(plausibleMock).toHaveBeenCalledWith('Sender Signup CTA Clicked', {
      props: {
        journey: 'recipient',
        claim_id: 'claim-007',
        source: 'claim_success_screen',
      },
    });
  });
});

// ── Explorer Link Clicked (§5.4/§6) ──────────────────────────────────────────

describe('analytics.explorerLinkClicked (§5.4)', () => {
  it('emits Explorer Link Clicked with recipient journey and claim_success source', () => {
    analytics.explorerLinkClicked({
      journey: 'recipient',
      claimId: 'claim-008',
      sourceScreen: 'claim_success',
    });

    expect(plausibleMock).toHaveBeenCalledWith('Explorer Link Clicked', {
      props: {
        journey: 'recipient',
        claim_id: 'claim-008',
        source_screen: 'claim_success',
      },
    });
  });

  it('emits Explorer Link Clicked with sender journey and payment_details source', () => {
    analytics.explorerLinkClicked({
      journey: 'sender',
      claimId: 'claim-009',
      sourceScreen: 'payment_details',
    });

    const { props } = plausibleMock.mock.calls[0][1];
    expect(props.journey).toBe('sender');
    expect(props.source_screen).toBe('payment_details');
  });

  it.each([
    ['recipient', 'claim_success'],
    ['sender', 'payment_details'],
  ] as [ExplorerJourney, ExplorerSourceScreen][])(
    'accepts journey=%s, sourceScreen=%s',
    (journey, sourceScreen) => {
      analytics.explorerLinkClicked({ journey, claimId: 'claim-010', sourceScreen });
      const { props } = plausibleMock.mock.calls[0][1];
      expect(props.journey).toBe(journey);
      expect(props.source_screen).toBe(sourceScreen);
    },
  );
});

// ── SSR / no-window guard ─────────────────────────────────────────────────────

describe('track() no-op when window is undefined', () => {
  it('does not throw and does not call plausible in SSR context', () => {
    const originalWindow = (globalThis as any).window;
    delete (globalThis as any).window;

    expect(() => {
      analytics.claimFailed({
        claimId: 'ssr-test',
        errorType: 'unknown',
        attemptNumber: 1,
      });
    }).not.toThrow();

    expect(plausibleMock).not.toHaveBeenCalled();

    (globalThis as any).window = originalWindow;
  });
});
