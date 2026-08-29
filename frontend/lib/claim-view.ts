import { AccountStatus } from '@/lib/api/types';
import { BridgeletApiError, BridgeletClient } from '@/lib/api/client';

export interface ClaimView {
  status: AccountStatus;
  amountStroops?: string;
  assetCode?: string;
  expiresAt?: string;
  sweepNote?: string;
  /**
   * #435: true when the 409 response indicates the token was claimed in this
   * browser session (we wrote it to sessionStorage on a successful claim).
   * undefined / false means claimed by someone else.
   */
  claimedByMe?: boolean;
  /**
   * #433: destination wallet address reported by the API after a successful
   * sweep, shown in the final success state.
   */
  sweepDestination?: string;
  /**
   * #433: amount confirmed swept (in stroops), reported by the API.
   * May differ from amountStroops when fees are deducted.
   */
  sweepAmountStroops?: string;
}

export function toStroops(decimalAmount: string): string {
  if (!decimalAmount) return '0';
  const num = parseFloat(decimalAmount);
  if (Number.isNaN(num)) return '0';
  return String(Math.round(num * 10_000_000));
}

/** SessionStorage key used to record tokens this browser session claimed. */
const CLAIMED_TOKENS_KEY = 'bridgelet_claimed_tokens';

/** Mark a token as claimed by the current browser session. */
export function markTokenClaimed(claimToken: string): void {
  try {
    const raw = sessionStorage.getItem(CLAIMED_TOKENS_KEY);
    const tokens: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!tokens.includes(claimToken)) {
      tokens.push(claimToken);
      sessionStorage.setItem(CLAIMED_TOKENS_KEY, JSON.stringify(tokens));
    }
  } catch {
    // sessionStorage may be unavailable in some environments — fail silently.
  }
}

/** Returns true if this browser session previously claimed the given token. */
function wasClaimedByMe(claimToken: string): boolean {
  try {
    const raw = sessionStorage.getItem(CLAIMED_TOKENS_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as string[]).includes(claimToken);
  } catch {
    return false;
  }
}

export async function loadClaimView(claimToken: string): Promise<ClaimView> {
  const client = new BridgeletClient();
  try {
    const result = await client.verifyClaim(claimToken);
    return {
      status: AccountStatus.PENDING_CLAIM,
      amountStroops: toStroops(result.amountStroops ?? '0'),
      assetCode: result.assetCode === 'native' ? 'XLM' : result.assetCode,
      expiresAt: result.expiresAt,
    };
  } catch (err) {
    if (err instanceof BridgeletApiError) {
      if (err.statusCode === 409) {
        return {
          status: AccountStatus.CLAIMED,
          // #435: check if this session was the one that claimed it
          claimedByMe: wasClaimedByMe(claimToken),
        };
      }
      if (err.statusCode === 400) return { status: AccountStatus.PENDING_PAYMENT };
      if (err.statusCode === 401) return { status: AccountStatus.EXPIRED };
    }
    return { status: AccountStatus.FAILED };
  }
}
