import { http, HttpResponse, delay } from 'msw';
import { AccountStatus } from '@/lib/api/types';

/** Generate a fake Stellar public key (G... 56 chars, base32 alphabet). */
function fakeStellarAddress(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let key = 'G';
  for (let i = 0; i < 55; i++) {
    key += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return key;
}

/** Generate a 32-byte hex claim id. */
function fakeClaimId(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

/**
 * POST /accounts
 *
 * Matches AccountResponseDto in bridgelet-sdk exactly (Issue 3/6 follow-up:
 * mocks must match the real contract, not the old /api/accounts shape).
 * Simulates 300 ms of network latency to mirror production behaviour.
 */
export const accountHandlers = [
  http.post('*/accounts', async () => {
    await delay(300);

    const publicKey = fakeStellarAddress();
    const claimId = fakeClaimId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return HttpResponse.json(
      {
        accountId: crypto.randomUUID(),
        publicKey,
        claimUrl: `/claim/${claimId}`,
        amount: '100.0000000',
        asset: 'XLM',
        status: AccountStatus.PENDING_PAYMENT,
        expiresAt,
        createdAt: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),
];
