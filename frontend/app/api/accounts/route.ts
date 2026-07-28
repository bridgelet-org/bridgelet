import { NextRequest } from 'next/server';
import {
  forwardAccountsRequest,
  getRequestId,
  parseJsonBodyOrError,
} from './_proxy';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const raw = await req.text();

  const parseError = parseJsonBodyOrError(raw);
  if (parseError) return parseError;

  return forwardAccountsRequest(
    '/accounts',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: raw,
    },
    requestId,
  );
}

export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);
  const qs = req.nextUrl.search;

  return forwardAccountsRequest('/accounts' + qs, { method: 'GET' }, requestId);
}
