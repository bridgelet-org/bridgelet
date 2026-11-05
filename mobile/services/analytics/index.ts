import Constants from "expo-constants";
import { isProd } from "../../app/src/config/env";
import { logger } from "../logger";

const IS_DEV = !isProd && (Constants.appOwnership === "expo" || __DEV__);

// Event names must match `docs/analytics-spec.md` `#### \`Event Name\`` headings exactly.
export type AnalyticsEvent =
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

export interface AnalyticsProvider {
  track(event: AnalyticsEvent): void | Promise<void>;
}

let activeProvider: AnalyticsProvider | null = null;

export function registerAnalyticsProvider(provider: AnalyticsProvider): void {
  activeProvider = provider;
}

export function track(event: AnalyticsEvent): void {
  if (IS_DEV) {
    logger.debug("Analytics", `[${event.name}]`, "params" in event ? event.params : {});
    return;
  }

  if (activeProvider) {
    try {
      activeProvider.track(event);
    } catch (err) {
      logger.error("Analytics", `Failed to dispatch event ${event.name}`, err);
    }
    return;
  }

  // Plug in production analytics provider here (e.g. Segment, Amplitude, PostHog)
}

export const analytics = {
  track,
  registerAnalyticsProvider,
};

export default analytics;
