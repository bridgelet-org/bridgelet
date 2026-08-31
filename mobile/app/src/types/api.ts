/**
 * Metadata for ephemeral account creation.
 * Mirrors the SDK's `CreateAccountDto.metadata` object (PII keys are
 * stripped server-side; serialised size capped at 4 KB).
 */
export interface AccountMetadata {
  recipientName: string;
  message?: string;
  senderNote?: string;
}

/**
 * Request body for creating an ephemeral account.
 * Mirrors the SDK's `CreateAccountDto` (POST /accounts). `fundingSource`
 * and `recovery_address` are required Stellar public keys; asset is sent
 * as `asset_code` + `asset_issuer` (not a combined "CODE:ISSUER" string).
 */
export interface CreateAccountRequest {
  fundingSource: string;
  recovery_address: string;
  amount: string;
  asset_code?: string;
  asset_issuer?: string;
  expiresIn: number; // in seconds (SDK range: 3600–2592000)
  metadata?: AccountMetadata;
}

/**
 * Response body for creating an ephemeral account.
 * Mirrors the SDK's `AccountResponseDto`. `claimToken` is intentionally
 * never returned by the SDK — callers receive a `claimUrl` instead.
 */
export interface CreateAccountResponse {
  accountId: string;
  publicKey: string;
  claimUrl: string | null;
  txHash?: string;
  amount: string;
  asset: string;
  status: AccountStatus;
  expiresAt: Date;
  createdAt: Date;
  claimedAt?: Date | null;
  destination?: string;
  metadata?: Record<string, any>;
}

/**
 * Full lifecycle status enum, mirroring the SDK's `AccountStatus`.
 */
export type AccountStatus =
  | 'initializing'
  | 'pending_payment'
  | 'pending_claim'
  | 'claiming'
  | 'partial_sweep'
  | 'claimed'
  | 'expired'
  | 'failed';

/**
 * Standard API error structure (SDK error shape).
 */
export interface ApiError {
  message: string;
  error?: string;
  statusCode?: number;
}

/**
 * Supported asset information.
 * The SDK does not currently expose an `/assets` endpoint; these values are
 * resolved client-side.
 */
export interface SupportedAsset {
  code: string;
  issuer: string;
  name: string;
  icon?: string;
}
