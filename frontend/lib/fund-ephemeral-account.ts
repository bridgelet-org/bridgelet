import { Asset, BASE_FEE, Horizon, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { signFreighterTransaction } from '@/lib/wallet';

/**
 * Step 2 of the send flow.
 *
 * `POST /accounts` only provisions the ephemeral account on-chain (the backend
 * covers its 2 XLM base reserve) and initialises the Soroban contract. It does
 * NOT move the sender's money: the account is returned in `pending_payment`
 * and waits for an inbound Stellar payment to `publicKey`. The backend's
 * payment monitor (30s poll) then records it on the contract and flips the
 * account to `pending_claim`.
 *
 * This helper builds that payment from the sender's wallet, has Freighter sign
 * it, and submits it to Horizon directly from the browser.
 */

export class FundingError extends Error {
  readonly code:
    | 'UNSUPPORTED_ASSET'
    | 'MISSING_TRUSTLINE'
    | 'INSUFFICIENT_BALANCE'
    | 'USER_REJECTED'
    | 'SIGNER_MISMATCH'
    | 'SUBMIT_FAILED';

  constructor(code: FundingError['code'], message: string) {
    super(message);
    this.name = 'FundingError';
    this.code = code;
  }
}

/** A non-native balance line as returned by Horizon's account response. */
interface IssuedBalanceLine {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

/**
 * Confirms the sender actually holds a trustline (and enough balance) for an
 * issued asset before asking them to sign. Horizon rejects the payment anyway,
 * but only after a wallet round-trip, so failing early gives a clearer message.
 */
function assertCanPayIssuedAsset(
  balances: readonly IssuedBalanceLine[],
  assetCode: string,
  assetIssuer: string,
  amount: string,
): void {
  const line = balances.find(
    (b) =>
      b.asset_type !== 'native' &&
      b.asset_code === assetCode &&
      b.asset_issuer === assetIssuer,
  );
  if (!line) {
    throw new FundingError(
      'MISSING_TRUSTLINE',
      `Your wallet has no ${assetCode} trustline. Add one in Freighter before sending ${assetCode}.`,
    );
  }
  if (Number(line.balance) < Number(amount)) {
    throw new FundingError(
      'INSUFFICIENT_BALANCE',
      `Your ${assetCode} balance is too low to send ${amount} ${assetCode}.`,
    );
  }
}

const HORIZON_URLS: Record<string, string> = {
  'stellar-testnet': 'https://horizon-testnet.stellar.org',
  'stellar-mainnet': 'https://horizon.stellar.org',
};

function horizonUrl(): string {
  const override = process.env['NEXT_PUBLIC_HORIZON_URL'];
  if (override && override.trim()) return override.trim();
  const network = process.env['NEXT_PUBLIC_CRYPTO_NETWORK'] ?? 'stellar-testnet';
  return HORIZON_URLS[network] ?? HORIZON_URLS['stellar-testnet']!;
}

export interface FundEphemeralAccountParams {
  /** Sender's connected wallet (the `fundingSource` sent to POST /accounts). */
  from: string;
  /** `publicKey` from the POST /accounts response. */
  to: string;
  /** Decimal string, max 7 decimal places. */
  amount: string;
  /** Asset code: `XLM` for the native asset, or an issued code such as `USDC`. */
  assetCode: string;
  /** Issuer account for an issued asset; ignored for `XLM`. */
  assetIssuer?: string;
}

export async function fundEphemeralAccount(
  params: FundEphemeralAccountParams,
): Promise<{ txHash: string }> {
  const isNative = params.assetCode === 'XLM';

  // An issued asset (e.g. USDC) needs both a code and its issuer to build the
  // payment. Refuse early with a clear message rather than sending a malformed
  // asset down to Horizon.
  if (!isNative && !params.assetIssuer) {
    throw new FundingError(
      'UNSUPPORTED_ASSET',
      `${params.assetCode} is not supported yet — no issuer is configured for this network. Please send XLM.`,
    );
  }

  const url = horizonUrl();
  const server = new Horizon.Server(url, {
    // stellar-sdk refuses `http://` Horizon URLs unless explicitly allowed.
    // Production points at https; local dev and the e2e stub use http://localhost.
    allowHttp: url.startsWith('http://'),
  });

  let unsignedXdr: string;
  let networkPassphrase: string;
  try {
    const sourceAccount = await server.loadAccount(params.from);
    const fee = String(BASE_FEE);
    networkPassphrase =
      (process.env['NEXT_PUBLIC_CRYPTO_NETWORK'] ?? 'stellar-testnet') === 'stellar-mainnet'
        ? 'Public Global Stellar Network ; September 2015'
        : 'Test SDF Network ; September 2015';

    // Verify the sender can actually pay an issued asset before prompting them
    // to sign: no trustline (op_no_trust) or too little balance (op_underfunded)
    // otherwise only fail after the wallet round-trip.
    const asset = isNative
      ? Asset.native()
      : new Asset(params.assetCode, params.assetIssuer!);
    if (!isNative) {
      assertCanPayIssuedAsset(
        sourceAccount.balances as IssuedBalanceLine[],
        params.assetCode,
        params.assetIssuer!,
        params.amount,
      );
    }

    unsignedXdr = new TransactionBuilder(sourceAccount, { fee, networkPassphrase })
      .addOperation(
        Operation.payment({
          destination: params.to,
          asset,
          amount: params.amount,
        }),
      )
      .setTimeout(180)
      .build()
      .toXDR();
  } catch (err) {
    // A FundingError from the trustline/balance pre-check is already user-facing.
    if (err instanceof FundingError) throw err;
    throw new FundingError(
      'SUBMIT_FAILED',
      err instanceof Error
        ? `Could not build the payment: ${err.message}`
        : 'Could not build the payment.',
    );
  }

  let signed;
  try {
    signed = await signFreighterTransaction(unsignedXdr);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/reject|declin|denied|cancel/i.test(msg)) {
      throw new FundingError(
        'USER_REJECTED',
        'Payment was not approved in Freighter. Approve it to fund the claim link.',
      );
    }
    throw new FundingError('SUBMIT_FAILED', msg);
  }

  if (signed.signerAddress !== params.from) {
    throw new FundingError(
      'SIGNER_MISMATCH',
      'The connected Freighter account does not match the wallet you selected. Reconnect and try again.',
    );
  }

  try {
    const tx = TransactionBuilder.fromXDR(signed.signedTxXdr, networkPassphrase);
    const result = await server.submitTransaction(tx);
    return { txHash: result.hash };
  } catch (err) {
    // Horizon puts the useful reason (e.g. op_underfunded) in result_codes.
    const codes = (
      err as { response?: { data?: { extras?: { result_codes?: unknown } } } }
    )?.response?.data?.extras?.result_codes;
    throw new FundingError(
      'SUBMIT_FAILED',
      codes
        ? `Payment failed on the network: ${JSON.stringify(codes)}`
        : err instanceof Error
          ? err.message
          : 'Payment failed on the network.',
    );
  }
}
