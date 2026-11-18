/**
 * Tests that next.config.js declares the `Referrer-Policy: no-referrer` header
 * for the `/claim/:token` route.
 *
 * We test the config module directly rather than spinning up a Next.js server
 * so these can run fast inside the existing Vitest suite (no network / process
 * overhead).  The important behaviour we are asserting is that the header
 * declaration is present and correctly formed; a misconfigured export would
 * be caught here before it ever reaches CI or a browser.
 */

import { describe, it, expect } from 'vitest';
import path from 'path';

// next.config.js lives one directory above this test file (frontend/).
// __dirname here is frontend/tests/, so we go up one level.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextConfig = require(path.resolve(__dirname, '../next.config.js')) as {
  headers?: () => Promise<
    Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }>
  >;
};

describe('next.config.js: security headers', () => {
  it('exports a headers() function', () => {
    expect(typeof nextConfig.headers).toBe('function');
  });

  it('declares Referrer-Policy: no-referrer for /claim/:token', async () => {
    const headerRules = await nextConfig.headers!();

    const claimRule = headerRules.find((rule) => rule.source === '/claim/:token');
    expect(claimRule, 'Expected a header rule for /claim/:token').toBeDefined();

    const referrerHeader = claimRule!.headers.find(
      (h) => h.key.toLowerCase() === 'referrer-policy',
    );
    expect(referrerHeader, 'Expected a Referrer-Policy header entry').toBeDefined();
    expect(referrerHeader!.value).toBe('no-referrer');
  });

  it('does not emit the Referrer-Policy header for other routes', async () => {
    const headerRules = await nextConfig.headers!();

    // Routes such as /, /send, /roadmap must not carry the claim-page header;
    // applying it broadly would suppress analytics referrer data site-wide.
    // /c/:token is the SDK's claim-link path, rewritten to /claim/:token in next.config.js,
    // so it carries the same token and needs the same header.
    const claimSources = ['/claim/:token', '/c/:token'];
    const nonClaimRoutes = headerRules.filter((rule) => !claimSources.includes(rule.source));
    for (const rule of nonClaimRoutes) {
      const has = rule.headers.some((h) => h.key.toLowerCase() === 'referrer-policy');
      expect(has, `Unexpected Referrer-Policy on route ${rule.source}`).toBe(false);
    }
  });
});
