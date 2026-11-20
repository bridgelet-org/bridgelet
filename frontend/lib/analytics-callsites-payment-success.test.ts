import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { analytics } from '@/lib/analytics';

const source = (relativePath: string) => readFileSync(resolve(__dirname, '..', relativePath), 'utf8');

const CONFIRM_STEP = 'components/send-form/steps/confirm-step.tsx';
const SEND_HISTORY = 'components/send-history.tsx';

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

describe('#992 Payment Success Viewed', () => {
  it('is emitted from the success phase, once, and only with a created account', () => {
    const step = source(CONFIRM_STEP);
    const viewed = step.indexOf('analytics.paymentSuccessViewed(');
    const effect = step.lastIndexOf('useEffect(', viewed);
    const guard = step.slice(effect, viewed);

    expect(viewed).toBeGreaterThan(-1);
    expect(step.lastIndexOf('analytics.paymentSuccessViewed(')).toBe(viewed);
    expect(guard).toContain("submitPhase !== 'success'");
    expect(guard).toContain('!createdAccountId');
    expect(guard).toContain('successViewedRef.current');
  });

  it('is registered before the success screen returns, so the hook order is stable', () => {
    const step = source(CONFIRM_STEP);

    expect(step.indexOf('analytics.paymentSuccessViewed(')).toBeLessThan(step.indexOf("if (submitPhase === 'success') {"));
  });

  it('sends the spec event with the claim id and asset', () => {
    const { name, props } = capture(() => analytics.paymentSuccessViewed({ claimId: 'acct-1', assetType: 'XLM' }));

    expect(name).toBe('Payment Success Viewed');
    expect(props).toEqual(expect.objectContaining({ journey: 'sender', claim_id: 'acct-1', asset_type: 'XLM' }));
  });
});

describe('#993 Claim Link Copied', () => {
  it('is emitted from both the success screen and the history recovery panel, after the copy succeeds', () => {
    const step = source(CONFIRM_STEP);
    const history = source(SEND_HISTORY);

    expect(step.indexOf('analytics.claimLinkCopied(')).toBeGreaterThan(step.indexOf('navigator.clipboard.writeText(claimUrl)'));
    expect(history.indexOf('analytics.claimLinkCopied(')).toBeGreaterThan(
      history.indexOf('navigator.clipboard.writeText(claimUrl)'),
    );
  });

  it('records where the link was copied', () => {
    expect(source(CONFIRM_STEP)).toContain("copyLocation: 'success_screen'");
    expect(source(SEND_HISTORY)).toContain("copyLocation: 'send_history_recovery'");
  });

  it('sends the spec event name', () => {
    const { name, props } = capture(() =>
      analytics.claimLinkCopied({ claimId: 'acct-1', copyLocation: 'success_screen' }),
    );

    expect(name).toBe('Claim Link Copied');
    expect(props).toEqual(expect.objectContaining({ journey: 'sender', claim_id: 'acct-1' }));
  });
});

describe('#994 Claim Link Shared', () => {
  it('is emitted from the share actions on the success screen and in the history', () => {
    expect(source(CONFIRM_STEP)).toContain("analytics.claimLinkShared({ claimId: createdAccountId, shareMethod: 'whatsapp' })");
    expect(source(SEND_HISTORY)).toContain("analytics.claimLinkShared({ claimId: accountId, shareMethod: 'whatsapp' })");
  });

  it('sends the spec event name and the share method', () => {
    const { name, props } = capture(() => analytics.claimLinkShared({ claimId: 'acct-1', shareMethod: 'whatsapp' }));

    expect(name).toBe('Claim Link Shared');
    expect(props).toEqual(expect.objectContaining({ journey: 'sender', claim_id: 'acct-1', share_method: 'whatsapp' }));
  });
});

describe('#995 Dashboard Viewed', () => {
  it('is emitted from the history page once the list has loaded, not from the load request itself', () => {
    const history = source(SEND_HISTORY);
    const viewed = history.indexOf('analytics.dashboardViewed(');
    const effect = history.lastIndexOf('useEffect(', viewed);

    expect(viewed).toBeGreaterThan(-1);
    expect(history.slice(effect, viewed)).toContain('if (loading || error || dashboardViewedRef.current) return;');
    expect(history.lastIndexOf('analytics.dashboardViewed(')).toBe(viewed);
  });

  it('reports the "all" filter, as the dashboard has no other filter state on load', () => {
    expect(source(SEND_HISTORY)).toContain("activeFilter: 'all'");
  });

  it('sends the spec event with the payment count and active filter', () => {
    const { name, props } = capture(() => analytics.dashboardViewed({ totalPayments: 4, activeFilter: 'all' }));

    expect(name).toBe('Dashboard Viewed');
    expect(props).toEqual(expect.objectContaining({ journey: 'sender', total_payments: 4, active_filter: 'all' }));
  });
});
