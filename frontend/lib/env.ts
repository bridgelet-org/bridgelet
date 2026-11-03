type PublicEnv = {
  NEXT_PUBLIC_APP_URL: string | undefined;
  NEXT_PUBLIC_API_BASE_URL: string | undefined;
  NEXT_PUBLIC_CRYPTO_NETWORK: string | undefined;
  NEXT_PUBLIC_SUPPORT_EMAIL: string | undefined;
};

type HeaderReader = {
  get(name: string): string | null;
};

export type ResolveAppUrlOptions = {
  headers?: HeaderReader;
};

type AppUrlSource = 'configured' | 'vercel' | 'request' | 'browser' | 'development';

type AppUrlResolution = {
  url: string;
  source: AppUrlSource;
};

function readPublicEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeHttpUrl(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return undefined;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;

  const pathname = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${pathname}${url.search}${url.hash}`;
}

function resolveVercelUrl(): string | undefined {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!host) return undefined;
  return normalizeHttpUrl(/^https?:\/\//i.test(host) ? host : `https://${host}`);
}

function resolveHeaderOrigin(headers?: HeaderReader): string | undefined {
  if (!headers) return undefined;

  const origin = normalizeHttpUrl(headers.get('origin'));
  if (origin) return origin;

  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  if (!host) return undefined;

  const forwardedProto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const hostname = host.split(',')[0]?.trim();
  if (!hostname) return undefined;

  const proto =
    forwardedProto ||
    (hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1') ? 'http' : 'https');

  return normalizeHttpUrl(`${proto}://${hostname}`);
}

function resolveAppUrlWithSource(
  options: ResolveAppUrlOptions = {},
): AppUrlResolution | undefined {
  const configured = normalizeHttpUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return { url: configured, source: 'configured' };

  const vercel = resolveVercelUrl();
  if (vercel) return { url: vercel, source: 'vercel' };

  const requestOrigin = resolveHeaderOrigin(options.headers);
  if (requestOrigin) return { url: requestOrigin, source: 'request' };

  if (typeof window !== 'undefined') {
    const browserOrigin = normalizeHttpUrl(window.location.origin);
    if (browserOrigin) return { url: browserOrigin, source: 'browser' };
  }

  if (process.env.NODE_ENV !== 'production') {
    return { url: 'http://localhost:3000', source: 'development' };
  }

  return undefined;
}

let fallbackWarningEmitted = false;

function warnIfUsingFallback(resolution: AppUrlResolution): void {
  if (
    resolution.source === 'configured' ||
    typeof window !== 'undefined' ||
    process.env.NODE_ENV !== 'production' ||
    fallbackWarningEmitted
  ) {
    return;
  }

  fallbackWarningEmitted = true;
  console.warn(
    `[env] NEXT_PUBLIC_APP_URL is not set to a valid URL; using ${resolution.url} as the app URL. ` +
      'Set NEXT_PUBLIC_APP_URL to the public frontend URL before building and redeploy after changing it.',
  );
}

export function resolveAppUrl(options: ResolveAppUrlOptions = {}): string | undefined {
  const resolution = resolveAppUrlWithSource(options);
  if (!resolution) return undefined;

  warnIfUsingFallback(resolution);
  return resolution.url;
}

if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  const startupResolution = resolveAppUrlWithSource();
  if (startupResolution) warnIfUsingFallback(startupResolution);
}

export const publicEnv: PublicEnv = {
  NEXT_PUBLIC_APP_URL: readPublicEnv(process.env.NEXT_PUBLIC_APP_URL),
  NEXT_PUBLIC_API_BASE_URL: readPublicEnv(process.env.NEXT_PUBLIC_API_BASE_URL),
  NEXT_PUBLIC_CRYPTO_NETWORK: readPublicEnv(process.env.NEXT_PUBLIC_CRYPTO_NETWORK),
  NEXT_PUBLIC_SUPPORT_EMAIL: readPublicEnv(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
};

export { normalizeHttpUrl as normalizeAppUrl };
