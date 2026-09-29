export const ANALYTICS_EVENT_NAMES = {
  pageViewed: 'Page Viewed',
  sendFormViewed: 'Send Form Viewed',
  sendFormStarted: 'Send Form Started',
  sendFormFieldChanged: 'Send Form Field Changed',
  sendFormCompleted: 'Send Form Completed',
  paymentConfirmationViewed: 'Payment Confirmation Viewed',
  walletConnected: 'Wallet Connected',
  walletConnectionFailed: 'Wallet Connection Failed',
  paymentConfirmed: 'Payment Confirmed',
  paymentCreated: 'Payment Created',
  paymentCreationFailed: 'Payment Creation Failed',
  paymentSuccessViewed: 'Payment Success Viewed',
  claimLinkCopied: 'Claim Link Copied',
  claimLinkShared: 'Claim Link Shared',
  dashboardViewed: 'Dashboard Viewed',
  dashboardFilterApplied: 'Dashboard Filter Applied',
  paymentDetailsViewed: 'Payment Details Viewed',
  paymentCancelled: 'Payment Cancelled',
  fundsReclaimed: 'Funds Reclaimed',
  claimPageOpened: 'Claim Page Opened',
  claimVerified: 'Claim Verified',
  claimCtaClicked: 'Claim CTA Clicked',
  walletAddressScreenViewed: 'Wallet Address Screen Viewed',
  walletAddressEntered: 'Wallet Address Entered',
  walletAddressValidationFailed: 'Wallet Address Validation Failed',
  claimConfirmationViewed: 'Claim Confirmation Viewed',
  claimSubmitted: 'Claim Submitted',
  claimSucceeded: 'Claim Succeeded',
  claimFailed: 'Claim Failed',
  claimSuccessViewed: 'Claim Success Viewed',
  senderSignupCtaClicked: 'Sender Signup CTA Clicked',
  explorerLinkClicked: 'Explorer Link Clicked',
  errorDisplayed: 'Error Displayed',
  retryClicked: 'Retry Clicked',
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENT_NAMES)[keyof typeof ANALYTICS_EVENT_NAMES];

export const JOURNEY = {
  sender: 'sender',
  recipient: 'recipient',
  shared: 'shared',
} as const;

export type Journey = (typeof JOURNEY)[keyof typeof JOURNEY];
export type AnalyticsPlatform = 'web' | 'mobile';
export type AnalyticsBasePayload = Record<string, string | number | boolean | null>;

export function buildBasePayload(options: {
  platform: AnalyticsPlatform;
  appVersion?: string;
  userAgent?: string;
  deviceType?: string;
  referrer?: string | null;
}): AnalyticsBasePayload {
  return {
    app_version: options.appVersion ?? 'unknown',
    user_agent: options.userAgent ?? '',
    device_type: options.deviceType ?? 'desktop',
    referrer: options.referrer ?? null,
    platform: options.platform,
  };
}

export function dispatchAnalyticsEvent(
  dispatcher: ((eventName: string, payload: AnalyticsBasePayload) => void) | undefined,
  eventName: string,
  payload: AnalyticsBasePayload,
): void {
  dispatcher?.(eventName, payload);
}
