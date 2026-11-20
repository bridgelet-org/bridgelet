import type { DashboardFilter } from '@/lib/analytics';

/** Dashboard labels for the closed `Dashboard Filter Applied.filter` set (`docs/analytics-spec.md` §4.5). */
export const DASHBOARD_FILTER_LABELS: Record<DashboardFilter, string> = {
  all: 'All',
  unclaimed: 'Unclaimed',
  claimed: 'Claimed',
  expired: 'Expired',
};

/**
 * The one fixed mapping from a backend lifecycle status to a status bucket, so a payment can
 * never be counted under two filters (the open item in §4.5):
 *
 * - `unclaimed`: the recipient has not taken the funds and the payment has not expired
 *   (`initializing`, `pending_payment`, `pending_claim`, and `claiming` while a claim is in flight)
 * - `claimed`:   the recipient has claimed (`claimed`, and `partial_sweep`, where a claim was made
 *   but the sweep is not complete)
 * - `expired`:   past its expiry
 *
 * `failed` belongs to no status bucket: it is listed only under `all`.
 */
const STATUS_BUCKET: Record<string, Exclude<DashboardFilter, 'all'>> = {
  initializing: 'unclaimed',
  pending_payment: 'unclaimed',
  pending_claim: 'unclaimed',
  claiming: 'unclaimed',
  claimed: 'claimed',
  partial_sweep: 'claimed',
  expired: 'expired',
};

/** Whether a payment with this status is listed under `filter`. */
export function matchesDashboardFilter(status: string, filter: DashboardFilter): boolean {
  if (filter === 'all') return true;
  return STATUS_BUCKET[status] === filter;
}
