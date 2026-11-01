/**
 * Builds a stellar.expert transaction URL for a Stellar transaction hash.
 *
 * Only a real 64-character hex transaction hash is accepted, so a wrong value
 * (for example a claim token, which is a bearer credential) can never be put
 * into a third-party URL. Returns `undefined` when the hash is missing or
 * malformed so callers can hide the link.
 */
const TX_HASH_PATTERN = /^[0-9a-f]{64}$/i;

export function explorerNetworkSegment(network: string | undefined): 'testnet' | 'public' {
  const value = (network ?? '').toLowerCase();
  return value.includes('mainnet') || value === 'public' ? 'public' : 'testnet';
}

export function explorerTxUrl(
  txHash: string | undefined,
  network: string | undefined = process.env['NEXT_PUBLIC_CRYPTO_NETWORK'],
): string | undefined {
  if (!txHash || !TX_HASH_PATTERN.test(txHash)) return undefined;
  return `https://stellar.expert/explorer/${explorerNetworkSegment(network)}/tx/${txHash}`;
}
