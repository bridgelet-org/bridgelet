/**
 * Playwright configuration for the frontend e2e suite (issue #767).
 *
 * The suite runs against a tiny local **stub SDK** (see `e2e/stub-sdk.mjs`)
 * plus a stubbed Freighter wallet, so it is fully deterministic and never
 * touches Stellar testnet, bridgelet-sdk, or a real extension.
 *
 * Two web servers start before the tests:
 *   1. `e2e/stub-sdk.mjs` on :4100 — the SDK + Horizon surface.
 *   2. the Next.js dev server on :3000, pointed at the stub via env.
 *
 *   npm run test:e2e
 *   npm run test:e2e -- -g "claim success"
 *   npm run test:e2e -- --project=chromium
 */

import { defineConfig, devices } from '@playwright/test';

const STUB_PORT = 4100;
const STUB_URL = `http://localhost:${STUB_PORT}`;
const APP_URL = 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: false,
  workers: process.env['CI'] ? 1 : undefined,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',

  use: {
    baseURL: APP_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // MSW's browser service worker must never take priority over the network
    // stub, so block it entirely; the tests drive real HTTP against the stub.
    serviceWorkers: 'block',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'node e2e/stub-sdk.mjs',
      url: `${STUB_URL}/accounts`,
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { STUB_SDK_PORT: String(STUB_PORT), NEXT_PUBLIC_APP_URL: APP_URL },
    },
    {
      command: 'npm run dev',
      url: APP_URL,
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        // Point the app at the stub so the real Next proxy + claim flow hit
        // deterministic responses instead of a live SDK / Horizon / testnet.
        BRIDGELET_SDK_URL: STUB_URL,
        // The accounts proxy refuses to run without a token; the stub ignores
        // the Authorization header, so any value satisfies the proxy config check.
        BRIDGELET_SDK_TOKEN: 'stub-token',
        NEXT_PUBLIC_API_BASE_URL: STUB_URL,
        NEXT_PUBLIC_HORIZON_URL: `${STUB_URL}/horizon`,
        NEXT_PUBLIC_APP_URL: APP_URL,
        NEXT_PUBLIC_USE_MOCKS: 'false',
        NEXT_PUBLIC_CRYPTO_NETWORK: 'stellar-testnet',
        // Keep the experimental Freighter sender-signing off (issue #766) so the
        // default send makes no request to /api/accounts/prepare.
        NEXT_PUBLIC_ENABLE_FREIGHTER_SENDER_SIGNING: 'false',
        // Never fetch a live CoinGecko rate during the suite.
        NEXT_PUBLIC_SUPPORT_EMAIL: 'support@example.com',
      },
    },
  ],
});
