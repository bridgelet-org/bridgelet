// #114 – Typed claim failure modes with user-facing messages
export type ClaimErrorCode =
  | 'TOKEN_NOT_FOUND'
  | 'ALREADY_CLAIMED'
  | 'EXPIRED'
  | 'INVALID_ADDRESS'
  | 'NETWORK_ERROR'
  | 'SWEEP_FAILED';

export class ClaimError extends Error {
  constructor(
    public readonly code: ClaimErrorCode,
    message: string,
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
