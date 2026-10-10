import { describe, expect, it } from 'vitest';
import { BridgeletApiError } from '@/lib/errors';

describe('BridgeletApiError', () => {
  it('words a 401 as a server auth problem, not a wallet reconnect', () => {
    const err = new BridgeletApiError(401, 'Unauthorized');
    expect(err.userMessage).toBe('The server could not authenticate with the Bridgelet API.');
    expect(err.userMessage).not.toMatch(/reconnect your wallet/i);
  });

  it('keeps specific messages for other statuses', () => {
    expect(new BridgeletApiError(404, 'nope').userMessage).toBe(
      'The requested resource was not found.',
    );
    expect(new BridgeletApiError(409, 'nope').userMessage).toBe(
      'This claim has already been redeemed.',
    );
    expect(new BridgeletApiError(410, 'nope').userMessage).toBe('This claim has expired.');
    expect(new BridgeletApiError(429, 'nope').userMessage).toBe(
      'Too many requests. Please wait a moment and try again.',
    );
    expect(new BridgeletApiError(503, 'nope').userMessage).toBe(
      'Something went wrong on our end. Please try again shortly.',
    );
  });

  it('uses an explicit userMessage when provided', () => {
    const err = new BridgeletApiError(500, 'boom', 'Custom message');
    expect(err.userMessage).toBe('Custom message');
  });
});
