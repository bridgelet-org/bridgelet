// #114 – Typed claim failure modes with user-facing messages
export type ClaimErrorCode =
  | 'TOKEN_NOT_FOUND'
  | 'ALREADY_CLAIMED'
  | 'EXPIRED'
  | 'INVALID_ADDRESS'
  | 'NETWORK_ERROR'
  | 'SWEEP_FAILED'
  | 'DESTINATION_NOT_FUNDED'
  | 'SWEEP_CONTRACT_FAILED'
  | 'RATE_LIMITED'
  | 'SUBMISSION_FAILED_RETRYABLE'
  | 'SUBMISSION_TIMEOUT'
  | 'SUBMISSION_FAILED_FINAL';

export class ClaimError extends Error {
  /** Whether re-submitting this claim is safe (e.g. the request never reached the server). */
  public readonly retryable: boolean;

  constructor(public readonly code: ClaimErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'ClaimError';
    this.retryable = retryable;
  }
}

const MESSAGES: Record<ClaimErrorCode, string> = {
  TOKEN_NOT_FOUND:  'This claim link is invalid or no longer exists.',
  ALREADY_CLAIMED:  'This payment has already been claimed.',
  EXPIRED:          'This claim link has expired. Contact the sender for a new one.',
  INVALID_ADDRESS:  'The destination address is not a valid Stellar public key.',
  NETWORK_ERROR:    'A network error occurred. Please check your connection and try again.',
  SWEEP_FAILED:     'The transfer could not be completed. Please try again or contact support.',
  DESTINATION_NOT_FUNDED: 'Fund this wallet with at least 1 XLM first.',
  SWEEP_CONTRACT_FAILED:
    'The claim could not be completed. Your funds are safe; contact support.',
  RATE_LIMITED: 'Too many attempts, wait a minute.',
  SUBMISSION_FAILED_RETRYABLE:
    'Your claim could not be sent right now. Please try again -- this is safe and will not cause any problems.',
  SUBMISSION_TIMEOUT:
    'Your claim is taking longer than expected due to network congestion. We are checking on it -- please wait a moment.',
  SUBMISSION_FAILED_FINAL:
    'Something went wrong after several attempts. Your funds are safe, but we need our team to look into this.',
};

export function getClaimErrorMessage(code: ClaimErrorCode): string {
  return MESSAGES[code];
}

/**
 * Map a backend error code (from the `ApiError` envelope's `code` field) to a
 * typed claim error code. Returns `undefined` for codes we don't recognise so
 * the caller can fall back to the backend's own message.
 */
export function claimErrorCodeFromApiCode(apiCode: string | undefined): ClaimErrorCode | undefined {
  switch (apiCode) {
    case 'DESTINATION_NOT_FUNDED':
      return 'DESTINATION_NOT_FUNDED';
    case 'SWEEP_CONTRACT_FAILED':
      return 'SWEEP_CONTRACT_FAILED';
    case 'INVALID_ADDRESS':
      return 'INVALID_ADDRESS';
    case 'ALREADY_CLAIMED':
      return 'ALREADY_CLAIMED';
    case 'TOKEN_NOT_FOUND':
      return 'TOKEN_NOT_FOUND';
    case 'EXPIRED':
      return 'EXPIRED';
    default:
      return undefined;
  }
}

/**
 * Build a typed `ClaimError` from an HTTP status and, when present, the
 * backend's machine-readable error code. Backend codes win so the user sees a
 * specific message (e.g. `DESTINATION_NOT_FUNDED`) instead of a generic one.
 */
export function toClaimError(status: number, apiCode?: string): ClaimError {
  const mapped = claimErrorCodeFromApiCode(apiCode);
  if (mapped) return new ClaimError(mapped, MESSAGES[mapped]);

  if (status === 404) return new ClaimError('TOKEN_NOT_FOUND', MESSAGES.TOKEN_NOT_FOUND);
  if (status === 409) return new ClaimError('ALREADY_CLAIMED', MESSAGES.ALREADY_CLAIMED);
  if (status === 410) return new ClaimError('EXPIRED', MESSAGES.EXPIRED);
  if (status === 429) return new ClaimError('RATE_LIMITED', MESSAGES.RATE_LIMITED, true);
  return new ClaimError('NETWORK_ERROR', MESSAGES.NETWORK_ERROR);
}
