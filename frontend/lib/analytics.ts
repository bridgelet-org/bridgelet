// #118 – Privacy-respecting analytics events (Plausible-compatible, no PII)
type ClaimEvent =
  | 'claim_page_viewed'
  | 'claim_initiated'
  | 'claim_success'
  | 'claim_error'
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

type EventProps = Record<string, string | number | boolean>;

/**
 * Base payload fields (`docs/analytics-spec.md` §3.1) shared by every
 * event. The frontend always runs in a browser, so `platform` is the fixed
 * value "web". Additional base fields can be appended here as they land.
 */
export function buildBasePayload(): EventProps {
  return { platform: 'web' };
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

export const analytics = {
  claimPageViewed: () => track('claim_page_viewed'),
  claimInitiated: () => track('claim_initiated'),
  claimSuccess: () => track('claim_success'),
  claimError: (reason: string) => track('claim_error', { reason }),
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
};
