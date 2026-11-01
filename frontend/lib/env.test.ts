import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('env configuration and URL resolution (Issue #955)', () => {
  const originalEnv = process.env;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.window = originalWindow;
    vi.restoreAllMocks();
  });

  describe('resolveAppUrl', () => {
    it('uses trimmed NEXT_PUBLIC_APP_URL without trailing slash', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://bridgelet.vercel.app/  ';
      const { resolveAppUrl } = await import('./env');
      expect(resolveAppUrl()).toBe('https://bridgelet.vercel.app');
    });

    it('rejects invalid or non-http protocols in NEXT_PUBLIC_APP_URL', async () => {
      // Simulate server environment where window is undefined
      delete (globalThis as any).window;
      process.env.NEXT_PUBLIC_APP_URL = 'javascript:alert(1)';
      (process.env as any).NODE_ENV = 'production';
      const { resolveAppUrl } = await import('./env');
      expect(resolveAppUrl()).toBeUndefined();
    });

    it('falls back to VERCEL_PROJECT_PRODUCTION_URL when NEXT_PUBLIC_APP_URL is missing', async () => {
      delete (globalThis as any).window;
      delete process.env.NEXT_PUBLIC_APP_URL;
      process.env.VERCEL_PROJECT_PRODUCTION_URL = 'bridgelet-production.vercel.app';
      const { resolveAppUrl } = await import('./env');
      expect(resolveAppUrl()).toBe('https://bridgelet-production.vercel.app');
    });

    it('falls back to VERCEL_URL if set with https prefix', async () => {
      delete (globalThis as any).window;
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      process.env.VERCEL_URL = 'bridgelet-preview.vercel.app';
      const { resolveAppUrl } = await import('./env');
      expect(resolveAppUrl()).toBe('https://bridgelet-preview.vercel.app');
    });

    it('falls back to window.location.origin in the browser when available', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      delete process.env.VERCEL_URL;
      (process.env as any).NODE_ENV = 'production';
      (globalThis as any).window = { location: { origin: 'https://browser-view.bridgelet.org' } };
      const { resolveAppUrl } = await import('./env');
      expect(resolveAppUrl()).toBe('https://browser-view.bridgelet.org');
    });

    it('falls back to localhost:3000 in development mode', async () => {
      delete (globalThis as any).window;
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      delete process.env.VERCEL_URL;
      (process.env as any).NODE_ENV = 'development';
      const { resolveAppUrl } = await import('./env');
      expect(resolveAppUrl()).toBe('http://localhost:3000');
    });

    it('returns undefined in production when no variables or window origin are present', async () => {
      delete (globalThis as any).window;
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      delete process.env.VERCEL_URL;
      (process.env as any).NODE_ENV = 'production';
      const { resolveAppUrl } = await import('./env');
      expect(resolveAppUrl()).toBeUndefined();
    });
  });

  describe('warnIfFallbackUrlUsed', () => {
    it('logs warning in production when NEXT_PUBLIC_APP_URL is missing', async () => {
      delete (globalThis as any).window;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      delete process.env.NEXT_PUBLIC_APP_URL;
      (process.env as any).NODE_ENV = 'production';
      const { warnIfFallbackUrlUsed } = await import('./env');
      warnIfFallbackUrlUsed('https://fallback.vercel.app');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Bridgelet Config] NEXT_PUBLIC_APP_URL is not set'),
      );
    });

    it('does not log warning if NEXT_PUBLIC_APP_URL is present', async () => {
      delete (globalThis as any).window;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      process.env.NEXT_PUBLIC_APP_URL = 'https://bridgelet.org';
      (process.env as any).NODE_ENV = 'production';
      const { warnIfFallbackUrlUsed } = await import('./env');
      warnIfFallbackUrlUsed('https://bridgelet.org');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
