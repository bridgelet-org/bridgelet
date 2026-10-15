import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort in-memory rate limit. Serverless platforms may run multiple
// instances, so this throttles abuse per warm instance rather than globally.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const requestLog = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    requestLog.set(key, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(key, recent);
  return false;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The claim link must point at this app's own /claim/<token> route. */
function isOwnClaimLink(value: string): boolean {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let expectedOrigin: string;
  let candidate: URL;
  try {
    expectedOrigin = new URL(base).origin;
    candidate = new URL(value);
  } catch {
    return false;
  }
  return candidate.origin === expectedOrigin && candidate.pathname.startsWith('/claim/');
}

type ClaimEmail = {
  claimUrl: string;
  recipientName?: string;
  amount?: string;
  assetCode?: string;
};

function buildEmail({ claimUrl, recipientName, amount, assetCode }: ClaimEmail) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,';
  const amountLine =
    amount && assetCode ? ` for ${amount} ${assetCode}` : '';
  const subject = "You've received a payment via Bridgelet";

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.5; color: #0f172a;">
      <p>${escapeHtml(greeting)}</p>
      <p>Someone sent you a payment${escapeHtml(amountLine)} using Bridgelet. No wallet needed — just open the link below to claim it.</p>
      <p><a href="${escapeHtml(claimUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;">Claim your payment</a></p>
      <p style="font-size:13px;color:#475569;">If the button doesn't work, copy this link into your browser:<br><span style="word-break:break-all;">${escapeHtml(claimUrl)}</span></p>
      <p style="font-size:13px;color:#475569;">If you weren't expecting this, you can safely ignore this email.</p>
    </div>
  `.trim();

  const text = [
    greeting,
    '',
    `Someone sent you a payment${amountLine} using Bridgelet. No wallet needed — open the link below to claim it:`,
    claimUrl,
    '',
    "If you weren't expecting this, you can safely ignore this email.",
  ].join('\n');

  return { subject, html, text };
}

export async function POST(request: Request) {
  const apiKey = process.env['RESEND_API_KEY'];
  const from = process.env['EMAIL_FROM'];

  if (!apiKey || !from) {
    return NextResponse.json(
      { error: 'Email service not configured' },
      { status: 501 },
    );
  }

  if (isRateLimited(clientKey(request))) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const claimUrl = typeof payload.claimUrl === 'string' ? payload.claimUrl : '';
  const recipientEmail =
    typeof payload.recipientEmail === 'string' ? payload.recipientEmail.trim() : '';

  if (!claimUrl || !isOwnClaimLink(claimUrl)) {
    return NextResponse.json(
      { error: 'A valid Bridgelet claim link is required' },
      { status: 400 },
    );
  }

  if (!EMAIL_PATTERN.test(recipientEmail)) {
    return NextResponse.json(
      { error: 'A valid recipient email is required' },
      { status: 400 },
    );
  }

  const { subject, html, text } = buildEmail({
    claimUrl,
    recipientName:
      typeof payload.recipientName === 'string' ? payload.recipientName.trim() : undefined,
    amount: typeof payload.amount === 'string' ? payload.amount : undefined,
    assetCode: typeof payload.assetCode === 'string' ? payload.assetCode : undefined,
  });

  // Optional fixed recipient override (support/staging); otherwise send to the
  // address the sender provided.
  const override = process.env['EMAIL_TO']?.trim();
  const replyTo = process.env['EMAIL_REPLY_TO']?.trim() || undefined;

  const resend = new Resend(apiKey);
  try {
    const result = await resend.emails.send({
      from,
      to: override || recipientEmail,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    });

    if (result.error) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 502 });
    }

    return NextResponse.json({ success: true, id: result.data?.id });
  } catch {
    // Never log the claim link or recipient address.
    return NextResponse.json({ error: 'Failed to send email' }, { status: 502 });
  }
}
