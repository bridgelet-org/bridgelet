export type PublicEnv = {
  NEXT_PUBLIC_APP_URL: string | undefined;
  NEXT_PUBLIC_API_BASE_URL: string | undefined;
  NEXT_PUBLIC_CRYPTO_NETWORK: string | undefined;
  NEXT_PUBLIC_SUPPORT_EMAIL: string | undefined;
};

function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === 'not-configured') {
    return undefined;
  }
  return trimmed;
}

/**
 * Public environment variables available to both server and client.
 * Properties are accessed literally (e.g. process.env.NEXT_PUBLIC_*)
 * so Next.js build-time inlining works correctly in client bundles.
 */
export const publicEnv: PublicEnv = {
  NEXT_PUBLIC_APP_URL: cleanEnv(process.env.NEXT_PUBLIC_APP_URL),
  NEXT_PUBLIC_API_BASE_URL: cleanEnv(process.env.NEXT_PUBLIC_API_BASE_URL),
  NEXT_PUBLIC_CRYPTO_NETWORK: cleanEnv(process.env.NEXT_PUBLIC_CRYPTO_NETWORK),
  NEXT_PUBLIC_SUPPORT_EMAIL: cleanEnv(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
};

let hasWarnedFallback = false;

/**
 * Emits a single server-side warning when a production deployment resolves
 * its app URL from a fallback rather than an explicit NEXT_PUBLIC_APP_URL.
 */
export function warnIfFallbackUrlUsed(resolvedUrl: string | undefined): void {
  if (
    typeof window === 'undefined' &&
    process.env.NODE_ENV === 'production' &&
    !cleanEnv(process.env.NEXT_PUBLIC_APP_URL) &&
    !hasWarnedFallback
  ) {
    hasWarnedFallback = true;
    console.warn(
      `[Bridgelet Config] NEXT_PUBLIC_APP_URL is not set. Resolved app URL from fallback: "${
        resolvedUrl ?? 'none'
      }". Set NEXT_PUBLIC_APP_URL before building production deployments.`,
    );
  }
}

/**
 * Resolves the canonical public app URL using the prioritized fallback order:
 * 1. NEXT_PUBLIC_APP_URL (trimmed, no trailing slash, must be valid http(s)://)
 * 2. On Vercel: VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL ('https://' + host)
 * 3. window.location.origin in the browser
 * 4. http://localhost:3000 in development only
 *
 * Returns undefined if no valid URL can be resolved.
 */
export function resolveAppUrl(): string | undefined {
  // 1. Explicit NEXT_PUBLIC_APP_URL
  const appUrl = cleanEnv(process.env.NEXT_PUBLIC_APP_URL);
  if (appUrl) {
    try {
      const parsed = new URL(appUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return appUrl.replace(/\/+$/, '');
      }
    } catch {
      // Invalid URL format; ignore and try fallbacks
    }
  }

  // 2. Vercel deployment URL (VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL)
  const vercelHost =
    cleanEnv(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    cleanEnv(process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) ||
    cleanEnv(process.env.VERCEL_URL) ||
    cleanEnv(process.env.NEXT_PUBLIC_VERCEL_URL);

  if (vercelHost) {
    try {
      const formatted =
        vercelHost.startsWith('http://') || vercelHost.startsWith('https://')
          ? vercelHost
          : `https://${vercelHost}`;
      const parsed = new URL(formatted);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return formatted.replace(/\/+$/, '');
      }
    } catch {
      // Invalid format; ignore
    }
  }

  // 3. Browser runtime origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    try {
      const parsed = new URL(window.location.origin);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return window.location.origin.replace(/\/+$/, '');
      }
    } catch {
      // ignore
    }
  }

  // 4. Localhost development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  return undefined;
}
