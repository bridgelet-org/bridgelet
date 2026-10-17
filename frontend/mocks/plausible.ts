/**
 * Mock `window.plausible` for local development and tests.
 *
 * `lib/analytics.ts` `track()` dispatches to `window.plausible` first. The real
 * Plausible script only loads when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set
 * (`components/plausible-script.tsx`), and it never loads in a test
 * environment. So without a mock, `track()`'s success path cannot be exercised
 * at all — events fall through to `console.debug` in development and are
 * silently dropped in production.
 *
 * Install the mock:
 * - in development, via `initMocks()` (see `./index.ts`), which installs it when
 *   the real script is not configured;
 * - in a test, call `installMockPlausible()` directly and assert on `events`.
 *
 * The recorder keeps the exact `(eventName, { props })` shape that `track()`
 * calls, so tests validate the real payload rather than a reduced one.
 */

export interface CapturedAnalyticsEvent {
  /** Event name, e.g. `"Error Displayed"`. */
  name: string;
  /** Event properties exactly as passed to `window.plausible`. */
  props: Record<string, unknown>;
}

export interface MockPlausible {
  /** Captured events, in dispatch order. Mutated in place as events arrive. */
  readonly events: CapturedAnalyticsEvent[];
  /** Clears the captured events without uninstalling. */
  reset(): void;
  /** Removes `window.plausible` (if it is still this mock) and clears events. */
  uninstall(): void;
}

type PlausibleFunction = (
  eventName: string,
  options?: { props?: Record<string, unknown> },
) => void;

/** Narrows the globally-installed `window.plausible` without augmenting `Window`. */
function windowWithPlausible(): { plausible?: unknown } | null {
  return typeof window === 'undefined' ? null : (window as unknown as { plausible?: unknown });
}

/**
 * Installs a recording `window.plausible` and returns a handle to it.
 *
 * Safe to call more than once: each call replaces the previous mock, which is
 * what a test's `beforeEach` wants. Returns a handle even during SSR (where no
 * `window` exists) so a caller never has to branch.
 */
export function installMockPlausible(): MockPlausible {
  const events: CapturedAnalyticsEvent[] = [];

  const plausible: PlausibleFunction = (eventName, options) => {
    // Clone the props so later mutation at a call site cannot rewrite history.
    events.push({ name: eventName, props: { ...(options?.props ?? {}) } });
  };

  const target = windowWithPlausible();
  if (target) {
    target.plausible = plausible;
  }

  return {
    events,
    reset() {
      events.length = 0;
    },
    uninstall() {
      events.length = 0;
      const current = windowWithPlausible();
      if (current && current.plausible === plausible) {
        delete current.plausible;
      }
    },
  };
}
