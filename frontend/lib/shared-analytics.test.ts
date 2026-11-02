import { describe, it, expect, vi } from 'vitest';
import {
  ANALYTICS_EVENT_NAMES,
  STANDARD_ERROR_TYPES,
  ERROR_TYPES,
  createBasePayload,
  isStandardErrorType,
  isStandardEventName,
  createDeduplicationStore,
  AnalyticsDispatcher,
  type AnalyticsProvider,
} from '@bridgelet/analytics';

describe('@bridgelet/analytics shared core package (#889)', () => {
  it('contains exactly 34 standard analytics event names', () => {
    expect(ANALYTICS_EVENT_NAMES.length).toBe(34);
    expect(ANALYTICS_EVENT_NAMES).toContain('Claim Page Opened');
    expect(ANALYTICS_EVENT_NAMES).toContain('Payment Created');
    expect(ANALYTICS_EVENT_NAMES).toContain('Payment Details Viewed');
    expect(ANALYTICS_EVENT_NAMES).toContain('Retry Clicked');
  });

  it('validates standard event names correctly', () => {
    expect(isStandardEventName('Claim Succeeded')).toBe(true);
    expect(isStandardEventName('Unknown Fake Event')).toBe(false);
    expect(isStandardEventName(123)).toBe(false);
  });

  it('contains exactly 8 taxonomy error types', () => {
    expect(STANDARD_ERROR_TYPES.length).toBe(8);
    expect(STANDARD_ERROR_TYPES).toContain('invalid_token');
    expect(STANDARD_ERROR_TYPES).toContain('wallet_connection_failed');
    expect(Object.keys(ERROR_TYPES).length).toBe(8);
  });

  it('validates error types correctly', () => {
    expect(isStandardErrorType('invalid_token')).toBe(true);
    expect(isStandardErrorType('random_error')).toBe(false);
  });

  describe('createBasePayload', () => {
    it('creates web base payload with defaults', () => {
      const payload = createBasePayload({
        platform: 'web',
        appVersion: '1.2.3',
        deviceType: 'desktop',
      });

      expect(payload.platform).toBe('web');
      expect(payload.app_version).toBe('1.2.3');
      expect(payload.device_type).toBe('desktop');
      expect(payload.anonymous_id).toBeDefined();
      expect(payload.session_id).toBeDefined();
      expect(payload.message_id).toBeDefined();
      expect(payload.locale).toBe('en-US');
      expect(payload.timezone).toBe('UTC');
    });

    it('creates mobile base payload with mobile specifics', () => {
      const payload = createBasePayload({
        platform: 'mobile',
        appVersion: '2.0.0',
        deviceType: 'mobile',
        locale: 'es-MX',
        timezone: 'America/Mexico_City',
        screenWidth: 390,
        screenHeight: 844,
      });

      expect(payload.platform).toBe('mobile');
      expect(payload.app_version).toBe('2.0.0');
      expect(payload.device_type).toBe('mobile');
      expect(payload.locale).toBe('es-MX');
      expect(payload.timezone).toBe('America/Mexico_City');
      expect(payload.screen_width).toBe(390);
      expect(payload.screen_height).toBe(844);
    });
  });

  describe('createDeduplicationStore', () => {
    it('deduplicates repeat occurrences within TTL', () => {
      const store = createDeduplicationStore(10, 1000);
      expect(store.isDuplicate('key1', 0)).toBe(false);
      expect(store.isDuplicate('key1', 500)).toBe(true);
      expect(store.isDuplicate('key1', 1000)).toBe(false);
    });

    it('evicts oldest when capacity exceeded', () => {
      const store = createDeduplicationStore(2, 10000);
      store.isDuplicate('a', 0);
      store.isDuplicate('b', 1);
      expect(store.size()).toBe(2);

      // Touching 'a' makes 'b' the least recently used entry.
      expect(store.isDuplicate('a', 2)).toBe(true);
      store.isDuplicate('c', 3);

      expect(store.size()).toBe(2);
      // 'b' was the least recently used, so 'b' is what got evicted.
      expect(store.isDuplicate('b', 4)).toBe(false);
      // 'c' survived the cap and is still deduplicated.
      expect(store.isDuplicate('c', 4)).toBe(true);
    });
  });

  describe('AnalyticsDispatcher', () => {
    it('dispatches events to registered providers with base payload', () => {
      const mockProvider: AnalyticsProvider = {
        name: 'mock',
        track: vi.fn(),
      };

      const dispatcher = new AnalyticsDispatcher({
        providers: [mockProvider],
      });

      const base = createBasePayload({
        platform: 'web',
        appVersion: '1.0.0',
      });

      const tracked = dispatcher.track(
        'Claim CTA Clicked',
        { claim_id: 'claim_123', asset_type: 'usdc' },
        base
      );

      expect(tracked).toBe(true);
      expect(mockProvider.track).toHaveBeenCalledTimes(1);
      expect(mockProvider.track).toHaveBeenCalledWith('Claim CTA Clicked', expect.objectContaining({
        claim_id: 'claim_123',
        asset_type: 'usdc',
        platform: 'web',
        event_name: 'Claim CTA Clicked',
      }));
    });

    it('suppresses tracking when DNT is enabled', () => {
      const mockProvider: AnalyticsProvider = {
        name: 'mock',
        track: vi.fn(),
      };

      const dispatcher = new AnalyticsDispatcher({
        providers: [mockProvider],
        isDntEnabled: () => true,
      });

      const base = createBasePayload({ platform: 'web' });
      const tracked = dispatcher.track('Page Viewed', {}, base);

      expect(tracked).toBe(false);
      expect(mockProvider.track).not.toHaveBeenCalled();
    });

    it('suppresses duplicate Payment Created events for same claim_id', () => {
      const mockProvider: AnalyticsProvider = {
        name: 'mock',
        track: vi.fn(),
      };

      const dispatcher = new AnalyticsDispatcher({
        providers: [mockProvider],
      });

      const base = createBasePayload({ platform: 'web' });
      const first = dispatcher.track('Payment Created', { claim_id: 'same_tx' }, base);
      const second = dispatcher.track('Payment Created', { claim_id: 'same_tx' }, base);

      expect(first).toBe(true);
      expect(second).toBe(false);
      expect(mockProvider.track).toHaveBeenCalledTimes(1);
    });
  });
});
