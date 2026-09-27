import Constants from "expo-constants";
import { Platform } from "react-native";

const IS_DEV = Constants.appOwnership === "expo" || __DEV__;

type AnalyticsPlatform = "ios" | "android";

function getAnalyticsPlatform(): AnalyticsPlatform {
  return Platform.OS === "android" ? "android" : "ios";
}

// Event names must match `docs/analytics-spec.md` `#### \`Event Name\`` headings exactly.
export type AnalyticsEvent =
  | { name: "Page Viewed"; params: { page: string; journey?: "sender" | "recipient" | "shared" } }
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

export function track(event: AnalyticsEvent): void {
  const payload = {
    ...event.params,
    platform: getAnalyticsPlatform(),
  };

  if (IS_DEV) {
    console.log("[Analytics]", event.name, payload);
  }

  const posthog = (globalThis as typeof globalThis & { posthog?: { capture?: (name: string, properties: Record<string, unknown>) => void } }).posthog;
  if (typeof posthog?.capture === "function") {
    posthog.capture(event.name, payload);
    return;
  }

  const segment = (globalThis as typeof globalThis & { analytics?: { track?: (name: string, properties?: Record<string, unknown>) => void } }).analytics;
  if (typeof segment?.track === "function") {
    segment.track(event.name, payload);
  }
}