// #118 – Privacy-respecting analytics events (Plausible-compatible, no PII)
type ClaimEvent =
  | 'claim_page_viewed'
  | 'claim_initiated'
  | 'claim_success'
  | 'claim_error'
  | 'Error Displayed'
  | 'Send Form Completed'
  | 'Payment Confirmation Viewed'
  | 'Payment Confirmed'
  | 'Payment Created'
  | 'Claim Link Copied'
  | 'Claim Link Shared'
  | 'Claim Page Opened'
  | 'Payment Details Viewed'
  | 'Page Viewed'
  | 'Send Form Viewed'
  | 'Claim Verified'
  | 'Claim CTA Clicked'
  | 'Retry Clicked'
  | 'Claim Failed'
  | 'Claim Success Viewed'
  | 'Sender Signup CTA Clicked'
  | 'Explorer Link Clicked'
  | 'Wallet Address Validation Failed'
  | 'Claim Confirmation Viewed'
  | 'Claim Submitted'
  | 'Claim Succeeded';

type EventProps = Record<string, string | number | boolean | null>;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * App version correlated to a deploy (`docs/analytics-spec.md` §3.1
 * `app_version`). Inlined at build time from NEXT_PUBLIC_APP_VERSION so
 * dashboards can attribute event volume to a release. Falls back to
 * "unknown" rather than emitting an empty string.
 */
export function appVersion(): string {
  const version = process.env.NEXT_PUBLIC_APP_VERSION;
  return version && version.trim().length > 0 ? version : 'unknown';
}

/**
 * Classifies `mobile | tablet | desktop` from a user agent
 * (`docs/analytics-spec.md` §3.1 `device_type`). Accepts an explicit UA
 * string for testability; defaults to the runtime navigator user agent.
 * Desktop is the conservative default when no signal matches.
 */
export function detectDeviceType(userAgent?: string): DeviceType {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (/(tablet|ipad)/i.test(ua)) return 'tablet';
  if (/(mobile|iphone|ipod|android)/i.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Base payload fields (`docs/analytics-spec.md` §3.1) shared by every
 * event: `app_version`, `user_agent`, `device_type`, `referrer`, and the
 * fixed frontend `platform` value "web". Each field degrades gracefully
 * when the browser API it depends on is unavailable (SSR, unit tests
 * without a DOM).
 */
export function buildBasePayload(): EventProps {
  return {
    app_version: appVersion(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    device_type: detectDeviceType(),
    referrer: typeof document !== 'undefined' && document.referrer ? document.referrer : null,
    platform: 'web',
  };
}

// ─── §3.1 Base Payload Identity fields ───────────────────────────────────────

const ANONYMOUS_ID_KEY = 'bridgelet_anonymous_id';
const SESSION_ID_KEY = 'bridgelet_session_id';

/**
 * Generates a cryptographically-random UUID v4.
 * Falls back to a Math.random-based UUID when `crypto.randomUUID` is
 * unavailable (very old browsers, some SSR contexts).
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC-4122 §4.4 v4 UUID, fallback.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns the persistent `anonymous_id` for this browser.
 * Generated once and stored in `localStorage`; survives browser restarts.
 * Returns an empty string in SSR or when storage is unavailable.
 */
export function getAnonymousId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(ANONYMOUS_ID_KEY, id);
    }
    return id;
  } catch {
    // localStorage blocked (private mode strict setting, quota exceeded, etc.)
    return '';
  }
}

/**
 * Returns the session-scoped `session_id` for this browser tab/visit.
 * Generated once per session and stored in `sessionStorage`; reset when
 * the tab or browser session ends.
 * Returns an empty string in SSR or when storage is unavailable.
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = generateUUID();
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    // sessionStorage unavailable.
    return '';
  }
}

// ─── §6 Error taxonomy ────────────────────────────────────────────────────────

/**
 * All eight §6 `error_type` values, exported so every `Error Displayed`
 * emitter uses the exact spec string rather than an ad-hoc literal.
 */
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

export type ErrorType = keyof typeof ERROR_TYPES;

// ─── §9.5 Do Not Track ─────────────────────────────────────────────────────────

/**
 * Interprets a single Do Not Track signal. §9.5 names `1` as the opt-in
 * value; browsers report `navigator.doNotTrack` and legacy IE's
 * `navigator.msDoNotTrack` as the strings `"1"` / `"0"`, or `null` when the
 * user expressed no preference. A numeric `1` is also accepted because a
 * few privacy extensions assign a number rather than a string. Everything
 * else — `"0"`, `"unspecified"`, `""`, `null`, non-string junk — means the
 * user did not opt out, so the event is allowed.
 */
function isDntSignalEnabled(value: unknown): boolean {
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return value.trim() === '1';
  return false;
}

/**
 * Browser-level Do Not Track opt-out (`docs/analytics-spec.md` §9.5).
 *
 * When the browser reports `DNT: 1` the event is suppressed entirely — not
 * reduced, not anonymised further, just dropped. This matters most in the
 * recipient flow, where someone opening a claim link may have no prior
 * relationship with Bridgelet and never asked to be measured.
 *
 * Sources are checked in order: `navigator.doNotTrack` (the standard),
 * `navigator.msDoNotTrack` (legacy IE), and `window.doNotTrack` (a handful
 * of extensions set it there rather than on `navigator`). Every read is
 * feature-detected and wrapped in try/catch: these are vendor-prefixed
 * properties on objects that can be frozen, proxied or simply absent, and a
 * throw here must never break the page. A throw is reported as "not opted
 * out", which is the layer's pre-#635 behaviour.
 *
 * This function deliberately touches no storage. `track()` calls it *before*
 * `getAnonymousId()` / `getSessionId()` so that a visitor who opted out
 * never has a UUID minted and persisted on their behalf — writing an
 * identifier to `localStorage` is itself a durable tracking artefact, so
 * checking later would be too late.
 *
 * @returns `true` when the browser asks not to be tracked; `false` during
 * SSR, where there is no browser to ask.
 */
export function isDoNotTrackEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const nav: (Navigator & { msDoNotTrack?: unknown }) | undefined =
      typeof navigator === 'undefined' ? undefined : navigator;
    return (
      isDntSignalEnabled(nav?.doNotTrack) ||
      isDntSignalEnabled(nav?.msDoNotTrack) ||
      isDntSignalEnabled((window as unknown as { doNotTrack?: unknown }).doNotTrack)
    );
  } catch {
    // Vendor-prefixed property access threw (frozen/proxied navigator).
    return false;
  }
}

// ─── §9.4 Event deduplication ──────────────────────────────────────────────────

/**
 * The only two events §9.4 requires to be idempotent on `claim_id`:
 * `Payment Created` (sender) and `Claim Succeeded` (recipient). Every other
 * event is deliberately left un-deduplicated — a second `Page Viewed` in the
 * same tick, or a recipient copying the claim link twice, are distinct real
 * interactions that must all be counted.
 *
 * **The double-click case is not covered here.** The originating issue also
 * asks about `Payment Confirmed` firing twice when a sender double-clicks
 * "Confirm & Send". That event carries no `claim_id`: it fires *before* the
 * ephemeral account exists, so there is nothing stable to key on, and a
 * generic "same event twice within N ms" rule would silently swallow
 * legitimate repeats (two `Page Viewed` events in one tick, a user
 * retrying a copy). That guard belongs in the UI — `ConfirmStep` already
 * disables its button via `submitting` — so this layer leaves
 * `Payment Confirmed` un-deduplicated and the gap is recorded as a UI one.
 */
export const DEDUPLICATED_EVENTS = ['Payment Created', 'Claim Succeeded'] as const;

export type DeduplicatedEvent = (typeof DEDUPLICATED_EVENTS)[number];

/** Narrows an event name to the two §9.4 deduplication candidates. */
function isDeduplicatedEvent(event: ClaimEvent): event is DeduplicatedEvent {
  return (DEDUPLICATED_EVENTS as readonly ClaimEvent[]).includes(event);
}

/**
 * Upper bound on retained dedup keys. The store is a per-tab in-memory Map
 * in a long-lived SPA, so an unbounded Set would leak for the life of the
 * tab. 200 keys is several orders of magnitude more than any realistic
 * burst (a sender session creates a handful of claims) and costs a few tens
 * of kilobytes in the worst case, so the cap should never be the thing that
 * lets a duplicate through in practice.
 */
export const DEDUP_MAX_ENTRIES = 200;

/**
 * How long a `claim_id` counts as "already sent" for a §9.4 event. A
 * duplicate always arrives within a render cycle or a network retry — both
 * are seconds — so one hour is generous, while short enough that the Map
 * reclaims its entries during normal use. The TTL is a safety valve against
 * over-suppression (a genuinely distinct second `Claim Succeeded` for a
 * partially-swept claim), not the primary mechanism.
 */
export const DEDUP_TTL_MS = 60 * 60 * 1000;

/**
 * Bounded, self-expiring key store. Expiry is evaluated lazily on access
 * rather than on a timer, so an analytics helper never schedules background
 * work in the page.
 */
export interface DeduplicationStore {
  /** `true` when `key` was already recorded within the TTL window. */
  isDuplicate(key: string, now?: number): boolean;
  /** Keys currently retained. Exposed for diagnostics and tests. */
  size(): number;
}

/**
 * Creates a bounded LRU + TTL store for deduplicating analytics events.
 *
 * Eviction policy: entries expire after `ttlMs`; survivors beyond
 * `maxEntries` are evicted least-recently-used (a hit refreshes recency).
 * The Map is the bound — there is no persistent backing store.
 */
export function createDeduplicationStore(
  maxEntries: number = DEDUP_MAX_ENTRIES,
  ttlMs: number = DEDUP_TTL_MS,
): DeduplicationStore {
  const seen = new Map<string, number>();

  function prune(now: number): void {
    for (const [key, recordedAt] of seen) {
      if (now - recordedAt >= ttlMs) seen.delete(key);
    }
  }

  return {
    isDuplicate(key, now = Date.now()) {
      prune(now);
      if (seen.has(key)) {
        // Refresh recency so a hot claim is not evicted by the cap while
        // older idle claims are.
        seen.delete(key);
        seen.set(key, now);
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
    size() {
      return seen.size;
    },
  };
}

/**
 * The single §9.4 store used by `track()`.
 *
 * **Honest limitations.** This reduces double-counting; it does not
 * eliminate it. Being in-memory and per-tab, it cannot see a retry that
 * arrives from a different process, in a second tab, or after a page
 * reload — the real guarantee has to come from the pipeline deduplicating on
 * the `message_id` / `claim_id` this module now attaches to every payload.
 * The store is deliberately not persisted to `localStorage`:
 * `claim_id` values identify a payment, and writing them durably would
 * create cross-session state in a layer whose contract is "no PII".
 */
const claimEventDedupStore = createDeduplicationStore();

/**
 * `true` when this §9.4 event for this `claim_id` was already dispatched
 * inside the TTL window and must therefore be dropped. Returns `false` for
 * every other event, and for a §9.4 event with no usable `claim_id` — an
 * event without a key is never deduped, because guessing would risk
 * suppressing a distinct event.
 */
function isDuplicateClaimEvent(event: ClaimEvent, claimId: unknown): boolean {
  if (!isDeduplicatedEvent(event)) return false;
  if (typeof claimId !== 'string' || claimId === '') return false;
  return claimEventDedupStore.isDuplicate(`${event}::${claimId}`);
}

// ─── track() ──────────────────────────────────────────────────────────────────

/**
 * Core dispatch function. Merges the §3.1 identity fields (`anonymous_id`,
 * `session_id`) into every event payload so every downstream event carries
 * them without any per-call plumbing.
 *
 * This is the only place an event reaches the provider, so both opt-out
 * (§9.5) and deduplication (§9.4) are enforced here rather than at call
 * sites — no emitter can forget them.
 *
 * Dispatch targets, in priority order:
 * 1. `window.plausible` — populated by the Plausible script loaded in the
 *    root layout when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is configured (§9.1).
 * 2. `window.posthog` — capture fallback when PostHog is wired up instead.
 * 3. Console debug output in development builds.
 */
function track(event: ClaimEvent, props?: EventProps): void {
  if (typeof window === 'undefined') return;

  // #635 (§9.5) — first, before any payload is built. `getAnonymousId()`
  // and `getSessionId()` below *persist* a UUID to localStorage/
  // sessionStorage; minting one for a visitor who asked not to be tracked
  // would itself be a privacy violation, so suppression has to happen
  // before identifier generation, not just before the provider call.
  if (isDoNotTrackEnabled()) return;

  // #634 (§9.4) — second, so a suppressed duplicate also avoids burning a
  // `message_id`.
  if (isDuplicateClaimEvent(event, props?.claim_id)) return;

  // Base payload is merged in first so event-specific props can override.
  const payload: EventProps = {
    ...buildBasePayload(),
    anonymous_id: getAnonymousId(),
    session_id: getSessionId(),
    ...props,
    // §9.4: a per-event UUID for the analytics pipeline to deduplicate on.
    // Applied after `...props` so no call site can override or blank it.
    message_id: generateUUID(),
  };

  // Plausible custom event API
  const plausible = (window as unknown as { plausible?: Function }).plausible;
  if (typeof plausible === 'function') {
    plausible(event, { props: payload });
    return;
  }

  // PostHog capture fallback (§9.1 self-hosted option).
  const posthog = (window as unknown as { posthog?: { capture?: Function } }).posthog;
  if (typeof posthog?.capture === 'function') {
    posthog.capture(event, payload);
    return;
  }

  // Fallback: console in development
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics]', event, payload);
  }
}

/**
 * Reads the `Do Not Track` browser preference (§9.5). Accepts an explicit
 * header value for testability; checks `navigator.doNotTrack`,
 * `window.doNotTrack`, and the legacy `msDoNotTrack` prefixes.
 */
export function isDntEnabled(header?: string): boolean {
  if (header === '1') return true;
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { msDoNotTrack?: string };
  const win = typeof window !== 'undefined' ? (window as unknown as { doNotTrack?: string }) : {};
  const raw = nav.doNotTrack ?? win.doNotTrack ?? nav.msDoNotTrack ?? '0';
  return raw === '1' || raw === 'yes';
}

export type ShareMethod = 'sms' | 'email' | 'whatsapp' | 'qr_code';

export type EntrySource = 'direct' | 'referral' | 'shared_link' | 'unknown';

export type ClaimEntryChannel = 'sms' | 'email' | 'whatsapp' | 'direct' | 'unknown';

export type PaymentClaimStatus = 'unclaimed' | 'claimed' | 'expired';

/**
 * Conditional payload properties (`docs/analytics-spec.md` §3.2) are
 * included only on the events where they are relevant. Each helper below
 * returns the exact property key the spec expects, so event handlers can
 * spread the fields they need without re-typing the snake_case names.
 */

/** Allowed `expiry_days` windows: `1`, `7`, `30`, `90`, or `null` (never). */
export const VALID_EXPIRY_WINDOWS = [1, 7, 30, 90] as const;

export type ExpiryDays = (typeof VALID_EXPIRY_WINDOWS)[number] | null;

export const conditional = {
  claimId: (claimId: string): EventProps => ({ claim_id: claimId }),
  assetType: (assetType: string): EventProps => ({ asset_type: assetType }),
  amountUsdEquiv: (amountUsdEquiv: number): EventProps => ({
    amount_usd_equiv: amountUsdEquiv,
  }),
  expiryDays: (expiryDays: ExpiryDays): EventProps => ({ expiry_days: expiryDays }),
  errorType: (errorType: ErrorType): EventProps => ({ error_type: errorType }),
  errorCode: (errorCode: string): EventProps => ({ error_code: errorCode }),
};

interface ClaimVerifiedProps {
  claimId: string;
  assetType?: string;
  expiryDaysRemaining?: number;
  verificationTimeMs: number;
}

interface ClaimCtaClickedProps {
  claimId: string;
  assetType?: string;
}

interface ErrorDisplayedProps {
  journey: 'sender' | 'recipient' | 'shared';
  /** Claim ID if available; omitted otherwise. */
  claimId?: string | null;
  errorType: ErrorType;
  /** Machine-readable error identifier; defaults to 'unknown'. */
  errorCode?: string;
  /** Screen where the error appeared. */
  sourceScreen: string;
}

interface RetryClickedProps {
  journey: 'sender' | 'recipient' | 'shared';
  /** Claim ID if available; omitted otherwise. */
  claimId?: string | null;
  /** Error type that triggered the retry prompt. */
  errorType: ErrorType;
  /** Which retry attempt this is (1-based). */
  attemptNumber: number;
}

/**
 * §5.3 `Claim Failed` error type taxonomy.
 * Matches the spec-defined values exactly.
 */
export type ClaimFailedErrorType =
  | 'network_error'
  | 'token_expired'
  | 'already_claimed'
  | 'transaction_failed'
  | 'unknown';

/** All valid §5.3 Claim Failed error_type values. */
export const CLAIM_FAILED_ERROR_TYPES: Record<ClaimFailedErrorType, ClaimFailedErrorType> = {
  network_error: 'network_error',
  token_expired: 'token_expired',
  already_claimed: 'already_claimed',
  transaction_failed: 'transaction_failed',
  unknown: 'unknown',
} as const;

interface ClaimFailedProps {
  claimId: string;
  assetType?: string;
  /** Stellar error code or 'unknown'. */
  errorCode?: string;
  /** §5.3 error_type taxonomy value. */
  errorType: ClaimFailedErrorType;
  /** How many times the recipient has tried on this claim. */
  attemptNumber: number;
}

interface ClaimSuccessViewedProps {
  claimId: string;
  assetType?: string;
}

interface SenderSignupCtaClickedProps {
  claimId: string;
}

/** §5.4/§6 source_screen values for Explorer Link Clicked. */
export type ExplorerSourceScreen = 'claim_success' | 'payment_details';

/** §2.3 journey values for Explorer Link Clicked. */
export type ExplorerJourney = 'sender' | 'recipient';

interface ExplorerLinkClickedProps {
  journey: ExplorerJourney;
  claimId: string;
  sourceScreen: ExplorerSourceScreen;
}

/** Client-side address-validation failure reasons (`docs/analytics-spec.md` §5.2). */
export type ValidationError = 'invalid_prefix' | 'invalid_length' | 'invalid_checksum';

interface WalletAddressValidationFailedProps {
  claimId?: string;
  validationError: ValidationError;
  attemptNumber: number;
}

interface ClaimSucceededProps {
  claimId: string;
  assetType?: string;
  /** Hours between `Payment Created` (sender) and `Claim Succeeded` (recipient). */
  timeToClaimHours?: number;
  /** Time in ms from `Claim Submitted` to on-chain confirmation. */
  sweepDurationMs?: number;
  entryChannel?: string;
}

export function daysRemainingUntil(iso: string): number | undefined {
  const expiresAt = Date.parse(iso);
  if (Number.isNaN(expiresAt)) return undefined;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000));
}

// ─── Public analytics surface ─────────────────────────────────────────────────

export const analytics = {
  claimPageViewed: () => track('claim_page_viewed'),
  claimInitiated: () => track('claim_initiated'),
  claimSuccess: () => track('claim_success'),
  claimError: (reason: string) => track('claim_error', { reason }),
  sendFormCompleted: ({
    assetType,
    expiryDays,
    hasRecipientName,
    hasMessage,
  }: {
    assetType?: string;
    expiryDays?: number | null;
    hasRecipientName: boolean;
    hasMessage: boolean;
  }) =>
    track('Send Form Completed', {
      journey: 'sender',
      ...(assetType ? { asset_type: assetType } : {}),
      ...(expiryDays != null ? { expiry_days: expiryDays } : {}),
      has_recipient_name: hasRecipientName,
      has_message: hasMessage,
    }),
  paymentConfirmationViewed: ({
    assetType,
    expiryDays,
  }: {
    assetType?: string;
    expiryDays?: number | null;
  }) =>
    track('Payment Confirmation Viewed', {
      journey: 'sender',
      ...(assetType ? { asset_type: assetType } : {}),
      ...(expiryDays != null ? { expiry_days: expiryDays } : {}),
    }),
  paymentConfirmed: ({
    assetType,
    expiryDays,
    walletType,
  }: {
    assetType?: string;
    expiryDays?: number | null;
    walletType?: string;
  }) =>
    track('Payment Confirmed', {
      journey: 'sender',
      ...(assetType ? { asset_type: assetType } : {}),
      ...(expiryDays != null ? { expiry_days: expiryDays } : {}),
      ...(walletType ? { wallet_type: walletType } : {}),
    }),
  paymentCreated: ({
    claimId,
    assetType,
    expiryDays,
    confirmationTimeMs,
  }: {
    claimId: string;
    assetType?: string;
    expiryDays?: number | null;
    confirmationTimeMs: number;
  }) =>
    track('Payment Created', {
      journey: 'sender',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
      ...(expiryDays != null ? { expiry_days: expiryDays } : {}),
      confirmation_time_ms: confirmationTimeMs,
    }),
  claimLinkCopied: ({
    claimId,
    copyLocation,
  }: {
    claimId: string;
    copyLocation: 'success_screen' | 'dashboard_detail';
  }) =>
    track('Claim Link Copied', {
      journey: 'sender',
      claim_id: claimId,
      copy_location: copyLocation,
    }),
  claimLinkShared: ({ claimId, shareMethod }: { claimId: string; shareMethod: ShareMethod }) =>
    track('Claim Link Shared', {
      journey: 'sender',
      claim_id: claimId,
      share_method: shareMethod,
    }),
  claimPageOpened: ({
    claimId,
    entryChannel,
  }: {
    claimId: string;
    entryChannel: ClaimEntryChannel;
  }) =>
    track('Claim Page Opened', {
      journey: 'recipient',
      claim_id: claimId,
      entry_channel: entryChannel,
    }),
  paymentDetailsViewed: ({
    claimId,
    claimStatus,
  }: {
    claimId: string;
    claimStatus: PaymentClaimStatus;
  }) =>
    track('Payment Details Viewed', {
      journey: 'sender',
      claim_id: claimId,
      claim_status: claimStatus,
    }),
  pageViewed: ({ page, entrySource }: { page: string; entrySource?: EntrySource }) =>
    track('Page Viewed', {
      journey: 'sender',
      page,
      ...(entrySource ? { entry_source: entrySource } : {}),
    }),
  sendFormViewed: () => track('Send Form Viewed', { journey: 'sender' }),
  claimVerified: ({
    claimId,
    assetType,
    expiryDaysRemaining,
    verificationTimeMs,
  }: ClaimVerifiedProps) =>
    track('Claim Verified', {
      journey: 'recipient',
      ...conditional.claimId(claimId),
      ...(assetType ? conditional.assetType(assetType) : {}),
      ...(expiryDaysRemaining != null ? { expiry_days_remaining: expiryDaysRemaining } : {}),
      verification_time_ms: verificationTimeMs,
    }),
  claimCtaClicked: ({ claimId, assetType }: ClaimCtaClickedProps) =>
    track('Claim CTA Clicked', {
      journey: 'recipient',
      ...conditional.claimId(claimId),
      ...(assetType ? conditional.assetType(assetType) : {}),
    }),
  errorDisplayed: ({
    journey,
    claimId,
    errorType,
    errorCode,
    sourceScreen,
  }: ErrorDisplayedProps) =>
    track('Error Displayed', {
      journey,
      ...(claimId ? { claim_id: claimId } : {}),
      ...conditional.errorType(errorType),
      ...conditional.errorCode(errorCode ?? 'unknown'),
      source_screen: sourceScreen,
    }),
  walletAddressValidationFailed: ({
    claimId,
    validationError,
    attemptNumber,
  }: WalletAddressValidationFailedProps) =>
    track('Wallet Address Validation Failed', {
      journey: 'recipient',
      ...(claimId ? { claim_id: claimId } : {}),
      validation_error: validationError,
      attempt_number: attemptNumber,
    }),
  claimConfirmationViewed: ({ claimId, assetType }: ClaimCtaClickedProps) =>
    track('Claim Confirmation Viewed', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
    }),

  /**
   * §6 Retry Clicked — fires when a user clicks Try Again/Retry on an error
   * screen, recording which error prompted the retry and how many attempts
   * have been made.
   */
  retryClicked: ({
    journey,
    claimId,
    errorType,
    attemptNumber,
  }: RetryClickedProps) =>
    track('Retry Clicked', {
      journey,
      ...(claimId != null ? { claim_id: claimId } : {}),
      error_type: errorType,
      attempt_number: attemptNumber,
    }),

  /**
   * §5.3 Claim Failed — fires when the sweep fails after the recipient confirmed.
   * `error_type` must be one of the five §5.3 taxonomy values.
   */
  claimFailed: ({
    claimId,
    assetType,
    errorCode = 'unknown',
    errorType,
    attemptNumber,
  }: ClaimFailedProps) =>
    track('Claim Failed', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
      error_code: errorCode,
      error_type: errorType,
      attempt_number: attemptNumber,
    }),

  /**
   * §5.4 Claim Success Viewed — fires when the post-claim success screen is displayed.
   */
  claimSuccessViewed: ({ claimId, assetType }: ClaimSuccessViewedProps) =>
    track('Claim Success Viewed', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
    }),

  /**
   * §5.4 Sender Signup CTA Clicked — fires when a recipient clicks "Create your account →"
   * on the success screen, measuring viral growth potential.
   */
  senderSignupCtaClicked: ({ claimId }: SenderSignupCtaClickedProps) =>
    track('Sender Signup CTA Clicked', {
      journey: 'recipient',
      claim_id: claimId,
      source: 'claim_success_screen',
    }),

  /**
   * §5.4/§6 Explorer Link Clicked — fires when a user (sender or recipient) clicks a
   * Stellar Explorer transaction link.
   */
  explorerLinkClicked: ({ journey, claimId, sourceScreen }: ExplorerLinkClickedProps) =>
    track('Explorer Link Clicked', {
      journey,
      claim_id: claimId,
      source_screen: sourceScreen,
    }),
  claimSubmitted: ({ claimId, assetType }: ClaimCtaClickedProps) =>
    track('Claim Submitted', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
    }),
  claimSucceeded: ({
    claimId,
    assetType,
    timeToClaimHours,
    sweepDurationMs,
    entryChannel = 'unknown',
  }: ClaimSucceededProps) =>
    track('Claim Succeeded', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
      ...(timeToClaimHours !== undefined ? { time_to_claim_hours: timeToClaimHours } : {}),
      ...(sweepDurationMs !== undefined ? { sweep_duration_ms: sweepDurationMs } : {}),
      entry_channel: entryChannel,
    }),
};
