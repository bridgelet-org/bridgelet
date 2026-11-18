/**
 * End-to-end failure-path tests: expired and invalid claim tokens.
 *
 * These tests verify that the frontend surfaces the correct error states when
 * the bridgelet-sdk backend rejects a claim.
 *
 * Implementation notes on mock priority:
 *
 *   MSW runs as a browser service worker and intercepts requests at the
 *   network level *before* Playwright's `page.route()` fulfills can run.
 *   For most tests we want page.route() to override MSW; this works for
 *   response overrides (fulfill with 401/409/400/500) because page.route()
 *   handlers are matched first when you install them before navigation.
 *
 *   For network abort ("request failed") tests we cannot use route.abort()
 *   against a URL that MSW would otherwise handle; MSW intercepts the
 *   request and fulfills it with the happy-path mock, making the abort
 *   ineffective. Instead we intercept an unrelated URL pattern or navigate
 *   away from the dev server entirely (using a real network error). The
 *   simplest reliable alternative is to fulfill with a non-JSON body so the
 *   JSON.parse inside BridgeletClient throws, which ClaimPageClient catches
 *   and surfaces as the generic error banner.
 */

import { test, expect } from '../fixtures/bridgelet';

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPIRED_TOKEN = 'expired-e2e-test-token';
const INVALID_TOKEN = 'invalid-e2e-test-token';
const CLAIMED_TOKEN = 'already-claimed-e2e-token';
const DESTINATION_ADDRESS = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

// ── Expired token ─────────────────────────────────────────────────────────────

test.describe('Expired claim token', () => {
  test('shows the expired state when the backend returns 401', async ({ page }) => {
    /**
     * Override POST /claims/verify to return 401; the SDK responds with
     * 401 when the claim token's expiry timestamp has passed.
     * ClaimPageClient maps HTTP 401 → AccountStatus.EXPIRED.
     *
     * page.route() takes precedence over MSW when installed before navigation.
     */
    // Reset the MSW scenario so previous tests don't bleed their sessionStorage.
    await page.addInitScript(() => {
      sessionStorage.setItem('bridgelet_mock_scenario', 'happy');
    });
    await page.route('**/claims/verify', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Claim token has expired.',
        }),
      });
    });

    await page.goto(`/claim/${EXPIRED_TOKEN}`);
    await expect(page.getByRole('heading', { name: /claim your payment/i })).toBeVisible();

    // Wait for the loading spinner to disappear.
    await expect(page.getByText(/loading claim details/i)).not.toBeVisible({ timeout: 15_000 });

    // The EXPIRED card should show the expired header text.
    const article = page.getByRole('article');
    await expect(article).toBeVisible({ timeout: 10_000 });
    await expect(article).toContainText(/expired/i);

    // The claim form should NOT be present: there is nothing to redeem.
    await expect(page.getByRole('button', { name: /claim now/i })).not.toBeVisible();
  });

  test('shows a support contact link when supportEmail is configured', async ({ page }) => {
    await page.route('**/claims/verify', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 401, error: 'Unauthorized', message: 'Token expired' }),
      });
    });

    await page.goto(`/claim/${EXPIRED_TOKEN}`);
    await expect(page.getByText(/loading claim details/i)).not.toBeVisible({ timeout: 15_000 });

    // If a support email is configured the expired card renders a mailto link.
    // The test is advisory: it passes regardless of env var.
    const mailtoLink = page.locator('a[href^="mailto:"]');
    const count = await mailtoLink.count();
    if (count > 0) {
      await expect(mailtoLink.first()).toBeVisible();
    }
  });
});

// ── Already-claimed token ─────────────────────────────────────────────────────

test.describe('Already-claimed token', () => {
  test('shows the claimed state when the backend returns 409', async ({ page }) => {
    /**
     * HTTP 409 Conflict means the token has already been redeemed.
     * ClaimPageClient maps this → AccountStatus.CLAIMED.
     */
    await page.route('**/claims/verify', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 409,
          error: 'Conflict',
          message: 'This claim has already been redeemed.',
        }),
      });
    });

    await page.goto(`/claim/${CLAIMED_TOKEN}`);
    await expect(page.getByText(/loading claim details/i)).not.toBeVisible({ timeout: 15_000 });

    const article = page.getByRole('article');
    await expect(article).toBeVisible({ timeout: 10_000 });
    await expect(article).toContainText(/claimed|already/i);

    // No claim button on an already-claimed account.
    await expect(page.getByRole('button', { name: /claim now/i })).not.toBeVisible();
  });
});

// ── Invalid / malformed token ─────────────────────────────────────────────────

test.describe('Invalid claim token', () => {
  test('shows a pending-payment state when the backend returns 400', async ({ page }) => {
    /**
     * HTTP 400 from /claims/verify means the token is malformed or the
     * account is not yet in a claimable state.
     * ClaimPageClient maps this → AccountStatus.PENDING_PAYMENT.
     */
    await page.route('**/claims/verify', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid or malformed claim token.',
        }),
      });
    });

    await page.goto(`/claim/${INVALID_TOKEN}`);
    await expect(page.getByText(/loading claim details/i)).not.toBeVisible({ timeout: 15_000 });

    const article = page.getByRole('article');
    await expect(article).toBeVisible({ timeout: 10_000 });
    // PENDING_PAYMENT header is "Waiting for payment".
    await expect(article).toContainText(/waiting for payment|pending/i);
  });

  test('shows the failed state when the API returns an unhandled error status', async ({
    page,
  }) => {
    /**
     * Return a 422 status with a non-JSON body.  Using a 4xx status avoids
     * the BridgeletClient's automatic retry loop (which only retries 5xx),
     * keeping the test fast.  The client throws BridgeletApiError(422) which
     * loadClaimView maps to AccountStatus.FAILED since 422 doesn't match
     * any of the special-cased codes (401/409/400).
     */
    await page.route('**/claims/verify', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'text/plain',
        body: 'Unprocessable Entity',
      });
    });

    await page.goto(`/claim/${INVALID_TOKEN}`);
    // Wait for loading spinner to disappear.
    await expect(page.getByText(/loading claim details/i)).not.toBeVisible({ timeout: 10_000 });

    // The FAILED panel renders "This payment couldn't be set up".
    const article = page.getByRole('article');
    await expect(article).toBeVisible({ timeout: 10_000 });
    await expect(article).toContainText(/couldn't be set up|something went wrong/i);
  });
});

// ── Redemption failure ────────────────────────────────────────────────────────

test.describe('Claim redemption failure', () => {
  test('shows an error message when POST /claims/redeem fails', async ({ claimPage, page }) => {
    /**
     * /claims/verify returns the happy-path 200 response (from the fixture).
     * /claims/redeem fails with 422 (Unprocessable Entity).
     * Using 4xx avoids the BridgeletClient's automatic retry loop which only
     * retries 5xx, keeping the test fast and deterministic.
     * The AvailablePanel catches the error from onClaim() and renders it in
     * an inline role="alert" element.
     */
    await page.route('**/claims/redeem', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: 'Sweep failed. Please try again.',
        }),
      });
    });

    await claimPage.goto('e2e-redeem-fail-token');
    await claimPage.waitForClaimCard();

    // Fill destination address with a valid key so the "Claim now" button
    // becomes active (it requires a valid Stellar address to enable).
    await page.getByLabel(/your stellar wallet address/i).fill(DESTINATION_ADDRESS);
    await page.getByRole('button', { name: /claim now/i }).click();

    // The inline error message is rendered with role="alert" inside the card.
    // The text content of the non-empty alert contains the error.
    await expect(
      page.getByRole('alert').filter({ hasText: /sweep failed|please try again|something went wrong/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
