import { describe, expect, it } from 'vitest';
import { DASHBOARD_FILTERS } from '@/lib/analytics';
import { DASHBOARD_FILTER_LABELS, matchesDashboardFilter } from '@/lib/dashboard-filter';

const STATUSES = [
  'initializing',
  'pending_payment',
  'pending_claim',
  'claiming',
  'partial_sweep',
  'claimed',
  'expired',
  'failed',
];

describe('dashboard status filter mapping (§4.5)', () => {
  it('has a label for each value of the closed filter set', () => {
    expect(Object.keys(DASHBOARD_FILTER_LABELS).sort()).toEqual([...DASHBOARD_FILTERS].sort());
  });

  it('lists every status under "all"', () => {
    for (const status of STATUSES) expect(matchesDashboardFilter(status, 'all')).toBe(true);
    expect(matchesDashboardFilter('a_status_added_later', 'all')).toBe(true);
  });

  it('puts each non-failed status in exactly one status bucket', () => {
    const buckets = ['unclaimed', 'claimed', 'expired'] as const;
    for (const status of STATUSES.filter((s) => s !== 'failed')) {
      const hits = buckets.filter((bucket) => matchesDashboardFilter(status, bucket));
      expect(hits, status).toHaveLength(1);
    }
  });

  it('maps the lifecycle statuses as documented', () => {
    expect(matchesDashboardFilter('pending_claim', 'unclaimed')).toBe(true);
    expect(matchesDashboardFilter('pending_payment', 'unclaimed')).toBe(true);
    expect(matchesDashboardFilter('claiming', 'unclaimed')).toBe(true);
    expect(matchesDashboardFilter('claimed', 'claimed')).toBe(true);
    expect(matchesDashboardFilter('partial_sweep', 'claimed')).toBe(true);
    expect(matchesDashboardFilter('expired', 'expired')).toBe(true);
  });

  it('keeps a failed or unknown payment out of every status bucket', () => {
    for (const bucket of ['unclaimed', 'claimed', 'expired'] as const) {
      expect(matchesDashboardFilter('failed', bucket)).toBe(false);
      expect(matchesDashboardFilter('a_status_added_later', bucket)).toBe(false);
    }
  });
});
