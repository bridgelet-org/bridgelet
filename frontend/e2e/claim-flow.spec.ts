/**
 * Issue #767 — claim flow (cases 2–4 of the five).
 *
 *   2. claim success
 *   3. claim failure shows the specific message and makes exactly one request
 *   4. already-claimed link
 */

import { test, expect } from './fixtures';

test.describe('Claim flow (stub SDK)', () => {
  test('claims a payment successfully', async ({ claimPage, page }) => {
    await claimPage.goto('valid-claim-token');
    await claimPage.waitForClaimCard();

    await claimPage.claimFunds();

    await expect(page.getByText(/payment claimed!/i)).toBeVisible({ timeout: 15_000 });
  });

  test('shows the specific failure message and makes exactly one redeem request', async ({
    claimPage,
    page,
  }) => {
    const redeemRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/claims/redeem')) redeemRequests.push(req.url());
    });

    await claimPage.goto('fail-claim-token');
    await claimPage.waitForClaimCard();

    await claimPage.claimFunds();

    // The stub returns SWEEP_CONTRACT_FAILED (HTTP 500) which is terminal, so the
    // UI must surface a failure alert instead of silently succeeding. The alert is
    // scoped because Next.js also renders an (empty) route-announcer role=alert.
    await expect(
      page.getByRole('alert').filter({ hasText: /claim could not be completed/i }),
    ).toBeVisible({ timeout: 15_000 });

    // A terminal claim failure makes exactly one request (no hidden retries).
    expect(redeemRequests).toHaveLength(1);
  });

  test('marks an already-claimed link as already claimed', async ({ claimPage, page }) => {
    await claimPage.goto('claimed-claim-token');
    await claimPage.waitForClaimCard();

    // The verify call returns 409 → the card renders the already-claimed panel.
    await expect(
      page.getByRole('heading', { name: /payment already claimed/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
