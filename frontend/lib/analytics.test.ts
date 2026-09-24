import { afterEach, describe, expect, it, vi } from 'vitest';
import { analytics, conditional, ERROR_TYPES } from '@/lib/analytics';

function plausibleMock() {
  return vi.fn();
}

describe('error taxonomy (§6)', () => {
  it('lists exactly the eight standard error_type values from the spec', () => {
    expect(ERROR_TYPES).toEqual([
      'invalid_token',
      'expired_token',
      'already_claimed',
      'invalid_wallet_address',
      'transaction_failed',
      'network_unavailable',
      'wallet_connection_failed',
      'unknown',
    ]);
  });
});

describe('conditional error payload properties (§3.2)', () => {
  it('builds the error_type property', () => {
    expect(conditional.errorType('wallet_connection_failed')).toEqual({
      error_type: 'wallet_connection_failed',
    });
    expect(conditional.errorType('unknown')).toEqual({ error_type: 'unknown' });
  });

  it('builds the error_code property', () => {
    expect(conditional.errorCode('CONNECTION_DENIED')).toEqual({ error_code: 'CONNECTION_DENIED' });
  });
});

describe('analytics.errorDisplayed', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (window as unknown as { plausible?: unknown }).plausible;
  });

  it('emits Error Displayed with wallet_connection_failed on the sender journey', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.errorDisplayed({
      journey: 'sender',
      errorType: 'wallet_connection_failed',
      errorCode: 'CONNECTION_DENIED',
      sourceScreen: 'send_form_connect',
    });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[0]).toBe('Error Displayed');
    expect(call[1].props).toEqual({
      journey: 'sender',
      error_type: 'wallet_connection_failed',
      error_code: 'CONNECTION_DENIED',
      source_screen: 'send_form_connect',
    });
  });

  it('emits Error Displayed with the catch-all unknown type on the recipient journey', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.errorDisplayed({
      journey: 'recipient',
      claimId: 'tok_abc',
      errorType: 'unknown',
      errorCode: 'CLAIM_LOAD_FAILED',
      sourceScreen: 'claim_landing',
    });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[1].props).toEqual({
      journey: 'recipient',
      claim_id: 'tok_abc',
      error_type: 'unknown',
      error_code: 'CLAIM_LOAD_FAILED',
      source_screen: 'claim_landing',
    });
  });

  it('defaults error_code to "unknown" when no code is provided', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.errorDisplayed({
      journey: 'sender',
      errorType: 'wallet_connection_failed',
      sourceScreen: 'send_form_connect',
    });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[1].props.error_code).toBe('unknown');
  });

  it('no-ops when the window object is unavailable', () => {
    const plausible = (window as unknown as { plausible: ReturnType<typeof plausibleMock> })
      .plausible;
    vi.stubGlobal('window', undefined);

    expect(() =>
      analytics.errorDisplayed({
        journey: 'recipient',
        errorType: 'unknown',
        sourceScreen: 'claim_landing',
      }),
    ).not.toThrow();
    expect(plausible).not.toHaveBeenCalled();
  });
});