// #118 – Privacy-respecting analytics events (Plausible-compatible, no PII)
type ClaimEvent =
  | 'claim_page_viewed'
  | 'claim_initiated'
  | 'claim_success'
  | 'claim_error'
  | 'Claim Verified'
  | 'Claim CTA Clicked'
  | 'Claim Failed'
  | 'Claim Success Viewed'
  | 'Sender Signup CTA Clicked'
  | 'Explorer Link Clicked';

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

/**
 * §5.3 `Claim Failed` error type taxonomy.
 * Matches the spec-defined values exactly.
 */
export type ClaimFailedErrorType =
  | 'network_error'
  | 'token_expired'
  | 'already_claimed'
  | 'transaction_failed'
  | 'unknown';

/** All valid §5.3 Claim Failed error_type values. */
export const CLAIM_FAILED_ERROR_TYPES: Record<ClaimFailedErrorType, ClaimFailedErrorType> = {
  network_error: 'network_error',
  token_expired: 'token_expired',
  already_claimed: 'already_claimed',
  transaction_failed: 'transaction_failed',
  unknown: 'unknown',
} as const;

interface ClaimFailedProps {
  claimId: string;
  assetType?: string;
  /** Stellar error code or 'unknown'. */
  errorCode?: string;
  /** §5.3 error_type taxonomy value. */
  errorType: ClaimFailedErrorType;
  /** How many times the recipient has tried on this claim. */
  attemptNumber: number;
}

interface ClaimSuccessViewedProps {
  claimId: string;
  assetType?: string;
}

interface SenderSignupCtaClickedProps {
  claimId: string;
}

/** §5.4/§6 source_screen values for Explorer Link Clicked. */
export type ExplorerSourceScreen = 'claim_success' | 'payment_details';

/** §2.3 journey values for Explorer Link Clicked. */
export type ExplorerJourney = 'sender' | 'recipient';

interface ExplorerLinkClickedProps {
  journey: ExplorerJourney;
  claimId: string;
  sourceScreen: ExplorerSourceScreen;
}

export function daysRemainingUntil(iso: string): number | undefined {
  const expiresAt = Date.parse(iso);
  if (Number.isNaN(expiresAt)) return undefined;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000));
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

  /**
   * §5.3 Claim Failed — fires when the sweep fails after the recipient confirmed.
   * `error_type` must be one of the five §5.3 taxonomy values.
   */
  claimFailed: ({
    claimId,
    assetType,
    errorCode = 'unknown',
    errorType,
    attemptNumber,
  }: ClaimFailedProps) =>
    track('Claim Failed', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
      error_code: errorCode,
      error_type: errorType,
      attempt_number: attemptNumber,
    }),

  /**
   * §5.4 Claim Success Viewed — fires when the post-claim success screen is displayed.
   */
  claimSuccessViewed: ({ claimId, assetType }: ClaimSuccessViewedProps) =>
    track('Claim Success Viewed', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
    }),

  /**
   * §5.4 Sender Signup CTA Clicked — fires when a recipient clicks "Create your account →"
   * on the success screen, measuring viral growth potential.
   */
  senderSignupCtaClicked: ({ claimId }: SenderSignupCtaClickedProps) =>
    track('Sender Signup CTA Clicked', {
      journey: 'recipient',
      claim_id: claimId,
      source: 'claim_success_screen',
    }),

  /**
   * §5.4/§6 Explorer Link Clicked — fires when a user (sender or recipient) clicks a
   * Stellar Explorer transaction link.
   */
  explorerLinkClicked: ({ journey, claimId, sourceScreen }: ExplorerLinkClickedProps) =>
    track('Explorer Link Clicked', {
      journey,
      claim_id: claimId,
      source_screen: sourceScreen,
    }),
};
