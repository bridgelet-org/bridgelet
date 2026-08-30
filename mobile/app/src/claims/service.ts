import { validateClaimToken } from "./token";
import { apiClient } from "../utils/apiClient";

export type ClaimLookupResult = {
  accountId: string;
  amount: string;
  asset: string;
  expiresAt?: string;
};

type VerifyClaimResponse = {
  valid: boolean;
  accountId: string;
  amount: string;
  asset: string;
  expiresAt: Date;
};

/**
 * Resolve a claim token against the Bridgelet SDK `POST /claims/verify`
 * endpoint. The server performs authoritative verification (JWT signature,
 * expiry, account status) and returns the claim details; the client no longer
 * decodes the token payload locally (the SDK signs only publicKey/type/jti,
 * not the account details).
 */
export const lookupClaimByToken = async (
  token: string,
): Promise<ClaimLookupResult> => {
  validateClaimToken(token);

  try {
    const result = await apiClient<VerifyClaimResponse>("/claims/verify", {
      method: "POST",
      body: JSON.stringify({ claimToken: token }),
    });
    return {
      accountId: result.accountId,
      amount: result.amount,
      asset: result.asset,
      expiresAt: result.expiresAt ? new Date(result.expiresAt).toISOString() : undefined,
    };
  } catch (error: any) {
    if (error?.status === 401) {
      throw new Error("This claim link is invalid or has expired.");
    }
    if (error?.status === 409) {
      throw new Error("This payment has already been claimed.");
    }
    if (error?.status === 400) {
      throw new Error("This payment is not ready to be claimed yet.");
    }
    throw new Error("Unable to verify this claim token. Please try again.");
  }
};
