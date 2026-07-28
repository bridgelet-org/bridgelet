import { NextRequest } from 'next/server';
import {
  forwardAccountsRequest,
  getRequestId,
  parseJsonBodyOrError,
} from '../_proxy';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * Experimental Freighter sender-signing prepare endpoint.
 *
 * Proxies account-creation payloads to the SDK's `/accounts/prepare` route,
 * which returns an unsigned transaction XDR for client-side wallet signing.
 * When the SDK does not implement prepare yet, upstream 404/501 responses
 * intentionally surface so the send UI can fall back to backend signing.
 */
export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const raw = await req.text();

  const parseError = parseJsonBodyOrError(raw);
  if (parseError) return parseError;

  return forwardAccountsRequest(
    '/accounts/prepare',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: raw,
    },
    requestId,
  );
}
