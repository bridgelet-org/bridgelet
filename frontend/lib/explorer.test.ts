import { describe, expect, it } from 'vitest';
import { explorerNetworkSegment, explorerTxUrl } from '@/lib/explorer';

const HASH = '8c32b57b8db8f21b260beb60b070380d2d20afd08e210c31f7010f11add6c0b9';

describe('explorerTxUrl', () => {
  it('builds a testnet URL from a valid transaction hash', () => {
    expect(explorerTxUrl(HASH, 'stellar-testnet')).toBe(
      `https://stellar.expert/explorer/testnet/tx/${HASH}`,
    );
  });

  it('uses the public network for mainnet', () => {
    expect(explorerTxUrl(HASH, 'stellar-mainnet')).toBe(
      `https://stellar.expert/explorer/public/tx/${HASH}`,
    );
  });

  it('defaults to testnet when the network is unknown', () => {
    expect(explorerNetworkSegment(undefined)).toBe('testnet');
  });

  it('refuses anything that is not a 64-char hex hash (e.g. a claim token)', () => {
    expect(explorerTxUrl('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig', 'stellar-testnet')).toBeUndefined();
    expect(explorerTxUrl(undefined, 'stellar-testnet')).toBeUndefined();
    expect(explorerTxUrl('abc123', 'stellar-testnet')).toBeUndefined();
  });
});
