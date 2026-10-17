import { afterEach, describe, expect, it } from 'vitest';
import { analytics } from '@/lib/analytics';
import { installMockPlausible } from './plausible';

describe('mock Plausible', () => {
  afterEach(() => {
    delete (window as unknown as { plausible?: unknown }).plausible;
  });

  it('captures the exact event name and props dispatched by track()', () => {
    const mock = installMockPlausible();

    analytics.errorDisplayed({
      journey: 'recipient',
      claimId: 'tok_1',
      errorType: 'expired_token',
      errorCode: 'TOKEN_EXPIRED',
      sourceScreen: 'claim_landing',
    });

    expect(mock.events).toHaveLength(1);
    expect(mock.events[0]!.name).toBe('Error Displayed');
    expect(mock.events[0]!.props).toEqual(
      expect.objectContaining({
        journey: 'recipient',
        claim_id: 'tok_1',
        error_type: 'expired_token',
        error_code: 'TOKEN_EXPIRED',
        source_screen: 'claim_landing',
      }),
    );
  });

  it('records multiple events in dispatch order', () => {
    const mock = installMockPlausible();

    analytics.sendFormViewed();
    analytics.claimPageOpened({ claimId: 'tok_2', entryChannel: 'sms' });

    expect(mock.events.map((event) => event.name)).toEqual([
      'Send Form Viewed',
      'Claim Page Opened',
    ]);
  });

  it('reset clears captured events without uninstalling', () => {
    const mock = installMockPlausible();
    analytics.sendFormViewed();
    expect(mock.events).toHaveLength(1);

    mock.reset();

    expect(mock.events).toHaveLength(0);
    expect(typeof (window as unknown as { plausible?: unknown }).plausible).toBe('function');
  });

  it('uninstall removes window.plausible', () => {
    const mock = installMockPlausible();
    expect(typeof (window as unknown as { plausible?: unknown }).plausible).toBe('function');

    mock.uninstall();

    expect((window as unknown as { plausible?: unknown }).plausible).toBeUndefined();
  });
});
