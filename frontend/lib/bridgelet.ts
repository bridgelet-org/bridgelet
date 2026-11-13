/**
 * Bridgelet API TypeScript types
 */

// ─── Payment Intent ──────────────────────────────────────────────────────────

/** Request body for POST /send */
export interface CreateAccountRequest {
  fundingSource: string;
  recovery_address: string;
  amount: string;
  asset_code?: string;
  asset_issuer?: string;
  expiresIn: number;
  metadata?: Record<string, unknown>;
  signedTxXdr?: string;
  signerAddress?: string;
  networkPassphrase?: string;
  signingMode?: 'backend' | 'freighter-client';
}

/** Mirrors bridgelet-sdk's AccountStatus enum (src/modules/accounts/enums). */
export type AccountStatus =
  | 'initializing'
  | 'pending_payment' // account exists on-chain; waiting for the sender's payment
  | 'pending_claim' // payment detected; claimable
  | 'claiming'
  | 'partial_sweep'
  | 'claimed'
  | 'expired'
  | 'failed';

/** Response from POST /send */
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

/** Response from GET /accounts (bridgelet-sdk `AccountsListResponseDto`). */
export interface AccountsListResponse {
  accounts: AccountResponse[];
  total: number;
}

/** Mirrors bridgelet-sdk's `AccountEventType` audit-log union. */
export type AccountEventType =
  | 'created'
  | 'contract_deployed'
  | 'funded'
  | 'claim_started'
  | 'claimed'
  | 'claim_failed'
  | 'partial_sweep'
  | 'expired'
  | 'reclaimed'
  | 'failed';

/** One append-only lifecycle entry from GET /accounts/:id/events. */
export interface AccountEvent {
  id: string;
  accountId: string;
  type: AccountEventType;
  txHash: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface VerifyClaimRequest {
  claimToken: string;
}

/** Request body for POST /claim/:token/redeem */
export interface RedeemClaimRequest {
  claimToken: string;
  destinationAddress: string;
}

/** Response from POST /claim/:token/redeem */
export interface RedeemClaimResponse {
  success: boolean;
  txHash?: string;
  amountSwept: string;
  asset: string;
  destination: string;
  sweptAt?: string;
  message?: string;
  isPartial?: boolean;
  contractAuthHash?: string;
  error?: string;
}

// ─── Error envelope ──────────────────────────────────────────────────────────

/** Standard API error shape returned on 4xx / 5xx responses */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

import {
  BridgeletClient,
  BridgeletApiError,
  RateLimitError,
  type BridgeletClientOptions,
} from '@/lib/create-bridgelet-client';

export { BridgeletClient, BridgeletApiError, RateLimitError, type BridgeletClientOptions };

// ─── Ephemeral account ───────────────────────────────────────────────────────

/**
 * An ephemeral Stellar account returned by the SDK's `POST /accounts`
 * endpoint. Alias of `AccountResponse`, named for send-form callers.
 */
export type EphemeralAccount = AccountResponse;

let _defaultClient: BridgeletClient | null = null;

function defaultClient(): BridgeletClient {
  if (!_defaultClient) {
    _defaultClient = new BridgeletClient();
  }
  return _defaultClient;
}

/**
 * Create an ephemeral account by wrapping the SDK's `POST /accounts`
 * endpoint.
 *
 * Auth: the request is routed through this app's own `/api/accounts` route
 * handler, which attaches the `Authorization: Bearer` header server-side;
 * the SDK token is never exposed to the browser.
 *
 * Errors: non-2xx responses are parsed into typed errors by the underlying
 * client: `RateLimitError` on 429 (with `retryAfter`) and
 * `BridgeletApiError` (with `statusCode` and error code) otherwise.
 * Transient network failures and 5xx responses are retried with backoff.
 */
export function createEphemeralAccount(data: CreateAccountRequest): Promise<EphemeralAccount> {
  return defaultClient().createAccount(data);
}

export function listEphemeralAccounts(
  options: { limit?: number; offset?: number } = {},
): Promise<AccountsListResponse> {
  return defaultClient().listAccounts(options);
}

export function listAccountEvents(accountId: string): Promise<AccountEvent[]> {
  return defaultClient().listAccountEvents(accountId);
}

export function redeemClaim(
  token: string,
  destinationAddress: string,
): Promise<RedeemClaimResponse> {
  return defaultClient().redeemClaim(token, destinationAddress);
}

// ─── Issued-asset configuration ──────────────────────────────────────────────

/**
 * Assets the frontend can send. `XLM` is always available; an issued asset is
 * offered only when the SDK's per-network allowlist includes it, otherwise the
 * send form would let the user pick an asset the ephemeral account cannot
 * receive (no trustline, no issuer).
 */
export const NATIVE_ASSET_CODE = 'XLM';

type NetworkKey = 'testnet' | 'mainnet';

type SupportedIssuedAsset = {
  code: string;
  issuer: string;
};

const ASSET_ENTRY_PATTERN = /^([A-Z0-9]{1,12}):(G[A-Z0-9]{55})$/;

function currentNetworkKey(): NetworkKey {
  const network = process.env['NEXT_PUBLIC_CRYPTO_NETWORK'] ?? 'stellar-testnet';
  return network === 'stellar-mainnet' ? 'mainnet' : 'testnet';
}

// Static member access is required for Next.js to inline these into the
// browser bundle; a dynamic `process.env[key]` read would be undefined client
// side. Issuer addresses are public and safe behind NEXT_PUBLIC_. The
// network-specific value wins over the global fallback, matching the SDK.
const SUPPORTED_ASSETS_BY_NETWORK: Record<NetworkKey, string | undefined> = {
  testnet:
    process.env['NEXT_PUBLIC_SUPPORTED_ASSETS_TESTNET'] ??
    process.env['NEXT_PUBLIC_SUPPORTED_ASSETS'],
  mainnet:
    process.env['NEXT_PUBLIC_SUPPORTED_ASSETS_MAINNET'] ??
    process.env['NEXT_PUBLIC_SUPPORTED_ASSETS'],
};

function parseSupportedAssets(raw: string | undefined): SupportedIssuedAsset[] {
  if (!raw) return [];

  const seen = new Set<string>();
  const assets: SupportedIssuedAsset[] = [];

  for (const entry of raw.split(',')) {
    const match = ASSET_ENTRY_PATTERN.exec(entry.trim());
    if (!match) continue;

    const [, code, issuer] = match;
    if (!code || !issuer || code === NATIVE_ASSET_CODE || seen.has(code)) continue;

    seen.add(code);
    assets.push({ code, issuer });
  }

  return assets;
}

function supportedIssuedAssets(): SupportedIssuedAsset[] {
  return parseSupportedAssets(SUPPORTED_ASSETS_BY_NETWORK[currentNetworkKey()]);
}

/**
 * Returns the per-network issuer for an allowlisted issued asset, or `undefined`
 * when the asset is unknown or absent from the SDK allowlist for this network.
 */
export function getAssetIssuer(assetCode: string): string | undefined {
  if (assetCode === NATIVE_ASSET_CODE) return undefined;
  return supportedIssuedAssets().find((asset) => asset.code === assetCode)?.issuer;
}

/**
 * `true` when the send form should offer this asset: native XLM, or an issued
 * asset allowlisted by the SDK for the current network.
 */
export function isAssetAvailable(assetCode: string): boolean {
  return assetCode === NATIVE_ASSET_CODE || Boolean(getAssetIssuer(assetCode));
}

/** Asset codes to render in the send form's asset selector, in display order. */
export function supportedAssetCodes(): string[] {
  return [NATIVE_ASSET_CODE, ...supportedIssuedAssets().map((asset) => asset.code)];
}
