// #118 – Privacy-respecting analytics events (Plausible-compatible, no PII)
// Event names must match `docs/analytics-spec.md` `#### \`Event Name\`` headings exactly.
type ClaimEvent =
  | 'Page Viewed'
  | 'Send Form Viewed'
  | 'Send Form Started'
  | 'Send Form Field Changed'
  | 'Send Form Completed'
  | 'Payment Confirmation Viewed'
  | 'Wallet Connected'
  | 'Wallet Connection Failed'
  | 'Payment Confirmed'
  | 'Payment Created'
  | 'Payment Creation Failed'
  | 'Payment Success Viewed'
  | 'Claim Link Copied'
  | 'Claim Link Shared'
  | 'Dashboard Viewed'
  | 'Dashboard Filter Applied'
  | 'Payment Details Viewed'
  | 'Payment Cancelled'
  | 'Funds Reclaimed'
  | 'Claim Page Opened'
  | 'Claim Verified'
  | 'Claim CTA Clicked'
  | 'Wallet Address Screen Viewed'
  | 'Wallet Address Entered'
  | 'Wallet Address Validation Failed'
  | 'Claim Confirmation Viewed'
  | 'Claim Submitted'
  | 'Claim Succeeded'
  | 'Claim Failed'
  | 'Claim Success Viewed'
  | 'Sender Signup CTA Clicked'
  | 'Explorer Link Clicked'
  | 'Error Displayed'
  | 'Retry Clicked';

type EventProps = Record<string, string | number | boolean | null>;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * The `platform` dimension (`docs/analytics-spec.md` §3.1).
 *
 * Every event carries this field, so it is defined once here rather than
 * repeated as a literal at each call site: a typo would split the dimension
 * in two (`'web'` and `'Web'`) and silently fragment every dashboard that
 * groups by platform. The mobile app has its own values (`ios`, `android`);
 * adding one there does not require changing anything here.
 */
export const PLATFORMS = {
  web: 'web',
} as const;

export type Platform = (typeof PLATFORMS)[keyof typeof PLATFORMS];

/** The frontend's fixed §3.1 `platform` value. */
export const PLATFORM: Platform = PLATFORMS.web;

/**
 * The `journey` dimension (`docs/analytics-spec.md` §3.1) — the single most
 * important dimension for funnel segmentation, so every event carries it and
 * no emitter may spell it ad-hoc.
 */
export const JOURNEYS = {
  sender: 'sender',
  recipient: 'recipient',
  shared: 'shared',
} as const;

export type Journey = (typeof JOURNEYS)[keyof typeof JOURNEYS];

/**
 * The `network` dimension (`docs/analytics-spec.md` §3.1).
 *
 * `unknown` is a deliberate third member rather than a bug: it is what an
 * unconfigured or misspelled `NEXT_PUBLIC_CRYPTO_NETWORK` reports. Falling
 * back to `testnet` (as the rest of the app does when the variable is unset)
 * would file real traffic into the testnet bucket, which is exactly the
 * distinction §3.1 says exists so QA traffic can be excluded from
 * production dashboards.
 */
export const ANALYTICS_NETWORKS = {
  testnet: 'testnet',
  mainnet: 'mainnet',
  unknown: 'unknown',
} as const;

export type AnalyticsNetwork = (typeof ANALYTICS_NETWORKS)[keyof typeof ANALYTICS_NETWORKS];

/**
 * Resolves the §3.1 `network` field from `NEXT_PUBLIC_CRYPTO_NETWORK`, which
 * carries the SDK's network identifiers (`stellar-testnet` /
 * `stellar-mainnet`). Static member access keeps Next.js able to inline the
 * value into the browser bundle.
 */
export function currentNetwork(): AnalyticsNetwork {
  const configured = process.env['NEXT_PUBLIC_CRYPTO_NETWORK'];
  if (configured === 'stellar-mainnet') return ANALYTICS_NETWORKS.mainnet;
  if (configured === 'stellar-testnet') return ANALYTICS_NETWORKS.testnet;
  return ANALYTICS_NETWORKS.unknown;
}

/**
 * Coerces a caller-supplied `journey` into a valid §3.1 value. Anything
 * unrecognised (including `undefined`) becomes `shared`, the only value that
 * is truthful for an event not owned by one side of the flow.
 */
export function normalizeJourney(value: unknown): Journey {
  return typeof value === 'string' && value in JOURNEYS
    ? (value as Journey)
    : JOURNEYS.shared;
}

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
 * event: `journey`, `timestamp`, `network`, `app_version`, `user_agent`,
 * `device_type`, `referrer`, and the fixed frontend `platform` value. Each
 * field degrades gracefully when the browser API it depends on is
 * unavailable (SSR, unit tests without a DOM).
 *
 * `journey` is taken as an argument rather than read from a module-level
 * value because it is a property of the *event*, not of the session: the
 * same visitor is `sender` on `/send` and `recipient` on `/claim/[token]`.
 * `track()` therefore passes the journey the emitter declared and callers
 * that omit one are recorded as `shared`.
 */
export function buildBasePayload(journey: Journey = JOURNEYS.shared): EventProps {
  return {
    journey,
    timestamp: new Date().toISOString(),
    network: currentNetwork(),
    app_version: appVersion(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    device_type: detectDeviceType(),
    referrer: typeof document !== 'undefined' && document.referrer ? document.referrer : null,
    platform: PLATFORM,
  };
}

// ─── Consent gate ─────────────────────────────────────────────────────────────

/**
 * Explicit opt-out, checked by `track()` before anything else happens.
 *
 * `docs/analytics-spec.md` §9.5 only covers Do Not Track, which is a
 * browser-level signal that Bridgelet cannot
 * influence; it is necessary but not sufficient. A wallet-connected product
 * handling claim tokens and payment amounts should also be able to honour a
 * decision the visitor made *on the site*, without asking them to configure
 * their browser, and without editing their browser settings after the fact.
 *
 * The value is intentionally one-way in storage terms: absent means "no
 * decision recorded yet", `'1'` means opted out. Opting back in clears the
 * key rather than writing `'0'`, so a stale `'0'` can never outlive the
 * reason it was written. Defaulting to allowed keeps today's behaviour for
 * existing visitors while making the gate available to a future consent UI
 * before any event ships.
 */
const OPT_OUT_KEY = 'bridgelet_analytics_opt_out';

/**
 * Reads the explicit opt-out flag.
 *
 * Returns `false` during SSR and when storage is unavailable (private
 * mode, blocked cookies, quota exceeded): an unreadable preference is not
 * the same as an expressed refusal, and failing open here matches the
 * §9.5 behaviour while still leaving the DNT signal to catch anyone who set
 * it at the browser level.
 */
export function isAnalyticsOptedOut(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(OPT_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Records or clears the explicit opt-out. Pass `true` to stop tracking,
 * `false` to resume. No-ops during SSR so a server render can never write
 * to a visitor's storage.
 */
export function setAnalyticsOptedOut(optedOut: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (optedOut) {
      localStorage.setItem(OPT_OUT_KEY, '1');
    } else {
      localStorage.removeItem(OPT_OUT_KEY);
    }
  } catch {
    // Storage unavailable — the preference cannot be persisted, so there is
    // nothing useful to do here. DNT still gates the event itself.
  }
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

// ─── Provider availability queue ───────────────────────────────────────────────

/**
 * Events captured before a provider was ready, waiting to be replayed.
 *
 * `Page Viewed` and `Claim Page Opened` are page-load events, and
 * `PlausibleScript` injects the provider script with `async defer`
 * (`components/plausible-script.tsx`) — so on a cold load the provider is
 * routinely absent for the first few hundred milliseconds and those events
 * used to be dropped on the floor. Queueing them and replaying once the
 * provider appears is the pattern Plausible itself documents for exactly
 * this race.
 *
 * The queue is bounded: it is per-tab in-memory state that an analytics
 * helper must never let grow without limit, and the entries it holds are
 * the *earliest* events of a visit, which are also the least useful once
 * stale. On overflow the oldest entry is dropped, so a tab left open with
 * no provider degrades to keeping the most recent events rather than
 * growing without bound.
 */
export const PENDING_QUEUE_MAX_EVENTS = 50;

/**
 * How long to keep retrying a flush while no provider has appeared.
 *
 * Bounded on purpose: a queue that retries forever keeps a timer alive for
 * the life of the tab. 30 attempts at 500ms is 15s, comfortably longer than
 * a slow third-party script on a poor connection, and after that the events
 * are dropped rather than retained indefinitely in memory.
 */
export const PENDING_FLUSH_INTERVAL_MS = 500;
export const PENDING_FLUSH_ATTEMPTS = 30;

interface PendingEvent {
  event: ClaimEvent;
  payload: EventProps;
}

const pendingEvents: PendingEvent[] = [];
let pendingFlushAttempts = 0;
let pendingFlushTimer: ReturnType<typeof setTimeout> | null = null;

/** Events waiting for a provider. Exposed for diagnostics and tests. */
export function pendingEventCount(): number {
  return pendingEvents.length;
}

/** Discards queued events. Exposed for tests and for an explicit opt-out. */
export function clearPendingEvents(): void {
  pendingEvents.length = 0;
  if (pendingFlushTimer !== null) {
    clearTimeout(pendingFlushTimer);
    pendingFlushTimer = null;
  }
  pendingFlushAttempts = 0;
}

function queuePendingEvent(event: ClaimEvent, payload: EventProps): void {
  pendingEvents.push({ event, payload });
  while (pendingEvents.length > PENDING_QUEUE_MAX_EVENTS) {
    pendingEvents.shift();
  }
  schedulePendingFlush();
}

function schedulePendingFlush(): void {
  if (pendingFlushTimer !== null) return;
  if (pendingFlushAttempts >= PENDING_FLUSH_ATTEMPTS) return;
  pendingFlushTimer = setTimeout(() => {
    pendingFlushTimer = null;
    flushPendingEvents();
  }, PENDING_FLUSH_INTERVAL_MS);
}

/**
 * Replays queued events through Plausible, if it has become available.
 *
 * Returns `true` when the queue was drained. Stops at the first failure so
 * ordering is preserved and a provider that throws mid-replay cannot cause
 * the remaining events to be silently reordered.
 */
function flushPendingEvents(): boolean {
  if (typeof window === 'undefined') return false;
  const plausible = window.plausible;
  if (typeof plausible !== 'function' || pendingEvents.length === 0) return false;

  while (pendingEvents.length > 0) {
    const next = pendingEvents[0] as PendingEvent;
    try {
      plausible(next.event, { props: next.payload });
    } catch {
      return false;
    }
    pendingEvents.shift();
  }

  pendingFlushAttempts = 0;
  return true;
}

// ─── Payload verification (§3.1 shape check) ──────────────────────────────────

/**
 * Base-payload fields that must be present on every event, with the value
 * type §3.1 specifies. Used by the local verification mode below so a
 * malformed payload is caught at the point it is created rather than by a
 * dashboard months later.
 */
const REQUIRED_BASE_FIELDS: Record<string, 'string' | 'number' | 'boolean'> = {
  journey: 'string',
  timestamp: 'string',
  network: 'string',
  platform: 'string',
  app_version: 'string',
  user_agent: 'string',
  device_type: 'string',
  referrer: 'string',
  anonymous_id: 'string',
  session_id: 'string',
  message_id: 'string',
};

/**
 * Checks a payload against §3.1 and returns the problems found, empty when
 * the payload is well-formed. Pure: it never throws, so it is safe to call
 * from the dispatch path.
 */
export function validatePayload(payload: EventProps): string[] {
  const problems: string[] = [];

  for (const [field, expected] of Object.entries(REQUIRED_BASE_FIELDS)) {
    const value = payload[field];
    if (value === undefined) {
      problems.push(`missing §3.1 field "${field}"`);
      continue;
    }
    // `referrer` is legitimately `null` when there is no referring page,
    // which the spec documents as its own value rather than an absence.
    if (field === 'referrer' && value === null) continue;
    if (typeof value !== expected) {
      problems.push(`field "${field}" should be ${expected}, got ${typeof value}`);
    }
  }

  const timestamp = payload['timestamp'];
  if (typeof timestamp === 'string' && Number.isNaN(Date.parse(timestamp))) {
    problems.push('field "timestamp" is not an ISO 8601 date string');
  }
  if (!Object.values(JOURNEYS).includes(payload['journey'] as Journey)) {
    problems.push(`field "journey" is not one of ${Object.values(JOURNEYS).join(' | ')}`);
  }
  if (!Object.values(ANALYTICS_NETWORKS).includes(payload['network'] as AnalyticsNetwork)) {
    problems.push(`field "network" is not one of ${Object.values(ANALYTICS_NETWORKS).join(' | ')}`);
  }

  return problems;
}

/**
 * Local verification mode, enabled with `NEXT_PUBLIC_ANALYTICS_VERIFY=true`.
 *
 * Without it, a developer verifying instrumentation locally sees a
 * `console.debug` line and has to eyeball the payload against
 * `docs/analytics-spec.md` by hand. With it, every payload is checked
 * against the §3.1 shape on the way out and violations are reported
 * explicitly, so a missing `network` or a mistyped `journey` fails loudly in
 * the browser instead of quietly skewing a dashboard.
 */
export function isVerificationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_VERIFY === 'true';
}

/**
 * Whether a provider has taken responsibility for delivery. Tracked so a
 * production build with no provider configured can say so once instead of
 * dropping every event in total silence.
 */
let warnedNoProvider = false;

// ─── track() ──────────────────────────────────────────────────────────────────

/**
 * Core dispatch function. Merges the §3.1 base payload (including the
 * `journey`, `timestamp` and `network` dimensions) plus the identity fields
 * (`anonymous_id`, `session_id`) into every event payload so every
 * downstream event carries them without any per-call plumbing.
 *
 * This is the only place an event reaches a provider, so the consent gate,
 * Do Not Track (§9.5) and deduplication (§9.4) are enforced here rather
 * than at call sites — no emitter can forget them.
 *
 * Dispatch targets, in priority order:
 * 1. `window.plausible` — populated by the Plausible script loaded in the
 *    root layout when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is configured (§9.1).
 *    Anything queued from before the script arrived is replayed first.
 * 2. `window.posthog` — capture fallback when PostHog is wired up instead.
 * 3. An in-memory queue, replayed once a provider appears.
 * 4. Console output in development, with payload-shape verification when
 *    NEXT_PUBLIC_ANALYTICS_VERIFY is enabled.
 */
function track(event: ClaimEvent, props?: EventProps): void {
  if (typeof window === 'undefined') return;

  // Consent gate — before anything else, and before the §9.5 DNT check,
  // because an explicit on-site opt-out is a more specific statement of
  // intent than a browser-level header that predates this visit.
  if (isAnalyticsOptedOut()) return;

  // #635 (§9.5) — second, still before any payload is built.
  // `getAnonymousId()` and `getSessionId()` below *persist* a UUID to
  // localStorage/sessionStorage; minting one for a visitor who asked not to
  // be tracked would itself be a privacy violation, so suppression has to
  // happen before identifier generation, not just before the provider call.
  if (isDoNotTrackEnabled()) return;

  // #634 (§9.4) — third, so a suppressed duplicate also avoids burning a
  // `message_id`.
  if (isDuplicateClaimEvent(event, props?.claim_id)) return;

  // §3.1 `journey` is resolved from the emitter's props so it is populated
  // centrally rather than trusted as a free-form string, then the emitter's
  // own value is applied on top — same value, but the base payload is never
  // missing the field.
  const journey = normalizeJourney(props?.journey);

  // Base payload is merged in first so event-specific props can override.
  const payload: EventProps = {
    ...buildBasePayload(journey),
    anonymous_id: getAnonymousId(),
    session_id: getSessionId(),
    ...props,
    journey,
    // §9.4: a per-event UUID for the analytics pipeline to deduplicate on.
    // Applied after `...props` so no call site can override or blank it.
    message_id: generateUUID(),
  };

  if (isVerificationEnabled()) {
    const problems = validatePayload(payload);
    if (problems.length > 0) {
      console.warn(
        `[analytics] payload for "${event}" does not match docs/analytics-spec.md §3.1:`,
        problems,
      );
    }
  }

  // Plausible custom event API. Flushing first means an event queued
  // during page load is delivered before the event being tracked now, which
  // keeps funnel ordering intact.
  const plausible = window.plausible;
  if (typeof plausible === 'function') {
    flushPendingEvents();
    plausible(event, { props: payload });
    return;
  }

  // PostHog capture fallback (§9.1 self-hosted option).
  const posthog = window.posthog;
  if (typeof posthog?.capture === 'function') {
    clearPendingEvents();
    posthog.capture(event, payload);
    return;
  }

  // No provider yet. Queue rather than drop: page-load events routinely
  // race the third-party script, and `Page Viewed` is the first entry in
  // the Sender Activation Funnel (§7.1).
  queuePendingEvent(event, payload);

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics]', event, payload);
    return;
  }

  if (!warnedNoProvider) {
    warnedNoProvider = true;
    console.warn(
      '[analytics] no analytics provider is configured, so events are buffered in memory and discarded. Set NEXT_PUBLIC_PLAUSIBLE_DOMAIN (§9.1).',
    );
  }
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
  journey: Journey;
  /** Claim ID if available; omitted otherwise. */
  claimId?: string | null;
  errorType: ErrorType;
  /** Machine-readable error identifier; defaults to 'unknown'. */
  errorCode?: string;
  /** Screen where the error appeared. */
  sourceScreen: string;
}

interface RetryClickedProps {
  journey: Journey;
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
export type ExplorerJourney = Exclude<Journey, 'shared'>;

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
  claimPageViewed: ({ claimId, entryChannel }: { claimId: string; entryChannel: ClaimEntryChannel }) =>
    track('Claim Page Opened', {
      journey: 'recipient',
      claim_id: claimId,
      entry_channel: entryChannel,
    }),
  claimInitiated: ({ claimId, assetType }: { claimId: string; assetType?: string }) =>
    track('Claim CTA Clicked', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
    }),
  claimSuccess: ({ claimId, assetType }: { claimId: string; assetType?: string }) =>
    track('Claim Succeeded', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
    }),
  claimError: ({ claimId, assetType, errorCode = 'unknown', errorType, attemptNumber }: ClaimFailedProps) =>
    track('Claim Failed', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
      error_code: errorCode,
      error_type: errorType,
      attempt_number: attemptNumber,
    }),
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
