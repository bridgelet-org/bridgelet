import { NextRequest } from 'next/server';
import { forwardAccountsRequest, getRequestId } from '../../_proxy';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestId = getRequestId(req);

  return forwardAccountsRequest(
    `/accounts/${encodeURIComponent(id)}/events`,
    { method: 'GET' },
    requestId,
  );
}
