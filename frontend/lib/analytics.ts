// #118 – Privacy-respecting analytics events (Plausible-compatible, no PII)
type ClaimEvent =
  | 'claim_page_viewed'
  | 'claim_initiated'
  | 'claim_success'
  | 'claim_error'
  | 'Claim Verified'
  | 'Claim CTA Clicked'
  | 'Error Displayed'
  | 'Retry Clicked';

type EventProps = Record<string, string | number | boolean | null>;

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

// ─── track() ──────────────────────────────────────────────────────────────────

/**
 * Core dispatch function. Merges the §3.1 identity fields (`anonymous_id`,
 * `session_id`) into every event payload so every downstream event carries
 * them without any per-call plumbing.
 */
function track(event: ClaimEvent, props?: EventProps): void {
  if (typeof window === 'undefined') return;

  const baseIdentity: EventProps = {
    anonymous_id: getAnonymousId(),
    session_id: getSessionId(),
  };

  const mergedProps: EventProps = { ...baseIdentity, ...(props ?? {}) };

  // Plausible custom event API
  const plausible = (window as unknown as { plausible?: Function }).plausible;
  if (typeof plausible === 'function') {
    plausible(event, { props: mergedProps });
    return;
  }

  // Fallback: console in development
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics]', event, mergedProps);
  }
}

// ─── Event prop interfaces ────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  claimVerified: ({
    claimId,
    assetType,
    expiryDaysRemaining,
    verificationTimeMs,
  }: ClaimVerifiedProps) =>
    track('Claim Verified', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
      ...(expiryDaysRemaining != null ? { expiry_days_remaining: expiryDaysRemaining } : {}),
      verification_time_ms: verificationTimeMs,
    }),
  claimCtaClicked: ({ claimId, assetType }: ClaimCtaClickedProps) =>
    track('Claim CTA Clicked', {
      journey: 'recipient',
      claim_id: claimId,
      ...(assetType ? { asset_type: assetType } : {}),
    }),

  /**
   * §6 Error Displayed — fires whenever an error state screen or inline error
   * is shown. Uses the exported ERROR_TYPES taxonomy for error_type.
   */
  errorDisplayed: ({
    journey,
    claimId,
    errorType,
    errorCode = 'unknown',
    sourceScreen,
  }: ErrorDisplayedProps) =>
    track('Error Displayed', {
      journey,
      ...(claimId != null ? { claim_id: claimId } : {}),
      error_type: errorType,
      error_code: errorCode,
      source_screen: sourceScreen,
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
};
