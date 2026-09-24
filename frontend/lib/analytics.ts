// #118 – Privacy-respecting analytics events (Plausible-compatible, no PII)
type ClaimEvent =
  | 'claim_page_viewed'
  | 'claim_initiated'
  | 'claim_success'
  | 'claim_error'
  | 'Error Displayed'
  | 'Claim Verified'
  | 'Claim CTA Clicked';

type EventProps = Record<string, string | number | boolean>;

function track(event: ClaimEvent, props?: EventProps): void {
  if (typeof window === 'undefined') return;

  // Plausible custom event API
  const plausible = (window as unknown as { plausible?: Function }).plausible;
  if (typeof plausible === 'function') {
    plausible(event, { props });
    return;
  }

  // Fallback: console in development
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics]', event, props);
  }
}

/**
 * Conditional payload properties (`docs/analytics-spec.md` §3.2) are
 * included only on the events where they are relevant. Each helper below
 * returns the exact property key the spec expects.
 */

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

export const conditional = {
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
  claimVerified: ({
    claimId,
    assetType,
    expiryDaysRemaining,
    verificationTimeMs,
  }: ClaimVerifiedProps) =>
    track('Claim Verified', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
      ...(expiryDaysRemaining != null ? { expiry_days_remaining: expiryDaysRemaining } : {}),
      verification_time_ms: verificationTimeMs,
    }),
  claimCtaClicked: ({ claimId, assetType }: ClaimCtaClickedProps) =>
    track('Claim CTA Clicked', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
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
