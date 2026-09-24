// #118 – Privacy-respecting analytics events (Plausible-compatible, no PII)
type ClaimEvent =
  | 'claim_page_viewed'
  | 'claim_initiated'
  | 'claim_success'
  | 'claim_error'
  | 'Error Displayed'
  | 'Send Form Completed'
  | 'Payment Confirmation Viewed'
  | 'Payment Confirmed'
  | 'Payment Created'
  | 'Claim Link Copied'
  | 'Claim Link Shared'
  | 'Claim Page Opened'
  | 'Payment Details Viewed'
  | 'Page Viewed'
  | 'Send Form Viewed'
  | 'Claim Verified'
  | 'Claim CTA Clicked';

type EventProps = Record<string, string | number | boolean | null>;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * App version correlated to a deploy (`docs/analytics-spec.md` §3.1
 * `app_version`). Inlined at build time from NEXT_PUBLIC_APP_VERSION so
 * dashboards can attribute event volume to a release. Falls back to
 * "unknown" rather than emitting an empty string.
 */
export function appVersion(): string {
  const version = process.env.NEXT_PUBLIC_APP_VERSION;
  return version && version.trim().length > 0 ? version : 'unknown';
}

/**
 * Classifies `mobile | tablet | desktop` from a user agent
 * (`docs/analytics-spec.md` §3.1 `device_type`). Accepts an explicit UA
 * string for testability; defaults to the runtime navigator user agent.
 * Desktop is the conservative default when no signal matches.
 */
export function detectDeviceType(userAgent?: string): DeviceType {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (/(tablet|ipad)/i.test(ua)) return 'tablet';
  if (/(mobile|iphone|ipod|android)/i.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Base payload fields (`docs/analytics-spec.md` §3.1) shared by every
 * event: `app_version`, `user_agent`, `device_type`, `referrer`, and the
 * fixed frontend `platform` value "web". Each field degrades gracefully
 * when the browser API it depends on is unavailable (SSR, unit tests
 * without a DOM).
 */
export function buildBasePayload(): EventProps {
  return {
    app_version: appVersion(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    device_type: detectDeviceType(),
    referrer: typeof document !== 'undefined' && document.referrer ? document.referrer : null,
    platform: 'web',
  };
}

function track(event: ClaimEvent, props?: EventProps): void {
  if (typeof window === 'undefined') return;

  // Base payload is merged in first so event-specific props can override.
  const payload: EventProps = { ...buildBasePayload(), ...props };

  // Plausible custom event API
  const plausible = (window as unknown as { plausible?: Function }).plausible;
  if (typeof plausible === 'function') {
    plausible(event, { props: payload });
    return;
  }

  // Fallback: console in development
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics]', event, payload);
  }
}

export type ShareMethod = 'sms' | 'email' | 'whatsapp' | 'qr_code';

export type EntrySource = 'direct' | 'referral' | 'shared_link' | 'unknown';

export type ClaimEntryChannel = 'sms' | 'email' | 'whatsapp' | 'direct' | 'unknown';

export type PaymentClaimStatus = 'unclaimed' | 'claimed' | 'expired';

/** Standard `error_type` values from `docs/analytics-spec.md` §6. */
export const ERROR_TYPES = [
  'invalid_token',
  'expired_token',
  'already_claimed',
  'invalid_wallet_address',
  'transaction_failed',
  'network_unavailable',
  'wallet_connection_failed',
  'unknown',
] as const;

export type ErrorType = (typeof ERROR_TYPES)[number];

/**
 * Conditional payload properties (`docs/analytics-spec.md` §3.2) are
 * included only on the events where they are relevant. Each helper below
 * returns the exact property key the spec expects, so event handlers can
 * spread the fields they need without re-typing the snake_case names.
 */

/** Allowed `expiry_days` windows: `1`, `7`, `30`, `90`, or `null` (never). */
export const VALID_EXPIRY_WINDOWS = [1, 7, 30, 90] as const;

export type ExpiryDays = (typeof VALID_EXPIRY_WINDOWS)[number] | null;

export const conditional = {
  claimId: (claimId: string): EventProps => ({ claim_id: claimId }),
  assetType: (assetType: string): EventProps => ({ asset_type: assetType }),
  amountUsdEquiv: (amountUsdEquiv: number): EventProps => ({
    amount_usd_equiv: amountUsdEquiv,
  }),
  expiryDays: (expiryDays: ExpiryDays): EventProps => ({ expiry_days: expiryDays }),
  errorType: (errorType: ErrorType): EventProps => ({ error_type: errorType }),
  errorCode: (errorCode: string): EventProps => ({ error_code: errorCode }),
};

interface ClaimVerifiedProps {
  claimId: string;
  assetType?: string;
  expiryDaysRemaining?: number;
  verificationTimeMs: number;
}

interface ClaimCtaClickedProps {
  claimId: string;
  assetType?: string;
}

export function daysRemainingUntil(iso: string): number | undefined {
  const expiresAt = Date.parse(iso);
  if (Number.isNaN(expiresAt)) return undefined;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000));
}

interface ErrorDisplayedProps {
  journey: 'sender' | 'recipient';
  claimId?: string;
  errorType: ErrorType;
  errorCode?: string;
  sourceScreen: string;
}

export const analytics = {
  claimPageViewed: () => track('claim_page_viewed'),
  claimInitiated: () => track('claim_initiated'),
  claimSuccess: () => track('claim_success'),
  claimError: (reason: string) => track('claim_error', { reason }),
  sendFormCompleted: ({
    assetType,
    expiryDays,
    hasRecipientName,
    hasMessage,
  }: {
    assetType?: string;
    expiryDays?: number | null;
    hasRecipientName: boolean;
    hasMessage: boolean;
  }) =>
    track('Send Form Completed', {
      journey: 'sender',
      ...(assetType ? { asset_type: assetType } : {}),
      ...(expiryDays != null ? { expiry_days: expiryDays } : {}),
      has_recipient_name: hasRecipientName,
      has_message: hasMessage,
    }),
  paymentConfirmationViewed: ({
    assetType,
    expiryDays,
  }: {
    assetType?: string;
    expiryDays?: number | null;
  }) =>
    track('Payment Confirmation Viewed', {
      journey: 'sender',
      ...(assetType ? { asset_type: assetType } : {}),
      ...(expiryDays != null ? { expiry_days: expiryDays } : {}),
    }),
  paymentConfirmed: ({
    assetType,
    expiryDays,
    walletType,
  }: {
    assetType?: string;
    expiryDays?: number | null;
    walletType?: string;
  }) =>
    track('Payment Confirmed', {
      journey: 'sender',
      ...(assetType ? { asset_type: assetType } : {}),
      ...(expiryDays != null ? { expiry_days: expiryDays } : {}),
      ...(walletType ? { wallet_type: walletType } : {}),
    }),
  paymentCreated: ({
    claimId,
    assetType,
    expiryDays,
    confirmationTimeMs,
  }: {
    claimId: string;
    assetType?: string;
    expiryDays?: number | null;
    confirmationTimeMs: number;
  }) =>
    track('Payment Created', {
      journey: 'sender',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
      ...(expiryDays != null ? { expiry_days: expiryDays } : {}),
      confirmation_time_ms: confirmationTimeMs,
    }),
  claimLinkCopied: ({
    claimId,
    copyLocation,
  }: {
    claimId: string;
    copyLocation: 'success_screen' | 'dashboard_detail';
  }) =>
    track('Claim Link Copied', {
      journey: 'sender',
      claim_id: claimId,
      copy_location: copyLocation,
    }),
  claimLinkShared: ({ claimId, shareMethod }: { claimId: string; shareMethod: ShareMethod }) =>
    track('Claim Link Shared', {
      journey: 'sender',
      claim_id: claimId,
      share_method: shareMethod,
    }),
  claimPageOpened: ({
    claimId,
    entryChannel,
  }: {
    claimId: string;
    entryChannel: ClaimEntryChannel;
  }) =>
    track('Claim Page Opened', {
      journey: 'recipient',
      claim_id: claimId,
      entry_channel: entryChannel,
    }),
  paymentDetailsViewed: ({
    claimId,
    claimStatus,
  }: {
    claimId: string;
    claimStatus: PaymentClaimStatus;
  }) =>
    track('Payment Details Viewed', {
      journey: 'sender',
      claim_id: claimId,
      claim_status: claimStatus,
    }),
  pageViewed: ({ page, entrySource }: { page: string; entrySource?: EntrySource }) =>
    track('Page Viewed', {
      journey: 'sender',
      page,
      ...(entrySource ? { entry_source: entrySource } : {}),
    }),
  sendFormViewed: () => track('Send Form Viewed', { journey: 'sender' }),
  claimVerified: ({
    claimId,
    assetType,
    expiryDaysRemaining,
    verificationTimeMs,
  }: ClaimVerifiedProps) =>
    track('Claim Verified', {
      journey: 'recipient',
      ...conditional.claimId(claimId),
      ...(assetType ? conditional.assetType(assetType) : {}),
      ...(expiryDaysRemaining != null ? { expiry_days_remaining: expiryDaysRemaining } : {}),
      verification_time_ms: verificationTimeMs,
    }),
  claimCtaClicked: ({ claimId, assetType }: ClaimCtaClickedProps) =>
    track('Claim CTA Clicked', {
      journey: 'recipient',
      ...conditional.claimId(claimId),
      ...(assetType ? conditional.assetType(assetType) : {}),
    }),
  errorDisplayed: ({
    journey,
    claimId,
    errorType,
    errorCode,
    sourceScreen,
  }: ErrorDisplayedProps) =>
    track('Error Displayed', {
      journey,
      ...(claimId ? { claim_id: claimId } : {}),
      ...conditional.errorType(errorType),
      ...conditional.errorCode(errorCode ?? 'unknown'),
      source_screen: sourceScreen,
    }),
};
