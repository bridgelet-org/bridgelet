import { http, HttpResponse } from 'msw';

export const apiHandlers = [
  // Mock POST /send (Create Payment Intent)
  http.post('*/send', async () => {
    return HttpResponse.json({
      intentId: 'mock-intent-1234',
      claimToken: 'demo-token-123',
      claimUrl: 'http://localhost:3000/claim/demo-token-123?demo=true',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }),

  // Mock GET /claim/:token (Get Claim Details)
  http.get('*/claim/:token', ({ params }) => {
    return HttpResponse.json({
      valid: true,
      amountStroops: '500000000', // 50 XLM
      assetCode: 'XLM',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      memo: 'Demo payment',
    });
  }),

  // Mock POST /claim/:token/redeem (Redeem Claim)
  http.post('*/claim/:token/redeem', async () => {
    return HttpResponse.json({
      txHash: 'mock-tx-hash-0987654321',
      explorerUrl: 'https://stellar.expert/explorer/testnet/tx/mock-tx-hash-0987654321',
    });
  }),
];
