// Helpers that populate §3.2 conditional properties (`expiry_days`, `error_code`, `error_type`)
// and emit `Error Displayed` for `invalid_token`.
import { analytics, conditional, VALID_EXPIRY_WINDOWS } from './analytics';
import type { ErrorType, ExpiryDays } from './analytics';

/** Normalises a configured expiry window to 1 | 7 | 30 | 90, or null (never / unrecognised). */
export function toExpiryDays(days: number | null | undefined): ExpiryDays {
  const match = VALID_EXPIRY_WINDOWS.find((window) => window === days);
  return match ?? null;
}

/** `expiry_days` property object, ready to spread into an event payload. */
export function expiryProps(days: number | null | undefined) {
  return conditional.expiryDays(toExpiryDays(days));
}

/** `error_type` + `error_code` for any `Error Displayed` event; code defaults to 'unknown'. */
export function errorProps(errorType: ErrorType, errorCode = 'unknown') {
  return { ...conditional.errorType(errorType), ...conditional.errorCode(errorCode) };
}

/** §6 `invalid_token`: claim link is malformed or has no matching record. */
export function emitInvalidTokenDisplayed(sourceScreen: string, errorCode?: string): void {
  analytics.errorDisplayed({
    journey: 'recipient',
    errorType: 'invalid_token',
    errorCode,
    sourceScreen,
  });
}
