/**
 * Frontend-facing API types shared with bridgelet-sdk.
 *
 * `AccountStatus` mirrors the backend's real lifecycle enum — see
 * bridgelet-sdk `src/modules/accounts/enums/account-status.enum.ts` —
 * instead of the old three-value `'available' | 'claimed' | 'expired'`
 * model previously used in `@/lib/bridgelet`, which had no way to
 * represent INITIALIZING, PENDING_PAYMENT, CLAIMING, PARTIAL_SWEEP, or
 * FAILED accounts.
 */
export enum AccountStatus {
  INITIALIZING = 'initializing',
  PENDING_PAYMENT = 'pending_payment',
  PENDING_CLAIM = 'pending_claim',
  CLAIMING = 'claiming',
  PARTIAL_SWEEP = 'partial_sweep',
  CLAIMED = 'claimed',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

/**
 * Mirrors bridgelet-sdk's `AccountResponseDto`
 * (src/modules/accounts/dto/account-response.dto.ts), with Date fields
 * serialized to ISO strings as they arrive over JSON.
 */
export interface AccountResponse {
  accountId: string;
  publicKey: string;
  claimUrl: string | null;
  txHash?: string;
  amount: string;
  asset: string;
  status: AccountStatus;
  expiresAt: string;
  createdAt: string;
  claimedAt?: string | null;
  destination?: string;
  metadata?: Record<string, unknown>;
}
