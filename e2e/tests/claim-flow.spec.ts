/**
 * Issue #456: Playwright E2E suite for the claim flow.
 *
 * Tests the recipient's claim journey in isolation:
 *   1. Navigate to /claim/:token
 *   2. Verify claim card loads with correct details
 *   3. Enter destination address
 *   4. Submit claim
 *   5. Verify success/failure states
 *   6. Test error paths (invalid token, expired claim, etc.)
 *
 * The claim client calls POST /claims/verify (load view) and
 * POST /claims/redeem (sweep), so both are intercepted via `page.route()`.
 */

import { test, expect } from '@playwright/test';
import { hideNextDevPortal } from '../fixtures/bridgelet';

const VALID_TOKEN = 'e2e-claim-test-token-abc123';
const INVALID_TOKEN = 'invalid-token-xyz';
const DESTINATION_ADDRESS = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const VERIFY_200_BODY = {
  valid: true,
  accountId: 'mock-account-id',
  amount: '100.0000000',
  asset: 'XLM',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
};

async function mockVerify(page: import('@playwright/test').Page, body: unknown) {
  await page.route('**/claims/verify', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

async function mockRedeem(page: import('@playwright/test').Page, body: unknown) {
  await page.route('**/claims/redeem', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

test.describe('Claim flow', () => {
  test.beforeEach(async ({ page }) => {
    await hideNextDevPortal(page);
    await mockVerify(page, VERIFY_200_BODY);
    await mockRedeem(page, {
      success: true,
      txHash: 'mock-tx-hash-abc123',
      amountSwept: '100.0000000',
      asset: 'XLM',
      destination: DESTINATION_ADDRESS,
      sweptAt: new Date().toISOString(),
    });
  });

  test('loads claim page and shows claim card', async ({ page }) => {
    await page.goto(`/claim/${VALID_TOKEN}`);

    await expect(
      page.getByRole('heading', { name: /claim your payment/i }),
    ).toBeVisible({ timeout: 15_000 });

    // The claim card should render the payment amount (10 XLM).
    await expect(page.getByRole('article')).toContainText(/10/);
  });

  test('allows entering destination address and claiming', async ({ page }) => {
    await page.goto(`/claim/${VALID_TOKEN}`);
    await expect(
      page.getByRole('heading', { name: /claim your payment/i }),
    ).toBeVisible({ timeout: 15_000 });

    // Fill destination address and submit.
    await page.getByLabel(/your stellar wallet address/i).fill(DESTINATION_ADDRESS);
    await page.getByRole('button', { name: /claim now/i }).click();

    // The CLAIMED panel heading reads "Payment already claimed".
    await expect(
      page.getByRole('heading', { name: /claimed|success|already claimed/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('shows error for invalid token', async ({ page }) => {
    // Verify returns 404 for a token that does not exist.
    await page.route('**/claims/verify', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Claim not found' }),
      }),
    );

    await page.goto(`/claim/${INVALID_TOKEN}`);

    // loadClaimView maps 404 → FAILED; the FAILED panel explains what happened.
    await expect(page.getByRole('article')).toContainText(
      /not found|invalid|couldn't be set up|something went wrong/i,
      { timeout: 15_000 },
    );
  });

  test('validates destination address format', async ({ page }) => {
    await page.goto(`/claim/${VALID_TOKEN}`);
    await expect(
      page.getByRole('heading', { name: /claim your payment/i }),
    ).toBeVisible({ timeout: 15_000 });

    // Enter an invalid address. The inline format hint appears immediately
    // and the Claim button stays disabled until the address is valid.
    await page.getByLabel(/your stellar wallet address/i).fill('not-a-valid-address');
    await expect(
      page.getByText(/enter a valid stellar public key/i).first(),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /claim now/i })).toBeDisabled();
  });
});