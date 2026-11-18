import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeAppUrl, resolveAppUrl } from './env';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
  vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('publicEnv', () => {
  it('returns undefined instead of a sentinel for missing values', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_CRYPTO_NETWORK', '');
    vi.stubEnv('NEXT_PUBLIC_SUPPORT_EMAIL', '');

    const { publicEnv } = await import('./env');

    expect(publicEnv.NEXT_PUBLIC_APP_URL).toBeUndefined();
    expect(publicEnv.NEXT_PUBLIC_API_BASE_URL).toBeUndefined();
    expect(publicEnv.NEXT_PUBLIC_CRYPTO_NETWORK).toBeUndefined();
    expect(publicEnv.NEXT_PUBLIC_SUPPORT_EMAIL).toBeUndefined();
  });

  it('trims configured values', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '  https://bridgelet.vercel.app/  ');
    vi.stubEnv('NEXT_PUBLIC_SUPPORT_EMAIL', ' support@example.com ');

    const { publicEnv } = await import('./env');

    expect(publicEnv.NEXT_PUBLIC_APP_URL).toBe('https://bridgelet.vercel.app/');
    expect(publicEnv.NEXT_PUBLIC_SUPPORT_EMAIL).toBe('support@example.com');
  });
});

describe('normalizeAppUrl', () => {
  it('trims whitespace and removes trailing slashes', () => {
    expect(normalizeAppUrl('  https://bridgelet.vercel.app///  ')).toBe(
      'https://bridgelet.vercel.app',
    );
  });

  it('preserves a path, query, and hash', () => {
    expect(normalizeAppUrl(' https://bridgelet.org/claim?token=abc#top ')).toBe(
      'https://bridgelet.org/claim?token=abc#top',
    );
  });

  it('rejects blank and non-http values', () => {
    expect(normalizeAppUrl('')).toBeUndefined();
    expect(normalizeAppUrl('   ')).toBeUndefined();
    expect(normalizeAppUrl('not-configured')).toBeUndefined();
    expect(normalizeAppUrl('ftp://bridgelet.vercel.app')).toBeUndefined();
  });
});

describe('resolveAppUrl', () => {
  it('prefers the configured URL and normalizes it', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', ' https://bridgelet.vercel.app/ ');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'ignored.vercel.app');

    expect(resolveAppUrl()).toBe('https://bridgelet.vercel.app');
  });

  it('falls back to the Vercel production hostname', () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'bridgelet.vercel.app');

    expect(resolveAppUrl()).toBe('https://bridgelet.vercel.app');
  });

  it('falls back to request headers', () => {
    const headers = new Headers({
      'x-forwarded-host': 'preview.example.com',
      'x-forwarded-proto': 'https',
    });

    expect(resolveAppUrl({ headers })).toBe('https://preview.example.com');
  });

  it('prefers the request origin header', () => {
    const headers = new Headers({
      origin: 'https://origin.example.com',
      'x-forwarded-host': 'ignored.example.com',
      'x-forwarded-proto': 'https',
    });

    expect(resolveAppUrl({ headers })).toBe('https://origin.example.com');
  });

  it('falls back to the browser origin', () => {
    vi.stubGlobal('window', { location: { origin: 'https://browser.example.com' } });

    expect(resolveAppUrl()).toBe('https://browser.example.com');
  });

  it('uses localhost only outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubGlobal('window', undefined);

    expect(resolveAppUrl()).toBe('http://localhost:3000');
  });

  it('returns undefined in production when nothing can be resolved', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubGlobal('window', undefined);

    expect(resolveAppUrl()).toBeUndefined();
  });

  it('warns once in production when a fallback is used', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'bridgelet.vercel.app');
    vi.stubGlobal('window', undefined);

    const { resolveAppUrl: resolveFresh } = await import('./env');

    expect(resolveFresh()).toBe('https://bridgelet.vercel.app');
    expect(resolveFresh()).toBe('https://bridgelet.vercel.app');
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('NEXT_PUBLIC_APP_URL is not set'),
    );
  });
});
