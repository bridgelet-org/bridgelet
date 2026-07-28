import { AccountStatus } from '@/lib/api/types';
import { BridgeletApiError, BridgeletClient } from '@/lib/api/client';

export interface ClaimView {
  status: AccountStatus;
  amountStroops?: string;
  assetCode?: string;
  expiresAt?: string;
  sweepNote?: string;
}

export function toStroops(decimalAmount: string): string {
  if (!decimalAmount) return '0';
  const num = parseFloat(decimalAmount);
  if (Number.isNaN(num)) return '0';
  return String(Math.round(num * 10_000_000));
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
      if (err.statusCode === 409) return { status: AccountStatus.CLAIMED };
      if (err.statusCode === 400) return { status: AccountStatus.PENDING_PAYMENT };
      if (err.statusCode === 401) return { status: AccountStatus.EXPIRED };
    }
    return { status: AccountStatus.FAILED };
  }
}
