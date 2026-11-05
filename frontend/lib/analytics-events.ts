// #890 – Single source-of-truth TypeScript union for all 34 spec event names
// generated and synced with `docs/analytics-spec.md` (§4–§6).

/**
 * Canonical list of all 34 analytics event names defined in `docs/analytics-spec.md` (§4–§6).
 *
 * This tuple acts as the single source of truth across the frontend, ensuring
 * the type system and the analytics specification cannot silently diverge.
 */
export const ANALYTICS_SPEC_EVENT_NAMES = [
  // §4. Sender Journey Events (19 events)
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

  // §5. Recipient Journey Events (13 events)
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

  // §6. Error & Edge Case Events (2 events)
  'Error Displayed',
  'Retry Clicked',
] as const;

/**
 * Union type of all 34 event name strings from `docs/analytics-spec.md` §4–§6.
 */
export type AnalyticsEventName = (typeof ANALYTICS_SPEC_EVENT_NAMES)[number];

/**
 * Total number of events specified in the analytics spec catalog.
 */
export const TOTAL_SPEC_EVENT_COUNT = ANALYTICS_SPEC_EVENT_NAMES.length; // 34

/**
 * Type guard asserting whether a given string is a valid spec event name.
 */
export function isAnalyticsEventName(event: string): event is AnalyticsEventName {
  return (ANALYTICS_SPEC_EVENT_NAMES as readonly string[]).includes(event);
}
