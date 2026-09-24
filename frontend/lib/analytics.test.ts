import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  analytics,
  appVersion,
  buildBasePayload,
  conditional,
  detectDeviceType,
  ERROR_TYPES,
  VALID_EXPIRY_WINDOWS,
} from '@/lib/analytics';

function plausibleMock() {
  return vi.fn();
}

describe('appVersion', () => {
  it('reads the build-time NEXT_PUBLIC_APP_VERSION when set', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_VERSION', '1.4.2');
    expect(appVersion()).toBe('1.4.2');
  });

  it('falls back to "unknown" without a configured version', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_VERSION', '');
    expect(appVersion()).toBe('unknown');
  });
});

describe('detectDeviceType', () => {
  it('classifies mobile user agents', () => {
    expect(detectDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('mobile');
    expect(detectDeviceType('Mozilla/5.0 (Linux; Android 14) Mobile')).toBe('mobile');
  });

  it('classifies tablet user agents', () => {
    expect(detectDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('tablet');
    expect(detectDeviceType('Mozilla/5.0 (Linux; Android 13) Tablet')).toBe('tablet');
  });

  it('classifies desktop user agents', () => {
    expect(detectDeviceType('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')).toBe('desktop');
    expect(detectDeviceType('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe('desktop');
  });

  it('defaults to desktop when the user agent is empty or absent', () => {
    expect(detectDeviceType('')).toBe('desktop');
    expect(detectDeviceType(undefined)).toBe('desktop');
  });
});

describe('buildBasePayload', () => {
  it('carries the §3.1 base fields', () => {
    const payload = buildBasePayload();
    expect(payload).toEqual(
      expect.objectContaining({
        app_version: expect.any(String),
        user_agent: expect.any(String),
        device_type: expect.stringMatching(/^(mobile|tablet|desktop)$/),
      }),
    );
    expect('referrer' in payload).toBe(true);
  });

  it('degrades to empty strings and null when browser APIs are absent', () => {
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('document', undefined);

    const payload = buildBasePayload();
    expect(payload.user_agent).toBe('');
    expect(payload.device_type).toBe('desktop');
    expect(payload.referrer).toBeNull();

    vi.unstubAllGlobals();
  });
});

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

describe('conditional payload property helpers (§3.2)', () => {
  it('builds the claim_id property', () => {
    expect(conditional.claimId('tok_abc')).toEqual({ claim_id: 'tok_abc' });
  });

  it('builds the asset_type property', () => {
    expect(conditional.assetType('XLM')).toEqual({ asset_type: 'XLM' });
    expect(conditional.assetType('USDC')).toEqual({ asset_type: 'USDC' });
  });

  it('builds the amount_usd_equiv property from a numeric value', () => {
    expect(conditional.amountUsdEquiv(25.5)).toEqual({ amount_usd_equiv: 25.5 });
    expect(conditional.amountUsdEquiv(0)).toEqual({ amount_usd_equiv: 0 });
  });

  it('builds the expiry_days property for each valid window', () => {
    expect(conditional.expiryDays(1)).toEqual({ expiry_days: 1 });
    expect(conditional.expiryDays(7)).toEqual({ expiry_days: 7 });
    expect(conditional.expiryDays(30)).toEqual({ expiry_days: 30 });
    expect(conditional.expiryDays(90)).toEqual({ expiry_days: 90 });
  });

  it('builds the expiry_days property as null for a non-expiring payment', () => {
    expect(conditional.expiryDays(null)).toEqual({ expiry_days: null });
  });

  it('exposes the enumerated expiry windows from the spec', () => {
    expect(VALID_EXPIRY_WINDOWS).toEqual([1, 7, 30, 90]);
  });

  it('builds the error_type property', () => {
    expect(conditional.errorType('expired_token')).toEqual({ error_type: 'expired_token' });
    expect(conditional.errorType('invalid_token')).toEqual({ error_type: 'invalid_token' });
  });

  it('builds the error_code property', () => {
    expect(conditional.errorCode('TOKEN_EXPIRED')).toEqual({ error_code: 'TOKEN_EXPIRED' });
    expect(conditional.errorCode('unknown')).toEqual({ error_code: 'unknown' });
  });
});

describe('conditional props wired into emitted events', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as unknown as { plausible?: unknown }).plausible;
  });

  it('Claim Verified carries claim_id and asset_type via the helpers', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.claimVerified({
      claimId: 'tok_abc',
      assetType: 'XLM',
      expiryDaysRemaining: 7,
      verificationTimeMs: 42,
    });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[1].props).toEqual(
      expect.objectContaining({ claim_id: 'tok_abc', asset_type: 'XLM' }),
    );
  });

  it('Claim Verified omits asset_type when no asset is available', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.claimVerified({ claimId: 'tok_abc', verificationTimeMs: 42 });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[1].props).toEqual(expect.objectContaining({ claim_id: 'tok_abc' }));
    expect('asset_type' in call[1].props).toBe(false);
  });

  it('Claim CTA Clicked carries claim_id and asset_type via the helpers', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.claimCtaClicked({ claimId: 'tok_abc', assetType: 'XLM' });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[1].props).toEqual(
      expect.objectContaining({ journey: 'recipient', claim_id: 'tok_abc', asset_type: 'XLM' }),
    );
  });
});

describe('analytics.errorDisplayed', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (window as unknown as { plausible?: unknown }).plausible;
  });

  it('emits Error Displayed with error_type and error_code', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.errorDisplayed({
      journey: 'recipient',
      claimId: 'tok_123',
      errorType: 'expired_token',
      errorCode: 'TOKEN_EXPIRED',
      sourceScreen: 'claim_landing',
    });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[0]).toBe('Error Displayed');
    expect(call[1].props).toEqual(
      expect.objectContaining({
        journey: 'recipient',
        claim_id: 'tok_123',
        error_type: 'expired_token',
        error_code: 'TOKEN_EXPIRED',
        source_screen: 'claim_landing',
      }),
    );
  });

  it('defaults error_code to "unknown" and omits claim_id when not provided', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.errorDisplayed({
      journey: 'sender',
      errorType: 'invalid_token',
      sourceScreen: 'claim_landing',
    });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[1].props).toEqual(
      expect.objectContaining({
        journey: 'sender',
        error_type: 'invalid_token',
        error_code: 'unknown',
        source_screen: 'claim_landing',
      }),
    );
    expect('claim_id' in call[1].props).toBe(false);
  });
});

describe('track base payload merge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (window as unknown as { plausible?: unknown }).plausible;
  });

  it('attaches the base payload to every tracking call', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

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
      expect(call[1]).toEqual({
        props: expect.objectContaining({
          app_version: expect.any(String),
          user_agent: expect.any(String),
          device_type: expect.stringMatching(/^(mobile|tablet|desktop)$/),
        }),
      });
      expect('referrer' in call[1].props).toBe(true);
    }
  });

  it('merges event-specific props next to the base payload', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.claimVerified({
      claimId: 'tok_123',
      assetType: 'XLM',
      expiryDaysRemaining: 7,
      verificationTimeMs: 42,
    });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[0]).toBe('Claim Verified');
    expect(call[1].props).toEqual(
      expect.objectContaining({
        journey: 'recipient',
        claim_id: 'tok_123',
        asset_type: 'XLM',
        expiry_days_remaining: 7,
        verification_time_ms: 42,
      }),
    );
  });

  it('lets event props override the base payload', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.claimError('network_error');

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[1].props).toEqual(
      expect.objectContaining({
        app_version: expect.any(String),
        user_agent: expect.any(String),
        device_type: expect.stringMatching(/^(mobile|tablet|desktop)$/),
        reason: 'network_error',
      }),
    );
    expect(typeof call[1].props.referrer === 'string' || call[1].props.referrer === null).toBe(
      true,
    );
  });

  it('no-ops when the window object is unavailable', () => {
    const plausible = plausibleMock();
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible = plausible;
    vi.stubGlobal('window', undefined);

    expect(() => analytics.claimPageViewed()).not.toThrow();
    expect(plausible).not.toHaveBeenCalled();
  });
});