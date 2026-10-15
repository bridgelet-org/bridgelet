import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
    constructor(_apiKey?: string) {
      void _apiKey;
    }
  },
}));

import { POST } from '@/app/api/send-email/route';

const APP_ORIGIN = 'http://localhost:3000';
const VALID_CLAIM_URL = `${APP_ORIGIN}/claim/abc123`;

let ipCounter = 0;

function makeRequest(body: unknown): Request {
  ipCounter += 1;
  return new Request(`${APP_ORIGIN}/api/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.0.0.${ipCounter}`,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/send-email (#763)', () => {
  beforeEach(() => {
    sendMock.mockReset();
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('EMAIL_FROM', 'Bridgelet <no-reply@example.com>');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_ORIGIN);
    delete process.env['EMAIL_TO'];
    delete process.env['EMAIL_REPLY_TO'];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sends the claim link to the recipient using a fixed server-built template', async () => {
    sendMock.mockResolvedValue({ data: { id: 'email_123' }, error: null });

    const res = await POST(
      makeRequest({
        claimUrl: VALID_CLAIM_URL,
        recipientEmail: 'recipient@example.com',
        recipientName: 'Amina',
        amount: '25',
        assetCode: 'XLM',
      }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true, id: 'email_123' });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'recipient@example.com',
        from: 'Bridgelet <no-reply@example.com>',
        subject: "You've received a payment via Bridgelet",
        html: expect.stringContaining(VALID_CLAIM_URL),
        text: expect.stringContaining(VALID_CLAIM_URL),
      }),
    );
  });

  it('ignores client-supplied from/subject/html so the route cannot be used as a relay', async () => {
    sendMock.mockResolvedValue({ data: { id: 'email_456' }, error: null });

    await POST(
      makeRequest({
        claimUrl: VALID_CLAIM_URL,
        recipientEmail: 'recipient@example.com',
        from: 'attacker@evil.example',
        subject: 'Injected subject',
        html: '<p>Injected body</p>',
      }),
    );

    const [args] = sendMock.mock.calls[0] ?? [];
    const sent = args as { to: string; from: string; subject: string; html: string };
    expect(sent.from).toBe('Bridgelet <no-reply@example.com>');
    expect(sent.subject).toBe("You've received a payment via Bridgelet");
    expect(sent.html).not.toContain('Injected body');
    expect(sent.to).toBe('recipient@example.com');
  });

  it('returns 501 and does not send when email is not configured', async () => {
    vi.stubEnv('RESEND_API_KEY', '');

    const res = await POST(
      makeRequest({ claimUrl: VALID_CLAIM_URL, recipientEmail: 'recipient@example.com' }),
    );

    expect(res.status).toBe(501);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns 502 when the mail provider fails', async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: 'application_error' } });

    const res = await POST(
      makeRequest({ claimUrl: VALID_CLAIM_URL, recipientEmail: 'recipient@example.com' }),
    );

    expect(res.status).toBe(502);
  });

  it('rejects a claim link that does not belong to this app', async () => {
    const res = await POST(
      makeRequest({
        claimUrl: 'https://evil.example/claim/abc123',
        recipientEmail: 'recipient@example.com',
      }),
    );

    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid recipient email', async () => {
    const res = await POST(makeRequest({ claimUrl: VALID_CLAIM_URL, recipientEmail: 'nope' }));

    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rate limits repeated requests from the same client', async () => {
    sendMock.mockResolvedValue({ data: { id: 'email_789' }, error: null });

    const request = () =>
      new Request(`${APP_ORIGIN}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
        body: JSON.stringify({
          claimUrl: VALID_CLAIM_URL,
          recipientEmail: 'recipient@example.com',
        }),
      });

    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await POST(request())).status);
    }

    expect(statuses[0]).toBe(200);
    expect(statuses[5]).toBe(429);
  });
});
