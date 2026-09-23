// #118 – Privacy-respecting analytics events (Plausible-compatible, no PII)
type ClaimEvent =
  | 'claim_page_viewed'
  | 'claim_initiated'
  | 'claim_success'
  | 'claim_error'
  | 'Send Form Completed'
  | 'Payment Confirmation Viewed';

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
};
