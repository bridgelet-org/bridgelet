import { NextRequest, NextResponse } from 'next/server';

const SDK_URL = process.env.BRIDGELET_SDK_URL;
const SDK_TOKEN = process.env.BRIDGELET_SDK_TOKEN;

const UPSTREAM_TIMEOUT_MS = 10_000;

const FORWARDABLE_RESPONSE_HEADERS = ['content-type', 'retry-after'];

class ConfigError extends Error {}

function assertConfigured(): { sdkUrl: string; sdkToken: string } {
  if (!SDK_URL || !SDK_TOKEN) {
    console.error(
      '[bridgelet/accounts] Missing required env vars: BRIDGELET_SDK_URL and/or BRIDGELET_SDK_TOKEN',
    );
    throw new ConfigError();
  }
  return { sdkUrl: SDK_URL, sdkToken: SDK_TOKEN };
}

function buildResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  for (const key of FORWARDABLE_RESPONSE_HEADERS) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  headers.set('Cache-Control', 'no-store');
  return headers;
}

export function getRequestId(req: NextRequest): string {
  return req.headers.get('x-request-id') ?? crypto.randomUUID();
}

export async function forwardAccountsRequest(
  path: string,
  init: RequestInit,
  requestId: string,
): Promise<NextResponse> {
  let sdkUrl: string;
  let sdkToken: string;
  try {
    ({ sdkUrl, sdkToken } = assertConfigured());
  } catch {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(`${sdkUrl}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${sdkToken}`,
        'X-Request-Id': requestId,
      },
      signal: controller.signal,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    console.error(
      `[bridgelet/accounts] upstream fetch failed (requestId=${requestId})`,
      isAbort ? 'timed out' : err,
    );
    return NextResponse.json(
      { error: isAbort ? 'Upstream request timed out' : 'Upstream request failed' },
      { status: isAbort ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }

  const data = await upstream.text();
  return new NextResponse(data, {
    status: upstream.status,
    headers: buildResponseHeaders(upstream),
  });
}

export function parseJsonBodyOrError(raw: string): NextResponse | null {
  if (raw.length === 0) return null;
  try {
    JSON.parse(raw);
    return null;
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
}
