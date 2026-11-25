import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_KEY,
  getAnalyticsConsent,
  hasAnalyticsConsent,
  initConsentSync,
  purgeAnalyticsIdentifiers,
  resetAnalyticsConsent,
  revokeAnalyticsConsent,
  setAnalyticsConsent,
} from '@/lib/analytics-consent';

describe('analytics consent state (#1092)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetAnalyticsConsent();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('starts unset, so tracking is off until the visitor opts in', () => {
    expect(getAnalyticsConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('persists a grant and reads it back', () => {
    setAnalyticsConsent('granted');
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('granted');
    expect(getAnalyticsConsent()).toBe('granted');
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('persists a rejection and keeps tracking off', () => {
    setAnalyticsConsent('denied');
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('denied');
    expect(getAnalyticsConsent()).toBe('denied');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('treats unknown stored values as no decision (opt-in default)', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'yes');
    expect(getAnalyticsConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('emits a window event on every decision change', () => {
    const listener = vi.fn();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, listener);
    try {
      setAnalyticsConsent('granted');
      revokeAnalyticsConsent();
      expect(listener).toHaveBeenCalledTimes(2);
      expect((listener.mock.calls[0]![0] as CustomEvent).detail).toBe('granted');
      expect((listener.mock.calls[1]![0] as CustomEvent).detail).toBe('denied');
    } finally {
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, listener);
    }
  });

  it('purges stored analytics identifiers when consent is denied', () => {
    localStorage.setItem('bridgelet_anonymous_id', 'id-1');
    sessionStorage.setItem('bridgelet_session_id', 'id-2');
    sessionStorage.setItem('bridgelet_session_last_activity', '123');

    revokeAnalyticsConsent();

    expect(localStorage.getItem('bridgelet_anonymous_id')).toBeNull();
    expect(sessionStorage.getItem('bridgelet_session_id')).toBeNull();
    expect(sessionStorage.getItem('bridgelet_session_last_activity')).toBeNull();
  });

  it('syncs a decision made in another tab', () => {
    initConsentSync();
    const listener = vi.fn();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, listener);
    try {
      window.dispatchEvent(
        new StorageEvent('storage', { key: ANALYTICS_CONSENT_KEY, newValue: 'granted' }),
      );
      expect(getAnalyticsConsent()).toBe('granted');
      expect(listener).toHaveBeenCalledTimes(1);

      window.dispatchEvent(
        new StorageEvent('storage', { key: ANALYTICS_CONSENT_KEY, newValue: null }),
      );
      expect(getAnalyticsConsent()).toBeNull();
    } finally {
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, listener);
    }
  });

  it('ignores storage events for unrelated keys', () => {
    initConsentSync();
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'bridgelet-theme', newValue: 'dark' }),
    );
    expect(getAnalyticsConsent()).toBeNull();
  });

  it('is SSR-safe: no decision and no throw without a window', () => {
    resetAnalyticsConsent();
    vi.stubGlobal('window', undefined);
    expect(() => getAnalyticsConsent()).not.toThrow();
    expect(hasAnalyticsConsent()).toBe(false);
    expect(() => setAnalyticsConsent('granted')).not.toThrow();
    expect(() => purgeAnalyticsIdentifiers()).not.toThrow();
  });

  it('stays at the opt-in default when storage access throws', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('storage blocked');
        },
        setItem: () => {
          throw new Error('storage blocked');
        },
        removeItem: () => {
          throw new Error('storage blocked');
        },
      },
    });
    expect(() => getAnalyticsConsent()).not.toThrow();
    expect(hasAnalyticsConsent()).toBe(false);
    expect(() => setAnalyticsConsent('granted')).not.toThrow();
    expect(hasAnalyticsConsent()).toBe(true); // in-memory decision still holds
  });
});
