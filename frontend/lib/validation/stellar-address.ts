/**
 * Issue #420 — Shared Stellar public-key (address) format validation.
 *
 * Stellar public keys are StrKey-encoded ed25519 public keys: base32
 * (RFC 4648, alphabet A-Z2-7), always 56 characters, always starting with
 * `G`. This mirrors the regex that already existed in
 * `components/wallet-address-input.tsx` — extracted here so every place
 * that needs to validate a destination/funding address (the send form,
 * the wallet address input, etc.) shares one definition instead of each
 * hand-rolling its own.
 *
 * This is a format check only (correct shape), not a checksum/CRC
 * validation of the StrKey encoding — `@stellar/stellar-sdk`'s
 * `StrKey.isValidEd25519PublicKey` is available for a full checksum
 * check where it matters (e.g. before signing), but the lightweight regex
 * is sufficient — and synchronous/dependency-free — for inline form
 * validation.
 */
export const STELLAR_ADDRESS_PATTERN = /^G[A-Z2-7]{55}$/;

export const STELLAR_ADDRESS_ERROR = 'Enter a valid Stellar public key (starts with G, 56 characters).';

export function isValidStellarAddress(value: string): boolean {
  return STELLAR_ADDRESS_PATTERN.test(value.trim());
}
