/**
 * Ambient declarations for the third-party globals `lib/analytics.ts`
 * dispatches to (§9.1).
 *
 * Previously `track()` reached these through
 * `(window as unknown as { plausible?: Function }).plausible`. The bare
 * `Function` type erased the call signature entirely — any argument list
 * type-checked, so a typo in the `props` shape could not be caught — and
 * `as unknown as` disabled the excess-property check that would have
 * surfaced it. Declaring the globals properly means the call in `track()` is
 * checked against the signature the providers actually document, and tests
 * (and `mocks/`) can install a stub without repeating the cast.
 */

/** The documented Plausible custom-event API. */
type PlausibleFn = (
  event: string,
  options?: { props?: Record<string, unknown>; callback?: () => void },
) => void;

/** The subset of the PostHog browser SDK `track()` falls back to (§9.1). */
type PostHogCapture = (
  event: string,
  properties?: Record<string, unknown>,
) => void;

export {};

declare global {
  interface Window {
    plausible?: PlausibleFn;
    posthog?: { capture?: PostHogCapture };
  }
}