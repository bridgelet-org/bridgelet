import Constants from "expo-constants";

const IS_DEV = Constants.appOwnership === "expo" || __DEV__;

// Event names must match `docs/analytics-spec.md` `#### \`Event Name\`` headings exactly.
export type AnalyticsEvent =
  | { name: "Payment Creation Failed"; params: { journey: "sender"; asset_type?: string; error_code?: string } }
  | { name: "Claim Page Opened"; params: { claim_id: string; entry_channel: string } }
  | { name: "Claim Verified"; params: { claim_id: string; asset_type?: string; expiry_days_remaining?: number; verification_time_ms: number } }
  | { name: "Claim CTA Clicked"; params: { claim_id: string; asset_type?: string } }
  | { name: "Wallet Address Screen Viewed"; params: { claim_id: string; has_previous_address: boolean } }
  | { name: "Wallet Address Entered"; params: { claim_id: string; used_previous_address: boolean } }
  | { name: "Wallet Address Validation Failed"; params: { claim_id?: string; validation_error: string; attempt_number: number } }
  | { name: "Claim Confirmation Viewed"; params: { claim_id: string; asset_type?: string } }
  | { name: "Claim Submitted"; params: { claim_id: string; asset_type?: string } }
  | { name: "Claim Succeeded"; params: { claim_id: string; asset_type?: string; time_to_claim_hours?: number; sweep_duration_ms?: number; entry_channel?: string } }
  | { name: "Claim Failed"; params: { claim_id: string; asset_type?: string; error_code?: string; error_type: string; attempt_number: number } }
  | { name: "Claim Success Viewed"; params: { claim_id: string; asset_type?: string } }
  | { name: "Sender Signup CTA Clicked"; params: { claim_id: string } }
  | { name: "Explorer Link Clicked"; params: { journey: "sender" | "recipient"; claim_id: string; source_screen: string } }
  | { name: "Error Displayed"; params: { journey: "sender" | "recipient" | "shared"; claim_id?: string | null; error_type: string; error_code?: string; source_screen: string } }
  | { name: "Retry Clicked"; params: { journey: "sender" | "recipient" | "shared"; claim_id?: string | null; error_type: string; attempt_number: number } };

const ANALYTICS_ENDPOINT = process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT;

export function track(event: AnalyticsEvent): void {
  if (IS_DEV) {
    console.log("[Analytics]", event.name, "params" in event ? event.params : "");
    return;
  }

  // Production dispatch sink: dispatches to EXPO_PUBLIC_ANALYTICS_ENDPOINT or warns if unconfigured
  if (ANALYTICS_ENDPOINT) {
    try {
      fetch(ANALYTICS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: event.name,
          platform: "mobile",
          timestamp: new Date().toISOString(),
          params: "params" in event ? event.params : {},
        }),
      }).catch((err) => {
        if (__DEV__) console.warn("[Analytics] Dispatch failed:", err);
      });
    } catch {
      // Production tracking failures must never crash or interrupt app flow
    }
  } else {
    console.warn("[Analytics] Production event dispatched with no EXPO_PUBLIC_ANALYTICS_ENDPOINT configured:", event.name);
  }
}