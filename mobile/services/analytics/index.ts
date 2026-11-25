import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  buildBasePayload,
  createAnalyticsDispatcher,
  type AnalyticsPlatform,
  type AnalyticsEventName,
} from "@bridgelet/analytics";
import env, { isProd } from "../../app/src/config/env";
import { logger } from "../logger";

// Debug-gating note (see mobile/services/logger/index.ts): the shared logger
// sets MIN_LEVEL = isProd ? 'warn' : 'debug', so debug-level output is
// suppressed in production builds. The `[Analytics]` console.log below runs
// only under IS_DEV (__DEV__), so in production there is no local debug trace
// of an event being dispatched — only warn/error logs survive. When an event
// appears missing in production, follow the `investigate-analytics-event-gap.md`
// runbook (in the bridgelet-product-audit runbooks): check the logger level
// gating first, then the Plausible domain/API-host config and the dispatcher's
// warn/error logs, before concluding the event was never emitted. This comment
// is documentation only; it does not change any logging or dispatch behaviour.

// Expo Go reports `appOwnership: "expo"` even for release builds and QA passes,
// so ownership must not decide whether an event is real. Only __DEV__ does.
const IS_DEV = __DEV__;

type NamedEvent<Name extends AnalyticsEventName, Params> = {
  name: Name;
  params: Params;
};

export type AnalyticsEvent =
  | NamedEvent<"Screen Viewed", { screen: string }>
  | NamedEvent<
      "Page Viewed",
      { journey: "shared"; page: string; entry_source: "unknown" }
    >
  | NamedEvent<
      "Claim Page Opened",
      { claim_id: string; entry_channel: string }
    >
  | NamedEvent<
      "Claim Verified",
      {
        claim_id: string;
        asset_type?: string;
        expiry_days_remaining?: number;
        verification_time_ms: number;
      }
    >
  | NamedEvent<"Claim CTA Clicked", { claim_id: string; asset_type?: string }>
  | NamedEvent<
      "Wallet Address Screen Viewed",
      { claim_id: string; has_previous_address: boolean }
    >
  | NamedEvent<
      "Wallet Address Entered",
      { claim_id: string; used_previous_address: boolean }
    >
  | NamedEvent<
      "Wallet Address Validation Failed",
      {
        claim_id?: string;
        validation_error: string;
        attempt_number: number;
      }
    >
  | NamedEvent<
      "Claim Confirmation Viewed",
      { claim_id: string; asset_type?: string }
    >
  | NamedEvent<"Claim Submitted", { claim_id: string; asset_type?: string }>
  | NamedEvent<
      "Claim Succeeded",
      {
        claim_id: string;
        asset_type?: string;
        time_to_claim_hours?: number;
        sweep_duration_ms?: number;
        entry_channel?: string;
      }
    >
  | NamedEvent<
      "Claim Failed",
      {
        claim_id: string;
        asset_type?: string;
        error_code?: string;
        error_type: string;
        attempt_number: number;
      }
    >
  | NamedEvent<"Claim Success Viewed", { claim_id: string; asset_type?: string }>
  | NamedEvent<"Sender Signup CTA Clicked", { claim_id: string }>
  | NamedEvent<
      "Explorer Link Clicked",
      {
        journey: "sender" | "recipient";
        claim_id: string;
        source_screen: string;
      }
    >
  | NamedEvent<
      "Error Displayed",
      {
        journey: "sender" | "recipient" | "shared";
        claim_id?: string | null;
        error_type: string;
        error_code?: string;
        source_screen: string;
      }
    >
  | NamedEvent<
      "Retry Clicked",
      {
        journey: "sender" | "recipient" | "shared";
        claim_id?: string | null;
        error_type: string;
        attempt_number: number;
      }
    >;

const dispatch = createAnalyticsDispatcher<Record<string, unknown>>(
  (name, payload) => {
    if (IS_DEV) {
      console.log("[Analytics]", name, payload);
      return;
    }

    const platform = Platform.OS;
    if (platform !== "web" && platform !== "ios" && platform !== "android") {
      logger.warn(
        "Analytics",
        `Unsupported platform "${platform}"; event "${name}" was not sent.`,
      );
      return;
    }

    const domain = env.plausibleDomain?.trim();
    if (!domain) return;

    const apiHost = (env.plausibleApiHost || "https://plausible.io").replace(/\/+$/, "");
    const requestPayload = {
      name,
      url: `https://${domain}/`,
      domain,
      props: payload,
    };

    void Promise.resolve()
      .then(() =>
        fetch(`${apiHost}/api/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        }),
      )
      .then((response) => {
        if (!response.ok) {
          logger.error(
            "Analytics",
            `Plausible rejected "${name}" with HTTP ${response.status}.`,
          );
        }
      })
      .catch((error: unknown) => {
        logger.error(
          "Analytics",
          `Could not send "${name}" to Plausible.`,
          error,
        );
      });
  },
);

export type AnalyticsJourney = "sender" | "recipient" | "shared";
export type AnalyticsNetwork = "testnet" | "mainnet";

export interface AnalyticsBasePayload {
  anonymous_id: string;
  session_id: string;
  journey: AnalyticsJourney;
  network: AnalyticsNetwork;
  platform: "ios" | "android" | "web";
  timestamp: string;
}

const ANONYMOUS_ID_KEY = "bridgelet_analytics_anonymous_id";

const createId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const sessionId = createId();
let anonymousId: string | null = null;

export function getAnonymousId(): string {
  if (!anonymousId) anonymousId = createId();
  return anonymousId;
}

/** Hydrates the persisted anonymous id. Call once when the app starts. */
export async function initAnalytics(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(ANONYMOUS_ID_KEY);
    if (stored) {
      anonymousId = stored;
      return;
    }
    await AsyncStorage.setItem(ANONYMOUS_ID_KEY, getAnonymousId());
  } catch (error) {
    logger.warn(
      "Analytics",
      "Could not persist the analytics anonymous id.",
      error,
    );
  }
}

const currentPlatform = (): AnalyticsBasePayload["platform"] =>
  Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web"
    ? Platform.OS
    : "web";

const journeyForEvent = (name: string): AnalyticsJourney => {
  if (name.startsWith("Sender")) return "sender";
  if (name.startsWith("Claim") || name.startsWith("Wallet")) return "recipient";
  return "shared";
};

/**
 * Mobile equivalent of `docs/analytics-spec.md` §3.1. Device-only fields
 * (`user_agent`, `referrer`) are dropped; `platform` is always native here.
 */
export function getBasePayload(
  journey: AnalyticsJourney = "shared",
  network: AnalyticsNetwork = "testnet",
): AnalyticsBasePayload {
  return {
    anonymous_id: getAnonymousId(),
    session_id: sessionId,
    journey,
    network,
    platform: currentPlatform(),
    timestamp: new Date().toISOString(),
  };
}

if (isProd && !env.plausibleDomain?.trim()) {
  logger.warn(
    "Analytics",
    "Plausible is not configured; set EXPO_PUBLIC_PLAUSIBLE_DOMAIN to enable production event delivery.",
  );
}

export function track(event: AnalyticsEvent): void {
  const platform: AnalyticsPlatform =
    Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web";

  dispatch(event.name, {
    ...buildBasePayload(platform, {
      app_version: Constants.expoConfig?.version ?? "unknown",
      device_type: platform === "web" ? "desktop" : "mobile",
    }),
    ...getBasePayload(journeyForEvent(event.name)),
    ...event.params,
    platform,
  });
}
