import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { analytics } from '@/lib/analytics';

const source = (relativePath: string) => readFileSync(resolve(__dirname, '..', relativePath), 'utf8');

function capture(emit: () => void): { name: string; props: Record<string, unknown> } {
  const plausible = vi.fn();
  (window as unknown as { plausible?: unknown }).plausible = plausible;
  emit();
  const [name, options] = plausible.mock.calls[0]! as [string, { props: Record<string, unknown> }];
  return { name, props: options.props };
}

afterEach(() => {
  delete (window as unknown as { plausible?: unknown }).plausible;
});

describe('#996 Dashboard Filter Applied', () => {
  it('is emitted from the filter change handler, after the "same filter" guard', () => {
    const history = source('components/send-history.tsx');
    const handler = history.indexOf('function handleFilterChange(');
    const guard = history.indexOf('if (next === filter) return;', handler);
    const emit = history.indexOf('analytics.dashboardFilterApplied(', handler);

    expect(handler).toBeGreaterThan(-1);
    expect(emit).toBeGreaterThan(guard);
    expect(history.lastIndexOf('analytics.dashboardFilterApplied(')).toBe(emit);
  });

  it('is not emitted from the load path', () => {
    const history = source('components/send-history.tsx');
    const load = history.indexOf('const load = useCallback(');
    const loadEnd = history.indexOf('}, []);', load);

    expect(history.slice(load, loadEnd)).not.toContain('dashboardFilterApplied');
  });

  it('sends the spec event with only the lowercase filter value', () => {
    const { name, props } = capture(() => analytics.dashboardFilterApplied({ filter: 'unclaimed' }));

    expect(name).toBe('Dashboard Filter Applied');
    expect(props.journey).toBe('sender');
    expect(props.filter).toBe('unclaimed');
  });
});

describe('#997 Payment Details Viewed', () => {
  it('is emitted for the sender\'s own just-created payment, from the payment record they received', () => {
    const step = source('components/send-form/steps/confirm-step.tsx');
    const created = step.indexOf('analytics.paymentCreated(');
    const details = step.indexOf('analytics.paymentDetailsViewed(');

    expect(details).toBeGreaterThan(created);
    expect(step.slice(details, step.indexOf(';', details))).toContain('claimId: account.accountId');
  });

  it('is never fed a claim id taken from the URL', () => {
    const step = source('components/send-form/steps/confirm-step.tsx');
    const call = step.slice(step.indexOf('analytics.paymentDetailsViewed('));

    expect(call.slice(0, call.indexOf(';'))).not.toMatch(/params|searchParams|location/);
  });

  it('sends the spec event with the claim status', () => {
    const { name, props } = capture(() =>
      analytics.paymentDetailsViewed({ claimId: 'acct-1', claimStatus: 'unclaimed' }),
    );

    expect(name).toBe('Payment Details Viewed');
    expect(props).toEqual(
      expect.objectContaining({ journey: 'sender', claim_id: 'acct-1', claim_status: 'unclaimed' }),
    );
  });
});

describe('#998 Payment Cancelled and #999 Funds Reclaimed', () => {
  it('Payment Cancelled is sent with the spec name and payload', () => {
    const { name, props } = capture(() =>
      analytics.paymentCancelled({ claimId: 'acct-2', assetType: 'XLM', timeSinceCreationHours: 3 }),
    );

    expect(name).toBe('Payment Cancelled');
    expect(props).toEqual(
      expect.objectContaining({ journey: 'sender', claim_id: 'acct-2', time_since_creation_hours: 3 }),
    );
  });

  it('Funds Reclaimed is sent with the spec name and payload', () => {
    const { name, props } = capture(() =>
      analytics.fundsReclaimed({ claimId: 'acct-3', assetType: 'XLM', daysExpired: 2 }),
    );

    expect(name).toBe('Funds Reclaimed');
    expect(props).toEqual(
      expect.objectContaining({ journey: 'sender', claim_id: 'acct-3', days_expired: 2 }),
    );
  });
});
