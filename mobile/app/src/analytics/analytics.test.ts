import { track } from './analytics';

describe('track()', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as typeof globalThis & { posthog?: unknown }).posthog;
    delete (globalThis as typeof globalThis & { analytics?: unknown }).analytics;
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
  });

  it('routes production events through a real provider when available', () => {
    const capture = jest.fn();
    (globalThis as typeof globalThis & { posthog?: { capture: jest.Mock } }).posthog = {
      capture,
    };

    track({ name: 'Claim Page Opened', params: { claim_id: 'claim-123', entry_channel: 'direct' } });

    expect(capture).toHaveBeenCalledWith(
      'Claim Page Opened',
      expect.objectContaining({
        claim_id: 'claim-123',
        entry_channel: 'direct',
        platform: expect.stringMatching(/^(ios|android|web)$/),
      }),
    );
  });

  it('prefers the analytics provider over console logging in dev builds', () => {
    const capture = jest.fn();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    (globalThis as typeof globalThis & { posthog?: { capture: jest.Mock } }).posthog = { capture };
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

    track({ name: 'Page Viewed', params: { page: 'home', journey: 'shared', entry_source: 'mobile' } });

    expect(capture).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
