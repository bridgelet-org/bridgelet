// #1092 – Prior consent gate for analytics (GDPR / ePrivacy Art. 5(3)).
//
// `track()` in `lib/analytics.ts` used to suppress events only when the browser
// reported Do Not Track. That is not the same thing as consent: under GDPR and
// the ePrivacy Directive, storing/reading a persistent identifier on a
// visitor's device and contacting a third-party analytics provider is not
// "strictly necessary" and needs an opt-in decision *before* it happens. DNT
// remains an independent suppression signal (§9.5), but it is not a lawful
// basis for tracking on its own.
//
// This module owns the consent decision so the rule lives in one place:
//
//   - unset   → no decision yet: tracking is OFF (opt-in, never pre-ticked).
//   - denied  → tracking stays OFF; stored identifiers are purged.
//   - granted → tracking is allowed (still subject to DNT and dedup gates).
//
// The decision is persisted in localStorage so it survives reloads, cached in
// memory so a page session keeps its decision even if storage is later
// cleared, and mirrored across tabs through the `storage` event. Every change
// emits `ANALYTICS_CONSENT_EVENT` on `window` so the provider script loader and
// any UI can react without polling.

/** A visitor's explicit decision about product analytics. */
export type AnalyticsConsent = 'granted' | 'denied';

/** localStorage key holding the persisted decision (never an identifier). */
export const ANALYTICS_CONSENT_KEY = 'bridgelet_analytics_consent';

/** window event emitted whenever the decision changes, including cross-tab. */
export const ANALYTICS_CONSENT_EVENT = 'bridgelet:analytics-consent-change';

/**
 * Analytics identifiers this app mints. Revoking consent removes all of them:
 * leaving a durable join key behind after "Reject" would defeat the point of
 * the gate (and ignores the erasure concern in
 * `docs/localstorage-data-exposure-audit.md` item 11).
 */
export const ANALYTICS_ID_KEYS = [
  'bridgelet_anonymous_id',
  'bridgelet_session_id',
  'bridgelet_session_last_activity',
] as const;

/**
 * Page-session cache. `null` means "not read yet", which is distinct from an
 * explicit denial. Reads stay cheap and, importantly, a decision already made
 * in this tab is not silently reversed by a third party clearing storage.
 */
let cachedConsent: AnalyticsConsent | null = null;
let syncRegistered = false;

/** Returns localStorage, or null during SSR / when storage access throws. */
function browserLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    // Private-mode configurations can throw on the property access itself.
    return null;
  }
}

/** Returns sessionStorage, or null during SSR / when storage access throws. */
function browserSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isValid(value: unknown): value is AnalyticsConsent {
  return value === 'granted' || value === 'denied';
}

/** Broadcasts a decision so `PlausibleScript` and the banner can stay in sync. */
function notify(value: AnalyticsConsent | null): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: value }));
  } catch {
    // A hostile/partial window implementation must not break the app.
  }
}

/**
 * The current decision, or `null` when the visitor has not made one yet.
 * SSR-safe and storage-failure-safe: no decision means no tracking.
 */
export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (cachedConsent !== null) return cachedConsent;
  const store = browserLocalStorage();
  if (!store) return null;
  try {
    const stored: unknown = store.getItem(ANALYTICS_CONSENT_KEY);
    if (isValid(stored)) {
      cachedConsent = stored;
      return stored;
    }
  } catch {
    // Storage blocked: stay at "no decision", the conservative default.
  }
  return null;
}

/** `true` only after an explicit opt-in. This is the gate `track()` uses. */
export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === 'granted';
}

/**
 * Records a decision and emits the change event. Denial also purges every
 * analytics identifier so a visitor who opts out is not left with a durable
 * join key from an earlier visit.
 */
export function setAnalyticsConsent(value: AnalyticsConsent): void {
  cachedConsent = value;
  const local = browserLocalStorage();
  try {
    local?.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    // Storage write blocked: the in-memory decision still holds for this tab.
  }
  if (value === 'denied') purgeAnalyticsIdentifiers();
  notify(value);
}

/** Convenience wrapper for the "withdraw consent" path. */
export function revokeAnalyticsConsent(): void {
  setAnalyticsConsent('denied');
}

/**
 * Returns the visitor to "no decision yet" (e.g. a settings reset) and emits
 * the change so the banner reappears. Identifiers are purged as on denial.
 */
export function resetAnalyticsConsent(): void {
  cachedConsent = null;
  const local = browserLocalStorage();
  try {
    local?.removeItem(ANALYTICS_CONSENT_KEY);
  } catch {
    // Nothing to remove when storage is blocked.
  }
  purgeAnalyticsIdentifiers();
  notify(null);
}

/** Deletes all locally stored analytics identifiers. */
export function purgeAnalyticsIdentifiers(): void {
  for (const store of [browserLocalStorage(), browserSessionStorage()]) {
    if (!store) continue;
    for (const key of ANALYTICS_ID_KEYS) {
      try {
        store.removeItem(key);
      } catch {
        // Best effort: one blocked key must not stop the others.
      }
    }
  }
}

/**
 * Applies a decision made in another tab without writing it back (avoids a
 * storage-event feedback loop) and broadcasts it to local listeners.
 */
function applyExternalChange(value: AnalyticsConsent | null): void {
  cachedConsent = value;
  notify(value);
}

/**
 * Installs the cross-tab `storage` listener once. Safe to call from multiple
 * components; later calls are no-ops. Returns nothing because listeners live
 * for the lifetime of the page.
 */
export function initConsentSync(): void {
  if (syncRegistered || typeof window === 'undefined') return;
  syncRegistered = true;
  try {
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key !== null && event.key !== ANALYTICS_CONSENT_KEY) return;
      applyExternalChange(isValid(event.newValue) ? event.newValue : null);
    });
  } catch {
    syncRegistered = false;
  }
}
