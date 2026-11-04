/**
 * Issue #455: Playwright E2E suite for the send flow.
 *
 * Exercises the multi-step send form in isolation:
 *   1. Navigate to /send
 *   2. Connect wallet (Freighter mock)
 *   3. Configure expiry settings
 *   4. Fill in recipient details (email, amount, memo)
 *   5. Review and confirm
 *   6. Verify success state
 *
 * These tests reuse the shared `sendPage` fixture (freighter postMessage
 * mock + happy-path API route interceptors) so they stay deterministic.
 */

import { test, expect, press } from '../fixtures/bridgelet';

test.describe('Send flow', () => {
  test('navigates through all send form steps', async ({ sendPage, page }) => {
    await sendPage.goto();

    // Step 1: Connect wallet
    await expect(
      page.getByRole('heading', { name: /step 1 of 4: connect wallet/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /connect freighter wallet/i })).toBeVisible();
    await sendPage.connectWallet();

    // Step 2: Expiry configuration
    await expect(
      page.getByRole('heading', { name: /step 2 of 4: set expiry/i }),
    ).toBeVisible();
    await expect(page.getByRole('radio', { name: /24 hours/i })).toBeChecked();
    await press(page, page.getByRole('button', { name: /continue/i }));

    // Step 3: Recipient details
    await expect(
      page.getByRole('heading', { name: /step 3 of 4: set account details/i }),
    ).toBeVisible();
    await page.getByLabel('Recipient email').fill('test@example.com');
    await page.getByLabel('Amount').fill('10');
    await press(page, page.getByRole('button', { name: /review payment/i }));

    // Step 4: Confirmation
    await expect(
      page.getByRole('heading', { name: /step 4 of 4: create account/i }),
    ).toBeVisible();
    await expect(page.getByText('test@example.com')).toBeVisible();

    // Submit the payment and confirm the success banner appears.
    await sendPage.confirmAndSend();
    await sendPage.waitForSuccess();
  });

  test('validates required fields before proceeding', async ({ sendPage, page }) => {
    await sendPage.goto();
    await sendPage.connectWallet();
    await press(page, page.getByRole('button', { name: /continue/i }));

    // Try to proceed without filling in details.
    await press(page, page.getByRole('button', { name: /review payment/i }));

    // Should show a validation error and stay on the details step.
    await expect(
      page.getByRole('alert').filter({ hasText: /required|invalid|enter/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /step 3 of 4: set account details/i }),
    ).toBeVisible();
  });

  test('shows wallet connection prompt when not connected', async ({ sendPage, page }) => {
    await sendPage.goto();

    // The connect step is shown initially, before the wallet is connected.
    await expect(
      page.getByRole('heading', { name: /step 1 of 4: connect wallet/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /connect freighter wallet/i })).toBeVisible();
    await expect(
      page.locator('p', { hasText: /connect your wallet to authorise payments/i }),
    ).toBeVisible();
  });

  test('displays correct step indicators', async ({ sendPage, page }) => {
    await sendPage.goto();

    for (const label of ['1. Connect', '2. Expiry', '3. Details', '4. Confirm']) {
      await expect(page.getByText(label)).toBeVisible({ timeout: 5_000 });
    }
  });
});