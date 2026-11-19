export const ANALYTICS_EVENT_NAMES = [
  'Page Viewed',
  'Send Form Viewed',
  'Send Form Started',
  'Send Form Field Changed',
  'Send Form Completed',
  'Payment Confirmation Viewed',
  'Wallet Connected',
  'Wallet Connection Failed',
  'Payment Confirmed',
  'Payment Created',
  'Payment Creation Failed',
  'Payment Success Viewed',
  'Claim Link Copied',
  'Claim Link Shared',
  'Dashboard Viewed',
  'Dashboard Filter Applied',
  'Payment Details Viewed',
  'Payment Cancelled',
  'Funds Reclaimed',
  'Claim Page Opened',
  'Claim Verified',
  'Claim CTA Clicked',
  'Wallet Address Screen Viewed',
  'Wallet Address Entered',
  'Wallet Address Validation Failed',
  'Claim Confirmation Viewed',
  'Claim Submitted',
  'Claim Succeeded',
  'Claim Failed',
  'Claim Success Viewed',
  'Sender Signup CTA Clicked',
  'Explorer Link Clicked',
  'Error Displayed',
  'Retry Clicked',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];
export type AnalyticsPlatform = 'web' | 'ios' | 'android';
export type AnalyticsDeviceType = 'mobile' | 'tablet' | 'desktop';

export interface AnalyticsBasePayload {
  app_version: string;
  user_agent: string;
  device_type: AnalyticsDeviceType;
  referrer: string | null;
  platform: AnalyticsPlatform;
}

export type AnalyticsBasePayloadFields = Partial<
  Omit<AnalyticsBasePayload, 'platform'>
>;

export function buildBasePayload(
  platform: AnalyticsPlatform,
  fields: AnalyticsBasePayloadFields = {},
): AnalyticsBasePayload {
  return {
    app_version: fields.app_version ?? 'unknown',
    user_agent: fields.user_agent ?? '',
    device_type: fields.device_type ?? 'desktop',
    referrer: fields.referrer ?? null,
    platform,
  };
}

export function createAnalyticsDispatcher<Payload>(
  provider: (eventName: AnalyticsEventName, payload: Payload) => void,
): (eventName: AnalyticsEventName, payload: Payload) => void {
  return (eventName, payload) => provider(eventName, payload);
}
