import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * SDK issue #991 / frontend issue #977: the send form must mirror the SDK's
 * per-network issued-asset allowlist. USDC and any other issued asset stay
 * hidden unless an allowlist entry exists for the active network.
 */
async function loadBridgelet() {
  vi.resetModules();
  return import('@/lib/bridgelet');
}

const TESTNET_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const MAINNET_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const SHARED_ISSUER = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

describe('bridgelet asset helpers (#977)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_CRYPTO_NETWORK', 'stellar-testnet');
    vi.stubEnv('NEXT_PUBLIC_SUPPORTED_ASSETS_TESTNET', '');
    vi.stubEnv('NEXT_PUBLIC_SUPPORTED_ASSETS_MAINNET', '');
    vi.stubEnv('NEXT_PUBLIC_SUPPORTED_ASSETS', '');
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

  it('hides USDC by default when the SDK allowlist is empty', async () => {
    const { getAssetIssuer, isAssetAvailable, supportedAssetCodes } = await loadBridgelet();
    expect(getAssetIssuer('USDC')).toBeUndefined();
    expect(isAssetAvailable('USDC')).toBe(false);
    expect(supportedAssetCodes()).not.toContain('USDC');
  });

  it('does not fall back to the legacy USDC issuer variables', async () => {
    vi.stubEnv('NEXT_PUBLIC_USDC_ISSUER_TESTNET', TESTNET_ISSUER);
    const { isAssetAvailable } = await loadBridgelet();
    expect(isAssetAvailable('USDC')).toBe(false);
  });

  it('offers an asset only once it is in the testnet allowlist', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPPORTED_ASSETS_TESTNET', `USDC:${TESTNET_ISSUER}`);
    const { getAssetIssuer, isAssetAvailable, supportedAssetCodes } = await loadBridgelet();
    expect(getAssetIssuer('USDC')).toBe(TESTNET_ISSUER);
    expect(isAssetAvailable('USDC')).toBe(true);
    expect(supportedAssetCodes()).toEqual(['XLM', 'USDC']);
  });

  it('trims surrounding whitespace and ignores blank entries', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPPORTED_ASSETS_TESTNET', `  USDC:${TESTNET_ISSUER}  , ,`);
    const { getAssetIssuer } = await loadBridgelet();
    expect(getAssetIssuer('USDC')).toBe(TESTNET_ISSUER);
  });

  it('ignores malformed allowlist entries instead of offering them', async () => {
    vi.stubEnv(
      'NEXT_PUBLIC_SUPPORTED_ASSETS_TESTNET',
      `USDC,USDC:not-an-issuer,EURC:${TESTNET_ISSUER},USDC:${TESTNET_ISSUER}`,
    );
    const { getAssetIssuer, supportedAssetCodes } = await loadBridgelet();
    expect(getAssetIssuer('EURC')).toBe(TESTNET_ISSUER);
    expect(getAssetIssuer('USDC')).toBe(TESTNET_ISSUER);
    expect(supportedAssetCodes()).toEqual(['XLM', 'EURC', 'USDC']);
  });

  it('keeps mainnet issuers independent from testnet', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPPORTED_ASSETS_MAINNET', `USDC:${MAINNET_ISSUER}`);
    const testnet = await loadBridgelet();
    expect(testnet.getAssetIssuer('USDC')).toBeUndefined();

    vi.stubEnv('NEXT_PUBLIC_CRYPTO_NETWORK', 'stellar-mainnet');
    const mainnet = await loadBridgelet();
    expect(mainnet.getAssetIssuer('USDC')).toBe(MAINNET_ISSUER);
  });

  it('prefers the network-specific allowlist over the shared fallback', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPPORTED_ASSETS', `USDC:${SHARED_ISSUER}`);
    vi.stubEnv('NEXT_PUBLIC_SUPPORTED_ASSETS_TESTNET', `USDC:${TESTNET_ISSUER}`);
    const { getAssetIssuer } = await loadBridgelet();
    expect(getAssetIssuer('USDC')).toBe(TESTNET_ISSUER);
  });

  it('uses the shared allowlist when the network-specific value is unset', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_CRYPTO_NETWORK', 'stellar-testnet');
    vi.stubEnv('NEXT_PUBLIC_SUPPORTED_ASSETS', `USDC:${SHARED_ISSUER}`);
    const { getAssetIssuer } = await loadBridgelet();
    expect(getAssetIssuer('USDC')).toBe(SHARED_ISSUER);
  });

  it('never reports an unknown asset code as available', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPPORTED_ASSETS_TESTNET', `USDC:${TESTNET_ISSUER}`);
    const { getAssetIssuer, isAssetAvailable } = await loadBridgelet();
    expect(getAssetIssuer('FAKE')).toBeUndefined();
    expect(isAssetAvailable('FAKE')).toBe(false);
  });
});
