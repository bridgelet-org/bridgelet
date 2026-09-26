// #633 – 30-minute inactivity window for the §3.1 `session_id`.
//
// `docs/analytics-spec.md` §9.3 requires a *new* `session_id` when a browser
// session starts — "first page load, or after 30 minutes of inactivity".
// `lib/analytics.ts` mints one id per `sessionStorage` lifetime and never
// expires it, so the inactivity half of that rule was unimplemented. This
// module owns the whole read → expire-or-reuse → stamp → return cycle so the
// rule is testable without a DOM, an analytics event, or `analytics.ts`.
//
// Two layers, so both are testable:
//   - `resolveSessionId()` — pure. All I/O arrives as arguments (storage, clock,
//     id generator, threshold). No globals are touched.
//   - `getSessionIdWithInactivity()` — the browser entry point. Reads the real
//     `sessionStorage` / `Date.now()` behind SSR and blocked-storage guards,
//     and delegates to `resolveSessionId()`.
//
// **Not wired in yet.** `getSessionId()` in `lib/analytics.ts` still mints
// once per tab lifetime. Activation is one import plus one delegation call;
// see the hand-off note in the footer of this file.

/** Inactivity window from `docs/analytics-spec.md` §9.3, in milliseconds. */
export const SESSION_INACTIVITY_MS = 30 * 60 * 1000;

/**
 * `sessionStorage` key holding the active `session_id`. Identical to the
 * `SESSION_ID_KEY` const in `lib/analytics.ts` — duplicated deliberately so
 * this module has no import edge to a file another PR owns. The two must stay
 * in sync; the optional cleanup is noted in the hand-off note below.
 */
export const SESSION_ID_KEY = 'bridgelet_session_id';

/**
 * `sessionStorage` key holding the epoch milliseconds of the last recorded
 * activity for the current `session_id`. This is the inactivity clock; the id
 * key alone carries no timestamp.
 */
export const SESSION_LAST_ACTIVITY_KEY = 'bridgelet_session_last_activity';

/**
 * The subset of the DOM `Storage` interface this module needs. Narrowing it
 * keeps `resolveSessionId()` testable with a plain object and documents that
 * `sessionStorage` is only ever read and written, never enumerated.
 */
export interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ResolveSessionIdOptions {
  /** `null` means "no storage" (SSR, or storage blocked) → returns `''`. */
  storage: SessionStorageLike | null;
  /** Current time in epoch milliseconds. */
  now: number;
  /** Mints a new `session_id`. Injected so the caller keeps one UUID source. */
  generateId: () => string;
  /** Override for tests; production uses `SESSION_INACTIVITY_MS`. */
  inactivityMs?: number;
}

/**
 * Resolves the `session_id` for the current moment and records the activity.
 *
 * Decision table, in order:
 *
 * | Stored state | Outcome | Why |
 * |---|---|---|
 * | no id | mint + stamp | first page load of a browser session |
 * | id, marker within window | reuse + restamp | still the same session |
 * | id, marker at/over the threshold | mint + stamp | §9.3 inactivity reset |
 * | id, no marker | reuse + stamp | id predates this module — see below |
 * | id, unparsable marker | reuse + stamp | cannot prove elapsed; do not rotate |
 * | id, marker in the future | reuse + stamp | clock skew; negative idle is < window |
 *
 * The "no marker" row is the upgrade path: installs that already have a
 * `bridgelet_session_id` from the pre-#633 code have no activity marker.
 * Rotating on first sight would split one in-flight session into two across a
 * deploy, so the id is adopted and stamped; the window then applies normally.
 *
 * Returns `''` when no id can be produced — SSR, storage blocked, or a mint
 * that could not be persisted. Persisting matters: an unpersisted id would be
 * regenerated on every event, which is worse than emitting none, and matches
 * the `''` contract of `getSessionId()` in `lib/analytics.ts`.
 *
 * Known deviation from §9.3: "inactivity" here means *no analytics event for
 * 30 minutes*, because this module is driven by `track()`. A user who reads a
 * page for 40 minutes without generating an event is treated as inactive.
 * Listening for real DOM activity would need its own wiring (and its own
 * teardown); recorded as follow-up work rather than guessed at here.
 */
export function resolveSessionId({
  storage,
  now,
  generateId,
  inactivityMs = SESSION_INACTIVITY_MS,
}: ResolveSessionIdOptions): string {
  if (!storage) return '';

  let id: string | null = null;
  let lastActivityRaw: string | null = null;
  try {
    id = storage.getItem(SESSION_ID_KEY);
    lastActivityRaw = storage.getItem(SESSION_LAST_ACTIVITY_KEY);
  } catch {
    // sessionStorage blocked (private mode, quota, disabled storage).
    return '';
  }

  const lastActivity = Number(lastActivityRaw);
  const hasMarker = lastActivityRaw != null && Number.isFinite(lastActivity);
  const elapsed = hasMarker && now - lastActivity >= inactivityMs;

  // Fresh session, or a session whose inactivity window has closed.
  if (id == null || elapsed) {
    return mint(storage, now, generateId);
  }

  // Reusing the stored id: keep the window open. A failed restamp is not fatal
  // — the id was read successfully, it just will not be rotated on schedule.
  try {
    storage.setItem(SESSION_LAST_ACTIVITY_KEY, String(now));
  } catch {
    // Ignore: the session id itself is still valid.
  }
  return id;
}

/** Persists a freshly minted id plus its activity stamp. `''` if unwritable. */
function mint(storage: SessionStorageLike, now: number, generateId: () => string): string {
  const id = generateId();
  try {
    storage.setItem(SESSION_ID_KEY, id);
    storage.setItem(SESSION_LAST_ACTIVITY_KEY, String(now));
  } catch {
    return '';
  }
  return id;
}

/**
 * Browser entry point for `session_id`. SSR-safe and storage-failure-safe: both
 * degrade to `''` rather than throwing, matching `getSessionId()`.
 *
 * The id generator is injected so `crypto.randomUUID` (and its fallback) stays
 * in exactly one place, `lib/analytics.ts`.
 */
export function getSessionIdWithInactivity(generateId: () => string): string {
  return resolveSessionId({
    storage: browserSessionStorage(),
    now: Date.now(),
    generateId,
  });
}

/**
 * Returns the real `sessionStorage`, or `null` when there is no window (SSR)
 * or when merely *touching* `sessionStorage` throws. The access itself is
 * inside the try: some private-browsing configurations throw on property
 * access, not on the method calls.
 */
function browserSessionStorage(): SessionStorageLike | null {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage;
  } catch {
    // Storage blocked at the property-access level.
    return null;
  }
}

// ─── Hand-off: activating this module ────────────────────────────────────────
//
// `lib/analytics.ts` is owned by a parallel PR, so the wiring is deliberately
// not made here. To activate, its owner makes two edits:
//
//   1. Add the import next to the other lib imports:
//
//        import { getSessionIdWithInactivity } from './analytics-session';
//
//   2. Replace the body of the existing `getSessionId()` with a single
//      delegation, passing the module-private `generateUUID` so there is still
//      exactly one UUID implementation:
//
//        export function getSessionId(): string {
//          return getSessionIdWithInactivity(generateUUID);
//        }
//
// Optional follow-up (not required for correctness): delete the local
// `SESSION_ID_KEY` const in `lib/analytics.ts` and import it from here instead,
// so the duplicated key literal has one owner.
