import {
  BridgeletApiError,
  type BridgeletClient,
  type PreparedAccountTransaction,
} from '@/lib/create-bridgelet-client';
import type { CreateAccountRequest } from '@/lib/bridgelet';
import {
  isFreighterTransactionSigningAvailable,
  signFreighterTransaction,
  type SignedFreighterTransaction,
} from '@/lib/wallet';

export type FreighterSigningMode = 'freighter-client' | 'backend';

export type FreighterSenderSigningResult =
  | {
      mode: 'freighter-client';
      signed: SignedFreighterTransaction;
      prepared: PreparedAccountTransaction;
    }
  | {
      mode: 'backend';
      reason: string;
    };

export class FreighterSenderSigningError extends Error {
  readonly code: 'USER_REJECTED' | 'SIGNER_MISMATCH' | 'SIGNING_FAILED';

  constructor(code: FreighterSenderSigningError['code'], message: string) {
    super(message);
    this.name = 'FreighterSenderSigningError';
    this.code = code;
  }
}

/** Feature flag for the Freighter sender-signing experiment (default: enabled). */
export function isFreighterSenderSigningEnabled(): boolean {
  const raw = process.env['NEXT_PUBLIC_ENABLE_FREIGHTER_SENDER_SIGNING'];
  if (raw == null || raw.trim() === '') return true;
  return !['0', 'false', 'off', 'no'].includes(raw.trim().toLowerCase());
}

export function isPrepareUnavailableError(err: unknown): boolean {
  if (err instanceof BridgeletApiError && [404, 405, 422, 501].includes(err.statusCode)) {
    return true;
  }
  if (!(err instanceof Error)) return false;
  return (
    err.message.includes('Missing unsigned transaction XDR') ||
    err.message.includes('Freighter transaction signing is not available')
  );
}

export function isUserRejectedSigningError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return (
    message.includes('user rejected') ||
    message.includes('user declined') ||
    message.includes('rejected by user') ||
    message.includes('denied by the user') ||
    message.includes('request was rejected')
  );
}

/**
 * Attempt experimental Freighter client-side signing for account creation.
 * Returns backend mode (with reason) when prepare/signing is unavailable.
 * Throws FreighterSenderSigningError when the user rejects or signer mismatches.
 */
export async function tryFreighterSenderSigning(
  client: Pick<BridgeletClient, 'prepareAccountTransaction'>,
  payload: CreateAccountRequest,
): Promise<FreighterSenderSigningResult> {
  if (!isFreighterSenderSigningEnabled()) {
    return { mode: 'backend', reason: 'feature-flag-disabled' };
  }

  if (!isFreighterTransactionSigningAvailable()) {
    return { mode: 'backend', reason: 'freighter-signing-unavailable' };
  }

  let prepared: PreparedAccountTransaction;
  try {
    prepared = await client.prepareAccountTransaction(payload);
  } catch (err) {
    if (isPrepareUnavailableError(err)) {
      return { mode: 'backend', reason: 'prepare-unavailable' };
    }
    throw err;
  }

  if (!prepared.unsignedTxXdr?.trim()) {
    return { mode: 'backend', reason: 'missing-unsigned-xdr' };
  }

  let signed: SignedFreighterTransaction;
  try {
    signed = await signFreighterTransaction(prepared.unsignedTxXdr);
  } catch (err) {
    if (isUserRejectedSigningError(err)) {
      throw new FreighterSenderSigningError(
        'USER_REJECTED',
        'Freighter signing was cancelled. Confirm again when you are ready to approve the transaction.',
      );
    }
    if (isPrepareUnavailableError(err)) {
      return { mode: 'backend', reason: 'freighter-signing-unavailable' };
    }
    throw new FreighterSenderSigningError(
      'SIGNING_FAILED',
      err instanceof Error ? err.message : 'Freighter signing failed.',
    );
  }

  if (signed.signerAddress !== payload.fundingSource) {
    throw new FreighterSenderSigningError(
      'SIGNER_MISMATCH',
      'Connected Freighter account does not match the funding wallet for this payment.',
    );
  }

  return { mode: 'freighter-client', signed, prepared };
}

export function toCreateAccountRequestWithFreighterSignature(
  payload: CreateAccountRequest,
  signed: SignedFreighterTransaction,
): CreateAccountRequest {
  return {
    ...payload,
    signedTxXdr: signed.signedTxXdr,
    signerAddress: signed.signerAddress,
    networkPassphrase: signed.networkPassphrase,
    signingMode: 'freighter-client',
  };
}
