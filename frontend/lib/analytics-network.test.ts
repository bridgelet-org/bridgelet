import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyticsNetwork, withNetwork } from '@/lib/analytics-network';

describe('analyticsNetwork (#1091)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to testnet when the network is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_CRYPTO_NETWORK', undefined);
    expect(analyticsNetwork()).toBe('testnet');
  });

  it.each([
    ['stellar-testnet', 'testnet'],
    ['stellar-futurenet', 'testnet'],
    ['testnet', 'testnet'],
    ['', 'testnet'],
    ['some-unknown-network', 'testnet'],
    ['stellar-mainnet', 'mainnet'],
    ['mainnet', 'mainnet'],
    ['public', 'mainnet'],
    ['STELLAR-PUBLIC', 'mainnet'],
  ] as const)('maps %s to %s', (raw, expected) => {
    expect(analyticsNetwork(raw)).toBe(expected);
  });

  it('reads NEXT_PUBLIC_CRYPTO_NETWORK at call time', () => {
    vi.stubEnv('NEXT_PUBLIC_CRYPTO_NETWORK', 'stellar-testnet');
    expect(analyticsNetwork()).toBe('testnet');
    vi.stubEnv('NEXT_PUBLIC_CRYPTO_NETWORK', 'stellar-mainnet');
    expect(analyticsNetwork()).toBe('mainnet');
  });
});

describe('withNetwork (#1091)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('adds the network field without dropping existing props', () => {
    vi.stubEnv('NEXT_PUBLIC_CRYPTO_NETWORK', 'stellar-mainnet');
    expect(withNetwork({ journey: 'sender', claim_id: 'tok_123' })).toEqual({
      journey: 'sender',
      claim_id: 'tok_123',
      network: 'mainnet',
    });
  });
});
