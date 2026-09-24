import { afterEach, describe, expect, it, vi } from 'vitest';
import { analytics, conditional, ERROR_TYPES, ErrorType } from '@/lib/analytics';

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
  it('builds the error_type property for the cluster-owned types', () => {
    expect(conditional.errorType('already_claimed')).toEqual({ error_type: 'already_claimed' });
    expect(conditional.errorType('invalid_wallet_address')).toEqual({
      error_type: 'invalid_wallet_address',
    });
    expect(conditional.errorType('transaction_failed')).toEqual({ error_type: 'transaction_failed' });
    expect(conditional.errorType('network_unavailable')).toEqual({
      error_type: 'network_unavailable',
    });
  });

  it('builds the error_code property', () => {
    expect(conditional.errorCode('ALREADY_CLAIMED')).toEqual({ error_code: 'ALREADY_CLAIMED' });
  });
});

describe('analytics.errorDisplayed', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (window as unknown as { plausible?: unknown }).plausible;
  });

  const clusterTypes: ErrorType[] = [
    'already_claimed',
    'invalid_wallet_address',
    'transaction_failed',
    'network_unavailable',
  ];

  it.each(clusterTypes)('emits Error Displayed with error_type %s', (errorType) => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.errorDisplayed({
      journey: 'recipient',
      claimId: 'tok_123',
      errorType,
      errorCode: 'TEST_CODE',
      sourceScreen: 'claim_landing',
    });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[0]).toBe('Error Displayed');
    expect(call[1].props).toEqual({
      journey: 'recipient',
      claim_id: 'tok_123',
      error_type: errorType,
      error_code: 'TEST_CODE',
      source_screen: 'claim_landing',
    });
  });

  it('defaults error_code to "unknown" when no machine-readable code is available', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.errorDisplayed({
      journey: 'recipient',
      errorType: 'network_unavailable',
      sourceScreen: 'claim_landing',
    });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[1].props).toEqual({
      journey: 'recipient',
      error_type: 'network_unavailable',
      error_code: 'unknown',
      source_screen: 'claim_landing',
    });
    expect('claim_id' in call[1].props).toBe(false);
  });

  it('no-ops when the window object is unavailable', () => {
    const plausible = (window as unknown as { plausible: ReturnType<typeof plausibleMock> })
      .plausible;
    vi.stubGlobal('window', undefined);

    expect(() =>
      analytics.errorDisplayed({
        journey: 'recipient',
        errorType: 'already_claimed',
        errorCode: 'ALREADY_CLAIMED',
        sourceScreen: 'claim_landing',
      }),
    ).not.toThrow();
    expect(plausible).not.toHaveBeenCalled();
  });
});