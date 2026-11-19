import { afterEach, describe, expect, it, vi } from 'vitest';
import { analytics, DASHBOARD_FILTERS } from '@/lib/analytics';

type Plausible = ReturnType<typeof vi.fn>;

const install = (): Plausible => {
  const mock = vi.fn();
  (window as unknown as { plausible?: Plausible }).plausible = mock;
  return mock;
};

const lastCall = (mock: Plausible): [string, { props: Record<string, unknown> }] =>
  mock.mock.calls[mock.mock.calls.length - 1] as [string, { props: Record<string, unknown> }];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (window as unknown as { plausible?: unknown }).plausible;
});

describe('sender events (§4.3–§4.5)', () => {
  it('Wallet Connection Failed carries the wallet type and error code', () => {
    const plausible = install();

    analytics.walletConnectionFailed({ walletType: 'Freighter', errorCode: 'CONNECTION_DENIED' });

    const [name, { props }] = lastCall(plausible);
    expect(name).toBe('Wallet Connection Failed');
    expect(props).toEqual(
      expect.objectContaining({
        journey: 'sender',
        wallet_type: 'Freighter',
        error_code: 'CONNECTION_DENIED',
      }),
    );
  });

  it('Wallet Connection Failed defaults the error code to "unknown"', () => {
    const plausible = install();

    analytics.walletConnectionFailed({ walletType: 'Freighter' });

    expect(lastCall(plausible)[1].props.error_code).toBe('unknown');
  });

  it('Payment Creation Failed carries asset type and error code, and omits a missing asset', () => {
    const plausible = install();

    analytics.paymentCreationFailed({ assetType: 'XLM', errorCode: 'SUBMIT_FAILED' });
    expect(lastCall(plausible)[0]).toBe('Payment Creation Failed');
    expect(lastCall(plausible)[1].props).toEqual(
      expect.objectContaining({ journey: 'sender', asset_type: 'XLM', error_code: 'SUBMIT_FAILED' }),
    );

    analytics.paymentCreationFailed({});
    expect(lastCall(plausible)[1].props).not.toHaveProperty('asset_type');
    expect(lastCall(plausible)[1].props.error_code).toBe('unknown');
  });

  it('Payment Success Viewed carries the claim id and asset type', () => {
    const plausible = install();

    analytics.paymentSuccessViewed({ claimId: 'acct-1', assetType: 'XLM' });

    const [name, { props }] = lastCall(plausible);
    expect(name).toBe('Payment Success Viewed');
    expect(props).toEqual(
      expect.objectContaining({ journey: 'sender', claim_id: 'acct-1', asset_type: 'XLM' }),
    );
  });

  it('Dashboard Viewed carries the payment count and the active filter', () => {
    const plausible = install();

    analytics.dashboardViewed({ totalPayments: 7, activeFilter: 'all' });

    const [name, { props }] = lastCall(plausible);
    expect(name).toBe('Dashboard Viewed');
    expect(props).toEqual(
      expect.objectContaining({ journey: 'sender', total_payments: 7, active_filter: 'all' }),
    );
  });

  it('Dashboard Filter Applied carries one value of the closed filter set', () => {
    const plausible = install();

    for (const filter of DASHBOARD_FILTERS) {
      analytics.dashboardFilterApplied({ filter });
      const [name, { props }] = lastCall(plausible);
      expect(name).toBe('Dashboard Filter Applied');
      expect(props).toEqual(expect.objectContaining({ journey: 'sender', filter }));
    }
    expect([...DASHBOARD_FILTERS]).toEqual(['all', 'unclaimed', 'claimed', 'expired']);
  });

  it('Payment Cancelled carries the claim id, asset and hours since creation', () => {
    const plausible = install();

    analytics.paymentCancelled({ claimId: 'acct-2', assetType: 'XLM', timeSinceCreationHours: 5 });

    const [name, { props }] = lastCall(plausible);
    expect(name).toBe('Payment Cancelled');
    expect(props).toEqual(
      expect.objectContaining({
        journey: 'sender',
        claim_id: 'acct-2',
        asset_type: 'XLM',
        time_since_creation_hours: 5,
      }),
    );
  });

  it('Funds Reclaimed carries the claim id, asset and days expired', () => {
    const plausible = install();

    analytics.fundsReclaimed({ claimId: 'acct-3', assetType: 'XLM', daysExpired: 2 });

    const [name, { props }] = lastCall(plausible);
    expect(name).toBe('Funds Reclaimed');
    expect(props).toEqual(
      expect.objectContaining({ journey: 'sender', claim_id: 'acct-3', asset_type: 'XLM', days_expired: 2 }),
    );
  });
});

describe('recipient wallet address events (§5.2)', () => {
  it('Wallet Address Screen Viewed carries the claim id and whether a previous address was offered', () => {
    const plausible = install();

    analytics.walletAddressScreenViewed({ claimId: 'claim-1', hasPreviousAddress: false });

    const [name, { props }] = lastCall(plausible);
    expect(name).toBe('Wallet Address Screen Viewed');
    expect(props).toEqual(
      expect.objectContaining({ journey: 'recipient', claim_id: 'claim-1', has_previous_address: false }),
    );
  });

  it('Wallet Address Entered carries the claim id and reuse flag, and never an address', () => {
    const plausible = install();

    analytics.walletAddressEntered({ claimId: 'claim-1', usedPreviousAddress: false });

    const [name, { props }] = lastCall(plausible);
    expect(name).toBe('Wallet Address Entered');
    expect(props).toEqual(
      expect.objectContaining({ journey: 'recipient', claim_id: 'claim-1', used_previous_address: false }),
    );
    expect(Object.keys(props)).not.toContain('wallet_address');
    expect(Object.keys(props)).not.toContain('address');
  });
});
