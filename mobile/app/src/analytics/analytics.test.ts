describe('mobile analytics', () => {
  const originalDev = (global as any).__DEV__;

  beforeEach(() => {
    jest.resetModules();
    (global as any).__DEV__ = false;
    delete (globalThis as any).posthog;
    delete (globalThis as any).analytics;
  });

  afterAll(() => {
    (global as any).__DEV__ = originalDev;
  });

  it('dispatches to a production analytics provider for tracked events', () => {
    const capture = jest.fn();
    (globalThis as any).posthog = { capture };

    const { track } = require('./analytics');

    track({
      name: 'Claim Page Opened',
      params: { claim_id: 'claim_123', entry_channel: 'direct' },
    });

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture.mock.calls[0][0]).toBe('Claim Page Opened');
    expect(capture.mock.calls[0][1]).toMatchObject({
      claim_id: 'claim_123',
      entry_channel: 'direct',
      platform: 'ios',
    });
  });

  it('uses the spec-aligned Title Case screen event name', () => {
    const trackSpy = jest.fn();
    jest.doMock('../analytics/analytics', () => ({ track: trackSpy }));
    jest.doMock('react', () => ({
      useEffect: (effect: () => void) => effect(),
    }));

    const { useScreenTracking } = require('../hooks/useScreenTracking');
    useScreenTracking('wallet');

    expect(trackSpy).toHaveBeenCalledWith({
      name: 'Page Viewed',
      params: { page: 'wallet', journey: 'shared' },
    });
  });
});
