import { NextRequest, NextResponse } from 'next/server';

const SDK_URL = process.env.BRIDGELET_SDK_URL ?? '';
const SDK_TOKEN = process.env.BRIDGELET_SDK_TOKEN ?? '';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const res = await fetch(`${SDK_URL}/accounts/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${SDK_TOKEN}` },
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
