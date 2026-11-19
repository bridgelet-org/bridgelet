// Pure helpers for docs/analytics-spec.md §8.1/§8.2 sender-side KPIs.
import type { ShareMethod } from './analytics';

function pct(numerator: number, denominator: number): number | null {
  return denominator > 0 ? (numerator / denominator) * 100 : null;
}

/** Expiry Rate = payments expired with no Claim Succeeded ÷ total Payment Created × 100. */
export function expiryRate(expiredUnclaimed: number, paymentsCreated: number): number | null {
  return pct(expiredUnclaimed, paymentsCreated);
}

/** Reclaim Rate = Funds Reclaimed events ÷ payments with "expired" status × 100. */
export function reclaimRate(fundsReclaimed: number, expiredPayments: number): number | null {
  return pct(fundsReclaimed, expiredPayments);
}

/** Sender Activation Rate = unique anonymous_ids with ≥1 Payment Created ÷ unique ids with homepage Page Viewed × 100. */
export function senderActivationRate(payerIds: string[], visitorIds: string[]): number | null {
  return pct(new Set(payerIds).size, new Set(visitorIds).size);
}

/** Share Method Distribution (§8.2): % of Claim Link Shared events per channel. */
export function shareMethodDistribution(shares: ShareMethod[]): Record<ShareMethod, number> {
  const out: Record<ShareMethod, number> = { sms: 0, email: 0, whatsapp: 0, qr_code: 0 };
  if (shares.length === 0) return out;
  for (const method of shares) out[method] += 1;
  for (const method of Object.keys(out) as ShareMethod[]) {
    out[method] = (out[method] / shares.length) * 100;
  }
  return out;
}
