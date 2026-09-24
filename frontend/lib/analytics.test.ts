/**
 * Unit tests for `frontend/lib/analytics.ts`
 *
 * Covers the §5.2–§5.3 events introduced by ZionApprove:
 *   - Wallet Address Validation Failed (§5.2)
 *   - Claim Confirmation Viewed      (§5.3)
 *   - Claim Submitted                (§5.3)
 *   - Claim Succeeded                (§5.3)
 *
 * Also verifies the ValidationError type taxonomy and the
 * daysRemainingUntil helper.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analytics,
  daysRemainingUntil,
  type ValidationError,
} from '@/lib/analytics';

// ── Mock window.plausible ──────────────────────────────────────────────────────

const plausibleMock = vi.fn();

beforeEach(() => {
  plausibleMock.mockReset();
  (globalThis as any).window = {
    plausible: plausibleMock,
  };
});

// ── ValidationError taxonomy ───────────────────────────────────────────────────

describe('ValidationError type taxonomy', () => {
  it('accepts all three §5.2 validation_error values at compile time', () => {
    const values: ValidationError[] = [
      'invalid_prefix',
      'invalid_length',
      'invalid_checksum',
    ];
    expect(values).toHaveLength(3);
  });
});

// ── daysRemainingUntil helper ──────────────────────────────────────────────────

describe('daysRemainingUntil', () => {
  it('returns approximately 1 for a timestamp 24 h in the future', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(daysRemainingUntil(future)).toBe(1);
  });

  it('returns 0 for a timestamp in the past', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(daysRemainingUntil(past)).toBe(0);
  });

  it('returns undefined for an invalid ISO string', () => {
    expect(daysRemainingUntil('not-a-date')).toBeUndefined();
  });
});

// ── Wallet Address Validation Failed (§5.2) ────────────────────────────────────

describe('analytics.walletAddressValidationFailed (§5.2)', () => {
  it('emits Wallet Address Validation Failed with required fields', () => {
    analytics.walletAddressValidationFailed({
      claimId: 'claim-abc',
      validationError: 'invalid_prefix',
      attemptNumber: 1,
    });

    expect(plausibleMock).toHaveBeenCalledOnce();
    expect(plausibleMock).toHaveBeenCalledWith(
      'Wallet Address Validation Failed',
      {
        props: {
          journey: 'recipient',
          claim_id: 'claim-abc',
          validation_error: 'invalid_prefix',
          attempt_number: 1,
        },
      },
    );
  });

  it('omits claim_id when not provided', () => {
    analytics.walletAddressValidationFailed({
      validationError: 'invalid_length',
      attemptNumber: 2,
    });

    const { props } = plausibleMock.mock.calls[0][1];
    expect(props).not.toHaveProperty('claim_id');
    expect(props.validation_error).toBe('invalid_length');
    expect(props.attempt_number).toBe(2);
  });

  it('passes invalid_checksum variant', () => {
    analytics.walletAddressValidationFailed({
      claimId: 'claim-xyz',
      validationError: 'invalid_checksum',
      attemptNumber: 3,
    });

    const { props } = plausibleMock.mock.calls[0][1];
    expect(props.validation_error).toBe('invalid_checksum');
  });

  it('increments attempt_number on successive failures', () => {
    for (let i = 1; i <= 3; i++) {
      analytics.walletAddressValidationFailed({
        claimId: 'claim-seq',
        validationError: 'invalid_prefix',
        attemptNumber: i,
      });
    }
    const attempts = plausibleMock.mock.calls.map((c) => c[1].props.attempt_number);
    expect(attempts).toEqual([1, 2, 3]);
  });
});

// ── Claim Confirmation Viewed (§5.3) ──────────────────────────────────────────

describe('analytics.claimConfirmationViewed (§5.3)', () => {
  it('emits Claim Confirmation Viewed with claim_id and asset_type', () => {
    analytics.claimConfirmationViewed({ claimId: 'claim-def', assetType: 'XLM' });

    expect(plausibleMock).toHaveBeenCalledWith('Claim Confirmation Viewed', {
      props: {
        journey: 'recipient',
        claim_id: 'claim-def',
        asset_type: 'XLM',
      },
    });
  });

  it('omits asset_type when not provided', () => {
    analytics.claimConfirmationViewed({ claimId: 'claim-def' });

    const { props } = plausibleMock.mock.calls[0][1];
    expect(props).not.toHaveProperty('asset_type');
  });
});

// ── Claim Submitted (§5.3) ────────────────────────────────────────────────────

describe('analytics.claimSubmitted (§5.3)', () => {
  it('emits Claim Submitted with claim_id and asset_type', () => {
    analytics.claimSubmitted({ claimId: 'claim-ghi', assetType: 'USDC' });

    expect(plausibleMock).toHaveBeenCalledWith('Claim Submitted', {
      props: {
        journey: 'recipient',
        claim_id: 'claim-ghi',
        asset_type: 'USDC',
      },
    });
  });

  it('omits asset_type when not provided', () => {
    analytics.claimSubmitted({ claimId: 'claim-ghi' });
    const { props } = plausibleMock.mock.calls[0][1];
    expect(props).not.toHaveProperty('asset_type');
  });
});

// ── Claim Succeeded (§5.3) ────────────────────────────────────────────────────

describe('analytics.claimSucceeded (§5.3)', () => {
  it('emits Claim Succeeded with all optional fields present', () => {
    analytics.claimSucceeded({
      claimId: 'claim-jkl',
      assetType: 'XLM',
      timeToClaimHours: 3,
      sweepDurationMs: 4200,
      entryChannel: 'whatsapp',
    });

    expect(plausibleMock).toHaveBeenCalledWith('Claim Succeeded', {
      props: {
        journey: 'recipient',
        claim_id: 'claim-jkl',
        asset_type: 'XLM',
        time_to_claim_hours: 3,
        sweep_duration_ms: 4200,
        entry_channel: 'whatsapp',
      },
    });
  });

  it('defaults entry_channel to "unknown" when omitted', () => {
    analytics.claimSucceeded({ claimId: 'claim-mno' });
    const { props } = plausibleMock.mock.calls[0][1];
    expect(props.entry_channel).toBe('unknown');
  });

  it('omits time_to_claim_hours and sweep_duration_ms when undefined', () => {
    analytics.claimSucceeded({ claimId: 'claim-pqr' });
    const { props } = plausibleMock.mock.calls[0][1];
    expect(props).not.toHaveProperty('time_to_claim_hours');
    expect(props).not.toHaveProperty('sweep_duration_ms');
  });

  it('omits asset_type when not provided', () => {
    analytics.claimSucceeded({ claimId: 'claim-stu' });
    const { props } = plausibleMock.mock.calls[0][1];
    expect(props).not.toHaveProperty('asset_type');
  });
});

// ── SSR / no-window guard ─────────────────────────────────────────────────────

describe('track() no-op when window is undefined', () => {
  it('does not throw and does not call plausible in SSR context', () => {
    const originalWindow = (globalThis as any).window;
    delete (globalThis as any).window;

    expect(() => {
      analytics.walletAddressValidationFailed({
        claimId: 'ssr-test',
        validationError: 'invalid_prefix',
        attemptNumber: 1,
      });
    }).not.toThrow();

    expect(plausibleMock).not.toHaveBeenCalled();

    (globalThis as any).window = originalWindow;
  });
});
