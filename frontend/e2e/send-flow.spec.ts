/**
 * Issue #767 — send form → claim link (case 1 of the five).
 *
 * Runs the full multi-step send form against the stub SDK + stubbed Freighter
 * and asserts the claim link is shown and the page has no horizontal overflow.
 */

import { test, expect } from './fixtures';

test.describe('Send flow (stub SDK)', () => {
  test('creates a payment and shows the claim link without horizontal overflow', async ({
    sendPage,
    page,
  }) => {
    await sendPage.submitFullFlow();

    // The success panel surfaces the claim link.
    const claimLink = page.getByTestId('claim-link');
    await expect(claimLink).toBeVisible();
    await expect(claimLink).toHaveAttribute('href', /\/claim\//);

    // The claim link must fit the viewport — no sideways scrolling.
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });

  test('does not request the experimental prepare route by default', async ({ sendPage, page }) => {
    const prepareRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/accounts/prepare')) prepareRequests.push(req.url());
    });

    await sendPage.submitFullFlow();

    // Issue #766: the Freighter sender-signing experiment is off by default, so
    // a default send must not hit /api/accounts/prepare.
    expect(prepareRequests).toHaveLength(0);
  });

  test('opens the sent payments history after a send (#956)', async ({ sendPage, page }) => {
    await sendPage.submitFullFlow();

    await page.getByRole('link', { name: /view all sent payments/i }).click();

    await expect(page).toHaveURL(/\/send\/history\/?$/);
    await expect(page.getByRole('heading', { name: /sent payments/i })).toBeVisible();
    // The list is populated from the stub's `{ accounts, total }` response.
    await expect(page.getByRole('main').locator('li').first()).toBeVisible({ timeout: 15_000 });
    // A render crash would replace the page with the global error screen.
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  });
});
