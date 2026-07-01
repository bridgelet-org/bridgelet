import { API_KEY, SDK_URL } from './config';
import { BridgeletApiError } from './errors';

export interface CreateClaimResponse {
  token: string;
  ephemeralPublicKey: string;
  expiresAt: string;
}

export interface ClaimStatusResponse {
  status: 'unclaimed' | 'claimed' | 'expired';
  amount: string;
  asset: string;
  expiresAt: string;
}

export interface RedeemClaimResponse {
  transactionHash: string;
  destinationAddress: string;
}

function headers(): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) h['x-api-key'] = API_KEY;
  return h;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SDK_URL}${path}`, { ...init, headers: headers() });
  if (!res.ok) throw await BridgeletApiError.fromResponse(res);
  return res.json() as Promise<T>;
}

/** Create a single-use ephemeral Stellar account to receive a payment. */
export function createClaim(
  amount: string,
  asset: string,
  senderPublicKey: string,
): Promise<CreateClaimResponse> {
  return request('/claims', {
    method: 'POST',
    body: JSON.stringify({ amount, asset, senderPublicKey }),
  });
}

/** Get the current status and metadata for a claim token. */
export function getClaimStatus(token: string): Promise<ClaimStatusResponse> {
  return request(`/claims/${encodeURIComponent(token)}`);
}

/** Redeem a claim by sweeping funds to a permanent wallet address. */
export function redeemClaim(
  token: string,
  destinationAddress: string,
): Promise<RedeemClaimResponse> {
  return request(`/claims/${encodeURIComponent(token)}/redeem`, {
    method: 'POST',
    body: JSON.stringify({ destinationAddress }),
  });
}
