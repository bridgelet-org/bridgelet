import { Platform } from "react-native";

const IS_DEV = __DEV__;

export type AnalyticsPlatform = "ios" | "android" | "web";
export type AnalyticsJourney = "sender" | "recipient" | "shared";
export type AnalyticsNetwork = "testnet" | "mainnet";

export type AnalyticsBaseParams = {
  anonymous_id?: string;
  session_id?: string;
  journey?: AnalyticsJourney;
  network?: AnalyticsNetwork;
  platform?: AnalyticsPlatform;
  timestamp?: string;
};

// Event names must match `docs/analytics-spec.md` `#### \`Event Name\`` headings exactly.
export type AnalyticsEvent =
  | { name: "Page Viewed"; params: AnalyticsBaseParams & { page: string; journey?: AnalyticsJourney; entry_source?: string } }
  | { name: "Claim Page Opened"; params: AnalyticsBaseParams & { claim_id: string; entry_channel: string } }
  | { name: "Claim Verified"; params: AnalyticsBaseParams & { claim_id: string; asset_type?: string; expiry_days_remaining?: number; verification_time_ms: number } }
  | { name: "Claim CTA Clicked"; params: AnalyticsBaseParams & { claim_id: string; asset_type?: string } }
  | { name: "Wallet Address Screen Viewed"; params: AnalyticsBaseParams & { claim_id: string; has_previous_address: boolean } }
  | { name: "Wallet Address Entered"; params: AnalyticsBaseParams & { claim_id: string; used_previous_address: boolean } }
  | { name: "Wallet Address Validation Failed"; params: AnalyticsBaseParams & { claim_id?: string; validation_error: string; attempt_number: number } }
  | { name: "Claim Confirmation Viewed"; params: AnalyticsBaseParams & { claim_id: string; asset_type?: string } }
  | { name: "Claim Submitted"; params: AnalyticsBaseParams & { claim_id: string; asset_type?: string } }
  | { name: "Claim Succeeded"; params: AnalyticsBaseParams & { claim_id: string; asset_type?: string; time_to_claim_hours?: number; sweep_duration_ms?: number; entry_channel?: string } }
  | { name: "Claim Failed"; params: AnalyticsBaseParams & { claim_id: string; asset_type?: string; error_code?: string; error_type: string; attempt_number: number } }
  | { name: "Claim Success Viewed"; params: AnalyticsBaseParams & { claim_id: string; asset_type?: string } }
  | { name: "Sender Signup CTA Clicked"; params: AnalyticsBaseParams & { claim_id: string } }
  | { name: "Explorer Link Clicked"; params: AnalyticsBaseParams & { journey: "sender" | "recipient"; claim_id: string; source_screen: string } }
  | { name: "Error Displayed"; params: AnalyticsBaseParams & { journey: "sender" | "recipient" | "shared"; claim_id?: string | null; error_type: string; error_code?: string; source_screen: string } }
  | { name: "Retry Clicked"; params: AnalyticsBaseParams & { journey: "sender" | "recipient" | "shared"; claim_id?: string | null; error_type: string; attempt_number: number } };

type GlobalAnalytics = typeof globalThis & {
  posthog?: { capture?: (eventName: string, payload: Record<string, unknown>) => void };
  analytics?: { track?: (eventName: string, payload: Record<string, unknown>) => void };
};

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

const analyticsState = {
  anonymousId: generateUUID(),
  sessionId: generateUUID(),
};

function getPlatform(): AnalyticsPlatform {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

function buildPayload(event: AnalyticsEvent): Record<string, unknown> {
  const { params } = event;
  return {
    anonymous_id: analyticsState.anonymousId,
    session_id: analyticsState.sessionId,
    network: (process.env.EXPO_PUBLIC_NETWORK ?? "testnet") as AnalyticsNetwork,
    platform: getPlatform(),
    timestamp: new Date().toISOString(),
    ...params,
  };
}

export function track(event: AnalyticsEvent): void {
  const payload = buildPayload(event);
  const target = globalThis as GlobalAnalytics;

  if (typeof target.posthog?.capture === "function") {
    target.posthog.capture(event.name, payload);
    return;
  }

  if (typeof target.analytics?.track === "function") {
    target.analytics.track(event.name, payload);
    return;
  }

  if (IS_DEV) {
    console.log("[Analytics]", event.name, payload);
    return;
  }

  console.warn("[Analytics] No provider registered for event:", event.name, payload);
}