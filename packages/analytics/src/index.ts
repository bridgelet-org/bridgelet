/**
 * @bridgelet/analytics
 * Shared cross-platform analytics contracts, constants, types, and base-payload builders.
 * Corresponds to `docs/analytics-spec.md`.
 */

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

export const ERROR_TYPES = {
  invalid_token: 'invalid_token',
  expired_token: 'expired_token',
  already_claimed: 'already_claimed',
  invalid_wallet_address: 'invalid_wallet_address',
  transaction_failed: 'transaction_failed',
  network_unavailable: 'network_unavailable',
  wallet_connection_failed: 'wallet_connection_failed',
  unknown: 'unknown',
} as const;

export const STANDARD_ERROR_TYPES = Object.values(ERROR_TYPES);

export type ErrorType = keyof typeof ERROR_TYPES;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Platform = 'web' | 'mobile';
export type Journey = 'sender' | 'recipient' | 'shared';
export type AssetType = 'native' | 'usdc';
export type ClaimEntryChannel = 'sms' | 'email' | 'whatsapp' | 'direct' | 'direct_link' | 'qr_code' | 'unknown';
export type ShareChannel = 'copy_only' | 'whatsapp' | 'telegram' | 'sms' | 'email' | 'other';

export interface BasePayload {
  platform: Platform;
  app_version: string;
  device_type: DeviceType;
  timestamp: string;
  anonymous_id: string;
  session_id: string;
  message_id: string;
  locale: string;
  timezone: string;
  screen_width: number;
  screen_height: number;
}

export interface BasePayloadInput {
  platform: Platform;
  appVersion?: string;
  deviceType?: DeviceType;
  anonymousId?: string;
  sessionId?: string;
  messageId?: string;
  locale?: string;
  timezone?: string;
  screenWidth?: number;
  screenHeight?: number;
}

/**
 * UUID v4 generator with fallback.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback if randomUUID fails in restricted contexts
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Constructs a spec-compliant §3.1 Base Payload across web and mobile.
 */
export function createBasePayload(input: BasePayloadInput): BasePayload {
  return {
    platform: input.platform,
    app_version: input.appVersion && input.appVersion.trim().length > 0 ? input.appVersion : 'unknown',
    device_type: input.deviceType ?? 'desktop',
    timestamp: new Date().toISOString(),
    anonymous_id: input.anonymousId ?? generateUUID(),
    session_id: input.sessionId ?? generateUUID(),
    message_id: input.messageId ?? generateUUID(),
    locale: input.locale && input.locale.trim().length > 0 ? input.locale : 'en-US',
    timezone: input.timezone && input.timezone.trim().length > 0 ? input.timezone : 'UTC',
    screen_width: input.screenWidth ?? 0,
    screen_height: input.screenHeight ?? 0,
  };
}

export function isStandardErrorType(value: unknown): value is ErrorType {
  return typeof value === 'string' && (STANDARD_ERROR_TYPES as readonly string[]).includes(value);
}

export function isStandardEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === 'string' && (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value);
}

/**
 * Provider-agnostic analytics transport interface.
 * Providers (e.g. Plausible, PostHog, Segment, Mixpanel) implement this interface.
 */
export interface AnalyticsProvider {
  readonly name: string;
  track(eventName: AnalyticsEventName, payload: Record<string, unknown>): void | Promise<void>;
}

/**
 * In-memory LRU Deduplication Store with TTL (§9.4).
 */
export interface DeduplicationStore {
  isDuplicate(key: string, now?: number): boolean;
  size(): number;
}

export const DEDUP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const DEDUP_MAX_ENTRIES = 1000;

/**
 * Creates a bounded LRU + TTL store for deduplicating analytics events.
 * Eviction policy: entries expire after ttlMs; survivors beyond maxEntries
 * are evicted least-recently-used (a hit refreshes recency).
 */
export function createDeduplicationStore(
  maxEntries: number = DEDUP_MAX_ENTRIES,
  ttlMs: number = DEDUP_TTL_MS
): DeduplicationStore {
  const seen = new Map<string, number>();

  function prune(now: number): void {
    for (const [key, recordedAt] of seen) {
      if (now - recordedAt >= ttlMs) seen.delete(key);
    }
  }

  return {
    isDuplicate(key: string, now: number = Date.now()): boolean {
      prune(now);
      if (seen.has(key)) {
        const recordedAt = seen.get(key)!;
        seen.delete(key);
        seen.set(key, recordedAt);
        return true;
      }
      seen.set(key, now);
      while (seen.size > maxEntries) {
        const oldest = seen.keys().next();
        if (oldest.done) break;
        seen.delete(oldest.value);
      }
      return false;
    },
    size(): number {
      return seen.size;
    },
  };
}

/**
 * Provider-agnostic analytics dispatcher that coordinates providers,
 * attaches base payload metadata, and handles §9.4 event deduplication.
 */
export class AnalyticsDispatcher {
  private providers: AnalyticsProvider[] = [];
  private dedupStore: DeduplicationStore;
  private isDntEnabled: () => boolean;

  constructor(options?: {
    providers?: AnalyticsProvider[];
    dedupStore?: DeduplicationStore;
    isDntEnabled?: () => boolean;
  }) {
    this.providers = options?.providers ? [...options.providers] : [];
    this.dedupStore = options?.dedupStore ?? createDeduplicationStore();
    this.isDntEnabled = options?.isDntEnabled ?? (() => false);
  }

  public registerProvider(provider: AnalyticsProvider): void {
    this.providers.push(provider);
  }

  public getProviders(): readonly AnalyticsProvider[] {
    return this.providers;
  }

  public track(
    eventName: AnalyticsEventName,
    properties: Record<string, unknown>,
    basePayload: BasePayload
  ): boolean {
    if (this.isDntEnabled()) {
      return false; // Suppressed per Do Not Track (§9.5)
    }

    // §9.4 Event Deduplication: exactly "Payment Created" and "Claim Succeeded"
    if (eventName === 'Payment Created' || eventName === 'Claim Succeeded') {
      const claimId = properties.claim_id;
      if (typeof claimId === 'string' && claimId.trim().length > 0) {
        const dedupKey = `${eventName}:${claimId.trim()}`;
        if (this.dedupStore.isDuplicate(dedupKey)) {
          return false; // Suppress duplicate emission
        }
      }
    }

    const mergedPayload = {
      ...basePayload,
      ...properties,
      event_name: eventName,
    };

    for (const provider of this.providers) {
      try {
        provider.track(eventName, mergedPayload);
      } catch (err) {
        // Provider failure should never crash the host application
        console.warn(`[AnalyticsDispatcher] Provider "${provider.name}" failed to track "${eventName}":`, err);
      }
    }

    return true;
  }
}
