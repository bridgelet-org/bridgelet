// Pure helpers for docs/analytics-spec.md §7.2/§7.3 funnels and §8.1 CCR/TTC.
// They take already-aggregated counts so any query/dashboard layer can reuse them.

export const RECIPIENT_FUNNEL_STAGES = [
  'Claim Page Opened',
  'Claim Verified',
  'Claim CTA Clicked',
  'Wallet Address Entered',
  'Claim Submitted',
  'Claim Succeeded',
] as const;

export const END_TO_END_FUNNEL_STAGES = [
  'Page Viewed',
  'Payment Created',
  'Claim Page Opened',
  'Claim Succeeded',
] as const;

export interface FunnelStep {
  stage: string;
  count: number;
  /** % of the previous stage; null for the first stage or when the previous count is 0. */
  pctOfPrevious: number | null;
}

export function funnelSteps(stages: readonly string[], counts: Record<string, number>): FunnelStep[] {
  return stages.map((stage, i) => {
    const count = counts[stage] ?? 0;
    const prevStage = stages[i - 1];
    const prev = prevStage === undefined ? 0 : (counts[prevStage] ?? 0);
    return { stage, count, pctOfPrevious: prev > 0 ? (count / prev) * 100 : null };
  });
}

/** §8.1 CCR = Claim Succeeded ÷ Claim Verified × 100 (null when nothing was verified). */
export function claimConversionRate(verified: number, succeeded: number): number | null {
  return verified > 0 ? (succeeded / verified) * 100 : null;
}

/** §8.1 TTC = median(Claim Succeeded.timestamp − Payment Created.timestamp) over matched claim_id pairs, in ms. */
export function medianTimeToClaimMs(pairs: Array<{ createdAt: number; claimedAt: number }>): number | null {
  const deltas = pairs.map((p) => p.claimedAt - p.createdAt).filter((d) => d >= 0).sort((a, b) => a - b);
  if (deltas.length === 0) return null;
  const mid = Math.floor(deltas.length / 2);
  const upper = deltas[mid] ?? 0;
  const lower = deltas[mid - 1] ?? upper;
  return deltas.length % 2 ? upper : (lower + upper) / 2;
}
