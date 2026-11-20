import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  buildBasePayload,
  createAnalyticsDispatcher,
  type AnalyticsPlatform,
  type AnalyticsEventName,
} from "@bridgelet/analytics";
import env, { isProd } from "../../app/src/config/env";
import { logger } from "../logger";

const IS_DEV = Constants.appOwnership === "expo" || __DEV__;

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
    ...event.params,
    platform,
  });
}
