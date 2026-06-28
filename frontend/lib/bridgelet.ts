/**
 * Bridgelet API TypeScript types
 *
 * These types are manually maintained as a baseline.
 * Once the SDK exposes an OpenAPI spec at /api/docs-json, regenerate with:
 *
 *   npm run generate:types
 *
 * See scripts/generate-types.mjs for full instructions.
 */

import { BridgeletClient, type BridgeletClientOptions } from '@/lib/create-bridgelet-client';

// ─── Payment Intent ──────────────────────────────────────────────────────────

/** Request body for POST /send */
export interface CreatePaymentIntentRequest {
  /** Stellar public key of the sender (G...) */
  senderPublicKey: string;
  /** Amount in stroops (1 XLM = 10_000_000) */
  amountStroops: string;
  /** ISO 4217 asset code, e.g. "USDC" or "XLM" */
  assetCode: string;
  /** Optional memo attached to the Stellar transaction */
  memo?: string;
}

/** Response from POST /send */
export interface CreatePaymentIntentResponse {
  /** Unique identifier for this payment intent */
  intentId: string;
  /** One-time claim token delivered to the recipient */
  claimToken: string;
  /** URL the recipient uses to claim the payment */
  claimUrl: string;
  /** ISO 8601 timestamp after which the token expires */
  expiresAt: string;
}

// ─── Claim ───────────────────────────────────────────────────────────────────

/** Response from GET /claim/:token */
export interface ClaimDetailsResponse {
  /** Whether the claim token is still valid and unclaimed */
  valid: boolean;
  /** Amount in stroops */
  amountStroops: string;
  /** Asset code */
  assetCode: string;
  /** ISO 8601 expiry timestamp */
  expiresAt: string;
  /** Optional sender memo */
  memo?: string;
}

/** Request body for POST /claim/:token/redeem */
export interface RedeemClaimRequest {
  /** Recipient's Stellar public key */
  recipientPublicKey: string;
}

/** Response from POST /claim/:token/redeem */
export interface RedeemClaimResponse {
  /** Stellar transaction hash */
  txHash: string;
  /** Stellar Explorer link for this transaction */
  explorerUrl: string;
}

// ─── Error envelope ──────────────────────────────────────────────────────────

/** Standard API error shape returned on 4xx / 5xx responses */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export {
  BridgeletClient,
  type BridgeletClientOptions,
};

let _defaultClient: BridgeletClient | null = null;

function defaultClient(): BridgeletClient {
  if (!_defaultClient) {
    _defaultClient = new BridgeletClient();
  }
  return _defaultClient;
}

export function getClaimDetails(token: string): Promise<ClaimDetailsResponse> {
  return defaultClient().getClaimDetails(token);
}

export function createPaymentIntent(
  data: CreatePaymentIntentRequest,
): Promise<CreatePaymentIntentResponse> {
  return defaultClient().createPaymentIntent(data);
}

export function redeemClaim(
  token: string,
  data: RedeemClaimRequest,
): Promise<RedeemClaimResponse> {
  return defaultClient().redeemClaim(token, data);
}
