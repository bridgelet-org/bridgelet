import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  analytics,
  appVersion,
  buildBasePayload,
  CLAIM_FAILED_ERROR_TYPES,
  conditional,
  daysRemainingUntil,
  detectDeviceType,
  ERROR_TYPES,
  ErrorType,
  type ClaimFailedErrorType,
  type ExplorerJourney,
  type ExplorerSourceScreen,
  VALID_EXPIRY_WINDOWS,
  type ValidationError,
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
  it('carries the Â§3.1 base fields', () => {
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

describe('error taxonomy (Â§6)', () => {
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

describe('conditional payload property helpers (Â§3.2)', () => {
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

describe('analytics.errorDisplayed (cluster-owned error types)', () => {
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
    expect(call[1].props).toEqual(
      expect.objectContaining({
        journey: 'recipient',
        claim_id: 'tok_123',
        error_type: errorType,
        error_code: 'TEST_CODE',
        source_screen: 'claim_landing',
      }),
    );
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
    expect(call[1].props).toEqual(
      expect.objectContaining({
        journey: 'recipient',
        error_type: 'network_unavailable',
        error_code: 'unknown',
        source_screen: 'claim_landing',
      }),
    );
  });
});

describe('analytics.errorDisplayed (wallet connection & catch-all)', () => {
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
    expect(call[1].props).toEqual(
      expect.objectContaining({
        journey: 'sender',
        error_type: 'wallet_connection_failed',
        error_code: 'CONNECTION_DENIED',
        source_screen: 'send_form_connect',
      }),
    );
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
    expect(call[1].props).toEqual(
      expect.objectContaining({
        journey: 'recipient',
        claim_id: 'tok_abc',
        error_type: 'unknown',
        error_code: 'CLAIM_LOAD_FAILED',
        source_screen: 'claim_landing',
      }),
    );
  });
});

describe('ValidationError type taxonomy', () => {
  it('accepts all three Â§5.2 validation_error values at compile time', () => {
    const values: ValidationError[] = ['invalid_prefix', 'invalid_length', 'invalid_checksum'];
    expect(values).toHaveLength(3);
  });
});

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

describe('recipient claim pipeline events (Â§5.2â€“Â§5.3)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (window as unknown as { plausible?: unknown }).plausible;
  });

  const mockPlausible = () =>
    ((window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock());

  const latest = () =>
    (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible.mock
      .calls[0]!;

  describe('analytics.walletAddressValidationFailed (Â§5.2)', () => {
    it('emits Wallet Address Validation Failed with required fields', () => {
      mockPlausible();
      analytics.walletAddressValidationFailed({
        claimId: 'claim-abc',
        validationError: 'invalid_prefix',
        attemptNumber: 1,
      });

      const call = latest();
      expect(call[0]).toBe('Wallet Address Validation Failed');
      expect(call[1].props).toEqual(
        expect.objectContaining({
          journey: 'recipient',
          claim_id: 'claim-abc',
          validation_error: 'invalid_prefix',
          attempt_number: 1,
        }),
      );
    });

    it('omits claim_id when not provided', () => {
      mockPlausible();
      analytics.walletAddressValidationFailed({
        validationError: 'invalid_length',
        attemptNumber: 2,
      });

      const props = latest()[1].props as {
        claim_id?: string;
        validation_error: string;
        attempt_number: number;
      };
      expect(props).not.toHaveProperty('claim_id');
      expect(props.validation_error).toBe('invalid_length');
      expect(props.attempt_number).toBe(2);
    });

    it('passes invalid_checksum variant', () => {
      mockPlausible();
      analytics.walletAddressValidationFailed({
        claimId: 'claim-xyz',
        validationError: 'invalid_checksum',
        attemptNumber: 3,
      });

      const props = latest()[1].props as { validation_error: string };
      expect(props.validation_error).toBe('invalid_checksum');
    });

    it('increments attempt_number on successive failures', () => {
      mockPlausible();
      for (let i = 1; i <= 3; i++) {
        analytics.walletAddressValidationFailed({
          claimId: 'claim-seq',
          validationError: 'invalid_prefix',
          attemptNumber: i,
        });
      }
      const attempts = (
        window as unknown as { plausible: ReturnType<typeof plausibleMock> }
      ).plausible.mock.calls.map((c) => c[1].props.attempt_number);
      expect(attempts).toEqual([1, 2, 3]);
    });
  });

  describe('analytics.claimConfirmationViewed (Â§5.3)', () => {
    it('emits Claim Confirmation Viewed with claim_id and asset_type', () => {
      mockPlausible();
      analytics.claimConfirmationViewed({ claimId: 'claim-def', assetType: 'XLM' });

      const call = latest();
      expect(call[0]).toBe('Claim Confirmation Viewed');
      expect(call[1].props).toEqual(
        expect.objectContaining({
          journey: 'recipient',
          claim_id: 'claim-def',
          asset_type: 'XLM',
        }),
      );
    });

    it('omits asset_type when not provided', () => {
      mockPlausible();
      analytics.claimConfirmationViewed({ claimId: 'claim-def' });

      const props = latest()[1].props as { asset_type?: string };
      expect(props).not.toHaveProperty('asset_type');
    });
  });

  describe('analytics.claimSubmitted (Â§5.3)', () => {
    it('emits Claim Submitted with claim_id and asset_type', () => {
      mockPlausible();
      analytics.claimSubmitted({ claimId: 'claim-ghi', assetType: 'USDC' });

      const call = latest();
      expect(call[0]).toBe('Claim Submitted');
      expect(call[1].props).toEqual(
        expect.objectContaining({
          journey: 'recipient',
          claim_id: 'claim-ghi',
          asset_type: 'USDC',
        }),
      );
    });

    it('omits asset_type when not provided', () => {
      mockPlausible();
      analytics.claimSubmitted({ claimId: 'claim-ghi' });

      const props = latest()[1].props as { asset_type?: string };
      expect(props).not.toHaveProperty('asset_type');
    });
  });

  describe('analytics.claimSucceeded (Â§5.3)', () => {
    it('emits Claim Succeeded with all optional fields present', () => {
      mockPlausible();
      analytics.claimSucceeded({
        claimId: 'claim-jkl',
        assetType: 'XLM',
        timeToClaimHours: 3,
        sweepDurationMs: 4200,
        entryChannel: 'whatsapp',
      });

      const call = latest();
      expect(call[0]).toBe('Claim Succeeded');
      expect(call[1].props).toEqual(
        expect.objectContaining({
          journey: 'recipient',
          claim_id: 'claim-jkl',
          asset_type: 'XLM',
          time_to_claim_hours: 3,
          sweep_duration_ms: 4200,
          entry_channel: 'whatsapp',
        }),
      );
    });

    it('defaults entry_channel to "unknown" when omitted', () => {
      mockPlausible();
      analytics.claimSucceeded({ claimId: 'claim-mno' });

      const props = latest()[1].props as { entry_channel: string };
      expect(props.entry_channel).toBe('unknown');
    });

    it('omits time_to_claim_hours and sweep_duration_ms when undefined', () => {
      mockPlausible();
      analytics.claimSucceeded({ claimId: 'claim-pqr' });

      const props = latest()[1].props as {
        time_to_claim_hours?: number;
        sweep_duration_ms?: number;
      };
      expect(props).not.toHaveProperty('time_to_claim_hours');
      expect(props).not.toHaveProperty('sweep_duration_ms');
    });

    it('omits asset_type when not provided', () => {
      mockPlausible();
      analytics.claimSucceeded({ claimId: 'claim-stu' });

      const props = latest()[1].props as { asset_type?: string };
      expect(props).not.toHaveProperty('asset_type');
    });
  });

  it('no-ops when the window object is unavailable', () => {
    const plausible = plausibleMock();
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible = plausible;
    vi.stubGlobal('window', undefined);

    expect(() =>
      analytics.walletAddressValidationFailed({
        claimId: 'ssr-test',
        validationError: 'invalid_prefix',
        attemptNumber: 1,
      }),
    ).not.toThrow();
    expect(plausible).not.toHaveBeenCalled();
  });
});

describe('ClaimFailedErrorType taxonomy', () => {
  it('exposes the five §5.3 values', () => {
    const keys = Object.keys(CLAIM_FAILED_ERROR_TYPES);
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

describe('post-claim events (§5.3–§5.4)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (window as unknown as { plausible?: unknown }).plausible;
  });

  const mockPlausible = () =>
    ((window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock());

  const latest = () =>
    (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible.mock
      .calls[0]!;

  describe('analytics.claimFailed (§5.3)', () => {
    it('emits Claim Failed with all required fields', () => {
      mockPlausible();
      analytics.claimFailed({
        claimId: 'claim-001',
        assetType: 'XLM',
        errorCode: 'SUBMISSION_FAILED_FINAL',
        errorType: 'transaction_failed',
        attemptNumber: 1,
      });

      const call = latest();
      expect(call[0]).toBe('Claim Failed');
      expect(call[1].props).toEqual(
        expect.objectContaining({
          journey: 'recipient',
          claim_id: 'claim-001',
          asset_type: 'XLM',
          error_code: 'SUBMISSION_FAILED_FINAL',
          error_type: 'transaction_failed',
          attempt_number: 1,
        }),
      );
    });

    it('defaults error_code to "unknown" when omitted', () => {
      mockPlausible();
      analytics.claimFailed({
        claimId: 'claim-002',
        errorType: 'network_error',
        attemptNumber: 1,
      });

      const props = latest()[1].props as { error_code: string };
      expect(props.error_code).toBe('unknown');
    });

    it('omits asset_type when not provided', () => {
      mockPlausible();
      analytics.claimFailed({
        claimId: 'claim-003',
        errorType: 'unknown',
        attemptNumber: 1,
      });

      const props = latest()[1].props as { asset_type?: string };
      expect(props).not.toHaveProperty('asset_type');
    });

    it.each([
      'network_error',
      'token_expired',
      'already_claimed',
      'transaction_failed',
      'unknown',
    ] as ClaimFailedErrorType[])('emits correct error_type for %s', (errorType) => {
      mockPlausible();
      analytics.claimFailed({ claimId: 'claim-004', errorType, attemptNumber: 1 });

      const props = latest()[1].props as { error_type: ClaimFailedErrorType };
      expect(props.error_type).toBe(errorType);
    });

    it('increments attempt_number across successive failures', () => {
      mockPlausible();
      for (let i = 1; i <= 3; i++) {
        analytics.claimFailed({
          claimId: 'claim-seq',
          errorType: 'network_error',
          attemptNumber: i,
        });
      }
      const attempts = (
        window as unknown as { plausible: ReturnType<typeof plausibleMock> }
      ).plausible.mock.calls.map((c) => c[1].props.attempt_number);
      expect(attempts).toEqual([1, 2, 3]);
    });
  });

  describe('analytics.claimSuccessViewed (§5.4)', () => {
    it('emits Claim Success Viewed with claim_id and asset_type', () => {
      mockPlausible();
      analytics.claimSuccessViewed({ claimId: 'claim-005', assetType: 'USDC' });

      const call = latest();
      expect(call[0]).toBe('Claim Success Viewed');
      expect(call[1].props).toEqual(
        expect.objectContaining({
          journey: 'recipient',
          claim_id: 'claim-005',
          asset_type: 'USDC',
        }),
      );
    });

    it('omits asset_type when not provided', () => {
      mockPlausible();
      analytics.claimSuccessViewed({ claimId: 'claim-006' });

      const props = latest()[1].props as { asset_type?: string };
      expect(props).not.toHaveProperty('asset_type');
    });
  });

  describe('analytics.senderSignupCtaClicked (§5.4)', () => {
    it('emits Sender Signup CTA Clicked with fixed source value', () => {
      mockPlausible();
      analytics.senderSignupCtaClicked({ claimId: 'claim-007' });

      const call = latest();
      expect(call[0]).toBe('Sender Signup CTA Clicked');
      expect(call[1].props).toEqual(
        expect.objectContaining({
          journey: 'recipient',
          claim_id: 'claim-007',
          source: 'claim_success_screen',
        }),
      );
    });
  });

  describe('analytics.explorerLinkClicked (§5.4/§6)', () => {
    it('emits Explorer Link Clicked with recipient journey and claim_success source', () => {
      mockPlausible();
      analytics.explorerLinkClicked({
        journey: 'recipient',
        claimId: 'claim-008',
        sourceScreen: 'claim_success',
      });

      const call = latest();
      expect(call[0]).toBe('Explorer Link Clicked');
      expect(call[1].props).toEqual(
        expect.objectContaining({
          journey: 'recipient',
          claim_id: 'claim-008',
          source_screen: 'claim_success',
        }),
      );
    });

    it('emits Explorer Link Clicked with sender journey and payment_details source', () => {
      mockPlausible();
      analytics.explorerLinkClicked({
        journey: 'sender',
        claimId: 'claim-009',
        sourceScreen: 'payment_details',
      });

      const props = latest()[1].props as {
        journey: ExplorerJourney;
        source_screen: ExplorerSourceScreen;
      };
      expect(props.journey).toBe('sender');
      expect(props.source_screen).toBe('payment_details');
    });

    it.each([
      ['recipient', 'claim_success'],
      ['sender', 'payment_details'],
    ] as [ExplorerJourney, ExplorerSourceScreen][])(
      'accepts journey=%s, sourceScreen=%s',
      (journey, sourceScreen) => {
        mockPlausible();
        analytics.explorerLinkClicked({ journey, claimId: 'claim-010', sourceScreen });

        const props = latest()[1].props as {
          journey: ExplorerJourney;
          source_screen: ExplorerSourceScreen;
        };
        expect(props.journey).toBe(journey);
        expect(props.source_screen).toBe(sourceScreen);
      },
    );
  });

  it('no-ops when the window object is unavailable', () => {
    const plausible = plausibleMock();
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible = plausible;
    vi.stubGlobal('window', undefined);

    expect(() =>
      analytics.claimFailed({
        claimId: 'ssr-test',
        errorType: 'unknown',
        attemptNumber: 1,
      }),
    ).not.toThrow();
    expect(plausible).not.toHaveBeenCalled();
  });
});