// Small normalisers for §3.2 conditional properties `asset_type`, `amount_usd_equiv`, `claim_id`.

/** `asset_type`: trimmed, upper-cased asset code ("xlm " -> "XLM"); undefined when empty. */
export function normalizeAssetType(code?: string | null): string | undefined {
  const value = code?.trim().toUpperCase();
  return value ? value : undefined;
}

/**
 * `amount_usd_equiv`: amount × USD rate at event time, rounded to 2 decimals.
 * Returns undefined for non-finite or negative input so a bad rate never reaches a dashboard.
 */
export function toUsdEquiv(amount: number, usdRate: number): number | undefined {
  const value = amount * usdRate;
  if (!Number.isFinite(value) || value < 0) return undefined;
  return Math.round(value * 100) / 100;
}

/** `claim_id` must be a non-empty string to be used as a join key. */
export function isValidClaimId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
