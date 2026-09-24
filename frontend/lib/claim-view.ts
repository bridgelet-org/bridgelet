import { AccountStatus } from '@/lib/api/types';
import { BridgeletApiError, getDefaultClient } from '@/lib/api/client';

/**
 * The claim view model rendered by `ClaimStatusCard`. Built from the
 * verified claim details plus locally-tracked redemption state.
 */
export interface ClaimView {
  status: AccountStatus;
  /** Claim amount in stroops. */
  amountStroops?: string;
  /** ISO 4217 asset code. */
  assetCode?: string;
  /** ISO 8601 expiry timestamp. */
  expiresAt?: string;
  /** Optional sender memo. */
  memo?: string;
  /** Developer-facing note from the redeem/verify response. */
  sweepNote?: string;
  /** Whether this session performed the claim. */
  claimedByMe?: boolean;
  /** Destination address used for this session's sweep. */
  sweepDestination?: string;
  /** Amount swept during this session, in stroops. */
  sweepAmountStroops?: string;
  /**
   * Machine-readable reason a claim could not be loaded, when status is
   * not PENDING_CLAIM; drives `Error Displayed` (`docs/analytics-spec.md`
   * §6) instrumentation.
   */
  loadErrorCode?: string;
}

/**
 * Convert a decimal lumens amount (e.g. "100.0000000") to stroops without
 * floating point math. 1 XLM = 10_000_000 stroops.
 */
export function decimalToStroops(decimal: string): string {
  const [intPart = '0', fracPart = ''] = decimal.split('.');
  const negative = intPart.startsWith('-') ? '-' : '';
  const int = negative ? intPart.slice(1) : intPart;
  const frac = fracPart.padEnd(7, '0').slice(0, 7);
  const digits = `${int}${frac}`.replace(/^0+(?=\d)/, '');
  return `${negative}${digits || '0'}`;
}

/**
 * Derive an ISO 4217-style asset code from the backend's asset identifier:
 * "native" → "XLM", "USDC:GBUQ..." → "USDC", "XLM" → "XLM".
 */
export function assetCodeFromAsset(asset: string): string {
  const code = asset.split(':')[0] ?? asset;
  return code === 'native' ? 'XLM' : code;
}

/**
 * Load the current view state for a claim token.
 *
 * Maps backend status codes onto the account lifecycle so the UI can render
 * the right panel:
 * - 200 → PENDING_CLAIM (verified, claimable)
 * - 401 → EXPIRED (token past its expiry timestamp)
 * - 404 → FAILED (no matching claim record)
 * - 409 → CLAIMED (already redeemed)
 * - 400 → PENDING_PAYMENT (malformed or not yet claimable)
 * - anything else → FAILED
 */
export async function loadClaimView(token: string): Promise<ClaimView> {
  try {
    const resp = await getDefaultClient().verifyClaim(token);
    return {
      status: AccountStatus.PENDING_CLAIM,
      amountStroops: resp.amount != null ? decimalToStroops(resp.amount) : undefined,
      assetCode: resp.asset != null ? assetCodeFromAsset(resp.asset) : undefined,
      expiresAt: resp.expiresAt,
    };
  } catch (err) {
    if (err instanceof BridgeletApiError) {
      switch (err.statusCode) {
        case 401:
          return { status: AccountStatus.EXPIRED, loadErrorCode: 'TOKEN_EXPIRED' };
        case 404:
          return { status: AccountStatus.FAILED, loadErrorCode: 'TOKEN_NOT_FOUND' };
        case 409:
          return { status: AccountStatus.CLAIMED, loadErrorCode: 'ALREADY_CLAIMED' };
        case 400:
          return { status: AccountStatus.PENDING_PAYMENT, loadErrorCode: 'TOKEN_INVALID' };
        default:
          return { status: AccountStatus.FAILED, loadErrorCode: 'FAILED' };
      }
    }
    throw err;
  }
}

/**
 * Record that this session redeemed the given token. Kept as an explicit
 * side-effect hook so a future, persisted implementation can be dropped in
 * without touching call sites.
 */
export function markTokenClaimed(_token: string): void {}