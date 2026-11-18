/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },

  /**
   * HTTP response headers applied per-route.
   *
   * /claim/[token] places the claim credential in the URL path, which means
   * it would be forwarded in the `Referer` request header to every
   * sub-resource loaded on that page (fonts, analytics beacons, images).
   * Because this token authorises a fund sweep, leaking it to a third-party
   * CDN or analytics endpoint before the recipient claims is a genuine
   * funds-security risk (see issue #392 and docs/security-model.mdx §Claim
   * Token Security).
   *
   * `Referrer-Policy: no-referrer` ensures the browser sends no `Referer`
   * header at all for any navigation *away from* or sub-resource *loaded on*
   * the claim page.  This is the most conservative choice and is appropriate
   * here because:
   *   1. The claim page has no SEO value that depends on referrer analytics.
   *   2. No third-party widgets on this page need the origin URL to function.
   *   3. The alternative (`strict-origin-when-cross-origin`) would still
   *      send the full path (including the token) to same-origin sub-resources,
   *      which is unnecessarily broad.
   *
   * Note: the path segment decision (vs. URL fragment `#token=...`) is
   * documented in docs/security-model.mdx under "Claim Token Placement".
   */
  // The SDK builds claim links as `<CLAIM_BASE_URL>/c/<token>`; this app's route is
  // /claim/[token]. A rewrite (not a redirect) keeps the token out of an extra hop.
  async rewrites() {
    return [{ source: '/c/:token', destination: '/claim/:token' }];
  },

  async headers() {
    return [
      {
        source: '/c/:token',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
      {
        // Matches /claim/<any-token>: Next.js header source patterns use
        // :param notation, not the [param] file-system convention.
        source: '/claim/:token',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
