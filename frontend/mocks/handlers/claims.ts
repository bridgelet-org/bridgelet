import { http, HttpResponse } from 'msw';

/**
 * Mock handlers for /claims/*.
 *
 * Matches ClaimVerificationResponseDto / ClaimRedemptionResponseDto in
 * bridgelet-sdk
 * Note the real flow is verify -> redeem, both against /claims.
 */
export const claimsHandlers = [
  http.get('*/claims/:id', ({ params }) =>
    HttpResponse.json({
      id: params.id,
      accountId: crypto.randomUUID(),
      destinationAddress: 'GBBD47UZQ5YLQYYTWTCB7X3DUEEVZMDVGFBRNZPMZDWQWKCFN3EOZQKQ',
      amountSwept: '100.0000000',
      asset: 'native',
      sweepTxHash: 'mock-sweep-tx-hash',
      claimedAt: new Date().toISOString(),
    }),
  ),

  http.post('*/claims/verify', () =>
    HttpResponse.json({
      valid: true,
      accountId: crypto.randomUUID(),
      amount: '100.0000000',
      asset: 'native',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
  ),

  http.post('*/claims/redeem', () =>
    HttpResponse.json({
      success: true,
      txHash: 'mock-tx-hash-stub',
      amountSwept: '100.0000000',
      asset: 'native',
      destination: 'GBBD47UZQ5YLQYYTWTCB7X3DUEEVZMDVGFBRNZPMZDWQWKCFN3EOZQKQ',
      sweptAt: new Date().toISOString(),
      message:
        'Note: fund sweep is running in MVP stub mode. Tokens are reserved but not yet transferred on-chain.',
    }),
  ),
];
