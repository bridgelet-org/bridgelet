// `Error Displayed` emitters for the recipient-side §6 error_type values.
// Use the exact spec strings so Claim Failure Rate can be broken down by cause.
import { analytics } from './analytics';

export type ClaimErrorTrigger =
  | 'expired_token'
  | 'already_claimed'
  | 'invalid_wallet_address'
  | 'transaction_failed';

/** §6 trigger conditions, kept next to the emitter so UI surfaces map to the right value. */
export const CLAIM_ERROR_TRIGGERS: Record<ClaimErrorTrigger, string> = {
  expired_token: 'Claim token is past its expiration date',
  already_claimed: 'Token is valid but funds were already swept',
  invalid_wallet_address: 'Wallet address fails validation',
  transaction_failed: 'Stellar transaction rejected',
};

/** Call from any UI error surface whose condition matches `CLAIM_ERROR_TRIGGERS[errorType]`. */
export function emitClaimErrorDisplayed(
  errorType: ClaimErrorTrigger,
  sourceScreen: string,
  claimId?: string | null,
  errorCode?: string,
): void {
  analytics.errorDisplayed({
    journey: 'recipient',
    claimId,
    errorType,
    errorCode,
    sourceScreen,
  });
}
