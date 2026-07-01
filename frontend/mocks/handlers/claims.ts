import { http, HttpResponse } from 'msw';

export const claimsHandlers = [
  http.post('/send', () =>
    HttpResponse.json(
      {
        intentId: 'mock-intent-123',
        claimToken: 'mock-token-123',
        claimUrl: '/claim/mock-token-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      { status: 201 },
    ),
  ),
  http.post('/claims/redeem', () =>
    HttpResponse.json({
      txHash: 'mock-tx-hash-stub',
      explorerUrl: 'https://stellar.expert/explorer/testnet/tx/mock-tx-hash-stub',
      sweep_status: 'stub',
      sweepNote: 'Sweep is stubbed in MVP. Funds remain in the ephemeral account.',
    }),
  ),
];
