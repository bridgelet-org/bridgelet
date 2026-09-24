// #118 – Privacy-respecting analytics events (Plausible-compatible, no PII)
type ClaimEvent =
  | 'claim_page_viewed'
  | 'claim_initiated'
  | 'claim_success'
  | 'claim_error'
  | 'Claim Verified'
  | 'Claim CTA Clicked'
  | 'Wallet Address Validation Failed'
  | 'Claim Confirmation Viewed'
  | 'Claim Submitted'
  | 'Claim Succeeded';

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

/** Client-side address-validation failure reasons (`docs/analytics-spec.md` §5.2). */
export type ValidationError = 'invalid_prefix' | 'invalid_length' | 'invalid_checksum';

interface WalletAddressValidationFailedProps {
  claimId?: string;
  validationError: ValidationError;
  attemptNumber: number;
}

interface ClaimSucceededProps {
  claimId: string;
  assetType?: string;
  /** Hours between `Payment Created` (sender) and `Claim Succeeded` (recipient). */
  timeToClaimHours?: number;
  /** Time in ms from `Claim Submitted` to on-chain confirmation. */
  sweepDurationMs?: number;
  entryChannel?: string;
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
  walletAddressValidationFailed: ({
    claimId,
    validationError,
    attemptNumber,
  }: WalletAddressValidationFailedProps) =>
    track('Wallet Address Validation Failed', {
      journey: 'recipient',
      ...(claimId ? { claim_id: claimId } : {}),
      validation_error: validationError,
      attempt_number: attemptNumber,
    }),
  claimConfirmationViewed: ({ claimId, assetType }: ClaimCtaClickedProps) =>
    track('Claim Confirmation Viewed', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
    }),
  claimSubmitted: ({ claimId, assetType }: ClaimCtaClickedProps) =>
    track('Claim Submitted', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
    }),
  claimSucceeded: ({
    claimId,
    assetType,
    timeToClaimHours,
    sweepDurationMs,
    entryChannel = 'unknown',
  }: ClaimSucceededProps) =>
    track('Claim Succeeded', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
      ...(timeToClaimHours !== undefined ? { time_to_claim_hours: timeToClaimHours } : {}),
      ...(sweepDurationMs !== undefined ? { sweep_duration_ms: sweepDurationMs } : {}),
      entry_channel: entryChannel,
    }),
};
