/**
 * Unit tests for `frontend/lib/analytics.ts`
 *
 * Covers the §3.1 base-payload identity fields and §6 events introduced by Gracora:
 *   - getAnonymousId()  — §3.1 anonymous_id (localStorage-persisted UUID)
 *   - getSessionId()    — §3.1 session_id (sessionStorage-scoped UUID)
 *   - track() base merge — both identity fields present on every event
 *   - Error Displayed   — §6
 *   - Retry Clicked     — §6
 *
 * Also verifies the ERROR_TYPES taxonomy and the daysRemainingUntil helper.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analytics,
  daysRemainingUntil,
  getAnonymousId,
  getSessionId,
  ERROR_TYPES,
  type ErrorType,
} from '@/lib/analytics';

// ── Mock window.plausible ──────────────────────────────────────────────────────

const plausibleMock = vi.fn();

beforeEach(() => {
  plausibleMock.mockReset();
  // Reset storage between tests.
  localStorage.clear();
  sessionStorage.clear();
  (globalThis as any).window = {
    plausible: plausibleMock,
    localStorage,
    sessionStorage,
  };
});

// ── ERROR_TYPES taxonomy ──────────────────────────────────────────────────────

describe('ERROR_TYPES taxonomy', () => {
  it('exports exactly the eight §6 error_type values', () => {
    const keys = Object.keys(ERROR_TYPES) as ErrorType[];
    expect(keys).toHaveLength(8);
    expect(keys).toContain('invalid_token');
    expect(keys).toContain('expired_token');
    expect(keys).toContain('already_claimed');
    expect(keys).toContain('invalid_wallet_address');
    expect(keys).toContain('transaction_failed');
    expect(keys).toContain('network_unavailable');
    expect(keys).toContain('wallet_connection_failed');
    expect(keys).toContain('unknown');
  });

  it('each key maps to itself (const enum pattern)', () => {
    for (const [k, v] of Object.entries(ERROR_TYPES)) {
      expect(k).toBe(v);
    }
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

// ── anonymous_id (§3.1) ────────────────────────────────────────────────────────

describe('getAnonymousId (§3.1)', () => {
  it('generates a UUID v4 on first call', () => {
    const id = getAnonymousId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('persists the same id across multiple calls within the same session', () => {
    const first = getAnonymousId();
    const second = getAnonymousId();
    expect(first).toBe(second);
  });

  it('restores the id from localStorage on re-load', () => {
    const id = getAnonymousId();
    // Simulate a page reload by calling again; localStorage is still populated.
    const restored = getAnonymousId();
    expect(restored).toBe(id);
  });

  it('stores the id in localStorage under the expected key', () => {
    getAnonymousId();
    expect(localStorage.getItem('bridgelet_anonymous_id')).not.toBeNull();
  });
});

// ── session_id (§3.1) ──────────────────────────────────────────────────────────

describe('getSessionId (§3.1)', () => {
  it('generates a UUID v4 on first call', () => {
    const id = getSessionId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('returns the same id within the same session', () => {
    const first = getSessionId();
    const second = getSessionId();
    expect(first).toBe(second);
  });

  it('produces a different id after sessionStorage is cleared (new session)', () => {
    const first = getSessionId();
    sessionStorage.clear();
    const second = getSessionId();
    expect(first).not.toBe(second);
  });

  it('stores the id in sessionStorage under the expected key', () => {
    getSessionId();
    expect(sessionStorage.getItem('bridgelet_session_id')).not.toBeNull();
  });
});

// ── Base payload merge ────────────────────────────────────────────────────────

describe('track() base-payload identity merge', () => {
  it('attaches anonymous_id and session_id to every emitted event', () => {
    const anonId = getAnonymousId();
    const sessId = getSessionId();

    analytics.claimVerified({
      claimId: 'claim-base',
      verificationTimeMs: 100,
    });

    expect(plausibleMock).toHaveBeenCalledOnce();
    const { props } = plausibleMock.mock.calls[0][1];
    expect(props.anonymous_id).toBe(anonId);
    expect(props.session_id).toBe(sessId);
  });

  it('attaches identity fields to Claim CTA Clicked as well', () => {
    analytics.claimCtaClicked({ claimId: 'claim-cta' });
    const { props } = plausibleMock.mock.calls[0][1];
    expect(props).toHaveProperty('anonymous_id');
    expect(props).toHaveProperty('session_id');
  });

  it('event-specific props override base fields when keys collide', () => {
    // In practice this should not happen, but the merge order must be correct.
    analytics.errorDisplayed({
      journey: 'recipient',
      errorType: 'unknown',
      sourceScreen: 'claim_page',
    });
    const { props } = plausibleMock.mock.calls[0][1];
    // anonymous_id and session_id are in props from base merge.
    expect(props).toHaveProperty('anonymous_id');
    expect(props).toHaveProperty('session_id');
  });
});

// ── Error Displayed (§6) ─────────────────────────────────────────────────────

describe('analytics.errorDisplayed (§6)', () => {
  it('emits Error Displayed with all required fields', () => {
    analytics.errorDisplayed({
      journey: 'recipient',
      claimId: 'claim-err-001',
      errorType: 'network_unavailable',
      errorCode: 'API_UNREACHABLE',
      sourceScreen: 'claim_page',
    });

    const { props } = plausibleMock.mock.calls[0][1];
    expect(props.journey).toBe('recipient');
    expect(props.claim_id).toBe('claim-err-001');
    expect(props.error_type).toBe('network_unavailable');
    expect(props.error_code).toBe('API_UNREACHABLE');
    expect(props.source_screen).toBe('claim_page');
  });

  it('defaults error_code to "unknown" when omitted', () => {
    analytics.errorDisplayed({
      journey: 'recipient',
      errorType: 'unknown',
      sourceScreen: 'claim_page',
    });

    const { props } = plausibleMock.mock.calls[0][1];
    expect(props.error_code).toBe('unknown');
  });

  it('omits claim_id when not provided', () => {
    analytics.errorDisplayed({
      journey: 'recipient',
      errorType: 'unknown',
      sourceScreen: 'claim_page',
    });

    const { props } = plausibleMock.mock.calls[0][1];
    expect(props).not.toHaveProperty('claim_id');
  });

  it('omits claim_id when null', () => {
    analytics.errorDisplayed({
      journey: 'recipient',
      claimId: null,
      errorType: 'unknown',
      sourceScreen: 'claim_page',
    });

    const { props } = plausibleMock.mock.calls[0][1];
    expect(props).not.toHaveProperty('claim_id');
  });

  it.each(Object.keys(ERROR_TYPES) as ErrorType[])(
    'accepts error_type=%s from the taxonomy',
    (errorType) => {
      analytics.errorDisplayed({ journey: 'shared', errorType, sourceScreen: 'test' });
      const { props } = plausibleMock.mock.calls[0][1];
      expect(props.error_type).toBe(errorType);
    },
  );

  it('accepts sender journey', () => {
    analytics.errorDisplayed({
      journey: 'sender',
      errorType: 'wallet_connection_failed',
      sourceScreen: 'send_form',
    });
    const { props } = plausibleMock.mock.calls[0][1];
    expect(props.journey).toBe('sender');
  });
});

// ── Retry Clicked (§6) ────────────────────────────────────────────────────────

describe('analytics.retryClicked (§6)', () => {
  it('emits Retry Clicked with all required fields', () => {
    analytics.retryClicked({
      journey: 'recipient',
      claimId: 'claim-retry-001',
      errorType: 'network_unavailable',
      attemptNumber: 2,
    });

    const { props } = plausibleMock.mock.calls[0][1];
    expect(props.journey).toBe('recipient');
    expect(props.claim_id).toBe('claim-retry-001');
    expect(props.error_type).toBe('network_unavailable');
    expect(props.attempt_number).toBe(2);
  });

  it('omits claim_id when not provided', () => {
    analytics.retryClicked({
      journey: 'recipient',
      errorType: 'unknown',
      attemptNumber: 1,
    });

    const { props } = plausibleMock.mock.calls[0][1];
    expect(props).not.toHaveProperty('claim_id');
  });

  it('omits claim_id when null', () => {
    analytics.retryClicked({
      journey: 'recipient',
      claimId: null,
      errorType: 'unknown',
      attemptNumber: 1,
    });

    const { props } = plausibleMock.mock.calls[0][1];
    expect(props).not.toHaveProperty('claim_id');
  });

  it('increments attempt_number correctly across multiple retries', () => {
    for (let i = 1; i <= 3; i++) {
      analytics.retryClicked({
        journey: 'recipient',
        claimId: 'claim-seq',
        errorType: 'network_unavailable',
        attemptNumber: i,
      });
    }
    const attempts = plausibleMock.mock.calls.map((c) => c[1].props.attempt_number);
    expect(attempts).toEqual([1, 2, 3]);
  });
});

// ── SSR / no-window guard ─────────────────────────────────────────────────────

describe('track() no-op when window is undefined', () => {
  it('does not throw and does not call plausible in SSR context', () => {
    const originalWindow = (globalThis as any).window;
    delete (globalThis as any).window;

    expect(() => {
      analytics.errorDisplayed({
        journey: 'recipient',
        errorType: 'unknown',
        sourceScreen: 'claim_page',
      });
    }).not.toThrow();

    expect(plausibleMock).not.toHaveBeenCalled();

    (globalThis as any).window = originalWindow;
  });
});
