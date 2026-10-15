import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Issue #765 — issued-asset configuration.
 *
 * USDC must stay hidden until an issuer is configured for the active network,
 * so the send form never offers an asset the ephemeral account cannot receive.
 * The issuer map is read at module load, so each case re-imports a fresh module.
 */
async function loadBridgelet() {
  vi.resetModules();
  return import('@/lib/bridgelet');
}

const TESTNET_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const MAINNET_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

describe('bridgelet asset helpers (#765)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_CRYPTO_NETWORK', 'stellar-testnet');
    vi.stubEnv('NEXT_PUBLIC_USDC_ISSUER_TESTNET', '');
    vi.stubEnv('NEXT_PUBLIC_USDC_ISSUER_MAINNET', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('always treats native XLM as available with no issuer', async () => {
    const { getAssetIssuer, isAssetAvailable, supportedAssetCodes } = await loadBridgelet();
    expect(getAssetIssuer('XLM')).toBeUndefined();
    expect(isAssetAvailable('XLM')).toBe(true);
    expect(supportedAssetCodes()).toEqual(['XLM']);
  });

  it('hides USDC by default when no testnet issuer is configured', async () => {
    const { getAssetIssuer, isAssetAvailable, supportedAssetCodes } = await loadBridgelet();
    expect(getAssetIssuer('USDC')).toBeUndefined();
    expect(isAssetAvailable('USDC')).toBe(false);
    expect(supportedAssetCodes()).not.toContain('USDC');
  });

  it('offers USDC once a testnet issuer is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_USDC_ISSUER_TESTNET', TESTNET_ISSUER);
    const { getAssetIssuer, isAssetAvailable, supportedAssetCodes } = await loadBridgelet();
    expect(getAssetIssuer('USDC')).toBe(TESTNET_ISSUER);
    expect(isAssetAvailable('USDC')).toBe(true);
    expect(supportedAssetCodes()).toEqual(['XLM', 'USDC']);
  });

  it('trims surrounding whitespace from a configured issuer', async () => {
    vi.stubEnv('NEXT_PUBLIC_USDC_ISSUER_TESTNET', `  ${TESTNET_ISSUER}  `);
    const { getAssetIssuer } = await loadBridgelet();
    expect(getAssetIssuer('USDC')).toBe(TESTNET_ISSUER);
  });

  it('keeps mainnet issuers independent from testnet', async () => {
    vi.stubEnv('NEXT_PUBLIC_USDC_ISSUER_MAINNET', MAINNET_ISSUER);
    const testnet = await loadBridgelet();
    expect(testnet.getAssetIssuer('USDC')).toBeUndefined();

    vi.stubEnv('NEXT_PUBLIC_CRYPTO_NETWORK', 'stellar-mainnet');
    const mainnet = await loadBridgelet();
    expect(mainnet.getAssetIssuer('USDC')).toBe(MAINNET_ISSUER);
  });

  it('never reports an unknown asset code as available', async () => {
    vi.stubEnv('NEXT_PUBLIC_USDC_ISSUER_TESTNET', TESTNET_ISSUER);
    const { getAssetIssuer, isAssetAvailable } = await loadBridgelet();
    expect(getAssetIssuer('FAKE')).toBeUndefined();
    expect(isAssetAvailable('FAKE')).toBe(false);
  });
});
