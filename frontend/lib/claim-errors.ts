// #114 – Typed claim failure modes with user-facing messages
// Extended for Stellar network congestion: distinguish retryable vs terminal failures.
export type ClaimErrorCode =
  | 'TOKEN_NOT_FOUND'
  | 'ALREADY_CLAIMED'
  | 'EXPIRED'
  | 'INVALID_ADDRESS'
  | 'NETWORK_ERROR'
  | 'SWEEP_FAILED'
  // Network-congestion specific codes
  | 'SUBMISSION_TIMEOUT' // Request timed out; might have been received. Poll status.
  | 'SUBMISSION_FAILED_RETRYABLE' // Network issue before submission; safe to retry.
  | 'SUBMISSION_FAILED_FINAL'; // Explicit rejection after submission attempts; contact support.

export class ClaimError extends Error {
  constructor(
    public readonly code: ClaimErrorCode,
    message: string,
    /** Whether the user can safely retry this error. */
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'ClaimError';
  }
}

const MESSAGES: Record<ClaimErrorCode, string> = {
  TOKEN_NOT_FOUND: 'This claim link is invalid or no longer exists.',
  ALREADY_CLAIMED: 'This payment has already been claimed.',
  EXPIRED: 'This claim link has expired. Contact the sender for a new one.',
  INVALID_ADDRESS: 'The destination address is not a valid Stellar public key.',
  NETWORK_ERROR: 'A network error occurred. Please check your connection and try again.',
  SWEEP_FAILED: 'The transfer could not be completed. Please try again or contact support.',
  SUBMISSION_TIMEOUT:
    "Your claim is taking longer than expected due to network congestion. We're checking on it -- please wait a moment.",
  SUBMISSION_FAILED_RETRYABLE:
    "Your claim couldn't be sent right now. Please try again -- this is safe and won't cause any problems.",
  SUBMISSION_FAILED_FINAL:
    "Something went wrong after several attempts. Your funds are safe, but we need our team to look into this.",
};

export function getClaimErrorMessage(code: ClaimErrorCode): string {
  return MESSAGES[code];
}

export function toClaimError(status: number): ClaimError {
  if (status === 404) return new ClaimError('TOKEN_NOT_FOUND', MESSAGES.TOKEN_NOT_FOUND);
  if (status === 409) return new ClaimError('ALREADY_CLAIMED', MESSAGES.ALREADY_CLAIMED);
  if (status === 410) return new ClaimError('EXPIRED', MESSAGES.EXPIRED);
  return new ClaimError('NETWORK_ERROR', MESSAGES.NETWORK_ERROR);
}

/**
 * Create a ClaimError from a ClaimOutcome kind.
 */
export function outcomeToClaimError(kind: string): ClaimError {
  switch (kind) {
    case 'safeToRetry':
      return new ClaimError('SUBMISSION_FAILED_RETRYABLE', MESSAGES.SUBMISSION_FAILED_RETRYABLE, true);
    case 'ambiguous':
      return new ClaimError('SUBMISSION_TIMEOUT', MESSAGES.SUBMISSION_TIMEOUT, false);
    case 'terminal':
      return new ClaimError('SUBMISSION_FAILED_FINAL', MESSAGES.SUBMISSION_FAILED_FINAL, false);
    default:
      return new ClaimError('SWEEP_FAILED', MESSAGES.SWEEP_FAILED, false);
  }
}
