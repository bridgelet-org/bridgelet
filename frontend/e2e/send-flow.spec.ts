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
});
