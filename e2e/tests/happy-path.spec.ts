/**
 * End-to-end integration test: send → claim → sweep happy path.
 *
 * This test exercises the full user journey that no unit or component test
 * can catch:
 *
 *   1. A sender opens /send, fills in payment details, and submits.
 *   2. The frontend calls POST /api/accounts (proxied to bridgelet-sdk).
 *   3. The backend returns a claim URL.
 *   4. A recipient opens /claim/<token>.
 *   5. The frontend calls POST /claims/verify to fetch claim details.
 *   6. The recipient enters a destination address and clicks "Claim now".
 *   7. The frontend calls POST /claims/redeem.
 *   8. Funds are swept; the UI shows the claimed state.
 *
 * API calls are intercepted with `page.route()` so tests are deterministic
 * regardless of whether a real bridgelet-sdk instance is available.
 *
 * To run against a real backend, set:
 *   E2E_USE_MOCKS=false E2E_API_BASE_URL=http://localhost:3001
 *
 * See e2e/README.md for full setup instructions.
 */

import { test, expect, press } from '../fixtures/bridgelet';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Fake Stellar public key used as the claim destination address. */
const DESTINATION_ADDRESS = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

// ── Happy-path suite ──────────────────────────────────────────────────────────

test.describe('Send → Claim → Sweep (happy path)', () => {
  /**
   * Sender completes the send form → success banner appears with
   * "Payment sent!" message.
   */
  test('completes the full send flow and shows a success message', async ({ sendPage, page }) => {
    await sendPage.goto();
    await sendPage.connectWallet();

    await sendPage.fillDetails({
      email: 'recipient@e2e-test.bridgelet.app',
      amount: '10',
      memo: 'E2E integration test',
    });

    await sendPage.confirmAndSend();
    await sendPage.waitForSuccess();

    // The success banner must include "Payment sent!"
    await expect(page.getByRole('status')).toContainText(/payment sent/i);
  });

  /**
   * Recipient opens the claim page, sees a pending claim, and successfully
   * claims the funds.
   */
  test('recipient can view a pending claim and claim funds', async ({ claimPage, page }) => {
    await claimPage.goto('e2e-integration-test-token');
    await claimPage.waitForClaimCard();

    // The claim card should show the pending/available state.
    await expect(page.getByRole('article')).toBeVisible({ timeout: 10_000 });

    // Enter destination address and submit.
    await claimPage.claimFunds(DESTINATION_ADDRESS);

    // After a successful claim, ClaimPageClient updates the view to CLAIMED
    // status. ClaimStatusCard renders the ClaimedPanel whose heading reads
    // "Payment already claimed".  We use getByRole('heading', …) to avoid
    // strict-mode violations from broader regex matches like /claimed/i.
    await expect(
      page.getByRole('heading', { name: 'Payment already claimed' }),
    ).toBeVisible({ timeout: 10_000 });
  });

  /**
   * Full end-to-end journey: sender sends → recipient claims funds.
   *
   * NOTE: We intentionally do NOT use the `claimPage` fixture here because
   * combining it with `sendPage` on the same `page` object causes duplicate
   * `addInitScript` + `installHappyPathMocks` registrations.  The freighter
   * postMessage mock from `setupPage` persists across navigations and can
   * interfere with the claim page.  Instead we reuse the route handlers
   * already installed by `sendPage` and navigate manually.
   */
  test('complete end-to-end: send → navigate to claim page → claim funds', async ({
    sendPage,
    page,
  }) => {
    // ── Step 1: Sender completes the send form ───────────────────────────────
    await sendPage.goto();
    await sendPage.connectWallet();
    await sendPage.fillDetails({ email: 'e2e@example.com', amount: '5' });
    await sendPage.confirmAndSend();
    await sendPage.waitForSuccess();

    // ── Step 2: Navigate to the claim page ──────────────────────────────────
    // The mock success banner does not include a clickable claim link, so we
    // use the known mock token directly.  (Calling sendPage.getClaimUrl()
    // would auto-wait 30 s for a non-existent <a> element, exceeding the
    // test timeout.)
    const token = 'e2e-mock-claim-token-abc123';

    // ── Step 3: Recipient claims the funds (manual navigation) ──────────────
    await page.goto(`/claim/${token}`);
    await expect(
      page.getByRole('heading', { name: /claim your payment/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/loading claim details/i)).not.toBeVisible({
      timeout: 15_000,
    });

    await page.getByLabel(/your stellar wallet address/i).fill(DESTINATION_ADDRESS);
    await press(page, page.getByRole('button', { name: /claim now/i }));

    // After a successful claim the ClaimStatusCard shows the CLAIMED state.
    await expect(
      page.getByRole('heading', { name: 'Payment already claimed' }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('fires the expected funnel analytics events during send and claim', async ({
    sendPage,
    page,
  }) => {
    await page.addInitScript(() => {
      (window as unknown as { __analyticsCalls?: string[] }).__analyticsCalls = [];
      (window as unknown as { plausible?: (...args: unknown[]) => void }).plausible = (...args) => {
        const calls = (window as unknown as { __analyticsCalls?: string[] }).__analyticsCalls;
        if (calls) {
          calls.push(String(args[0]));
        }
      };
    });

    await sendPage.goto();
    await sendPage.connectWallet();
    await sendPage.fillDetails({ email: 'analytics@e2e-test.bridgelet.app', amount: '12' });
    await sendPage.confirmAndSend();
    await sendPage.waitForSuccess();

    await expect.poll(async () => {
      return (await page.evaluate(() => {
        return (window as unknown as { __analyticsCalls?: string[] }).__analyticsCalls ?? [];
      }));
    }).toEqual(expect.arrayContaining(['Payment Confirmed', 'Payment Created']));

    const token = 'e2e-mock-claim-token-abc123';
    await page.goto(`/claim/${token}`);
    await expect(
      page.getByRole('heading', { name: /claim your payment/i }),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByLabel(/your stellar wallet address/i).fill(DESTINATION_ADDRESS);
    await press(page, page.getByRole('button', { name: /claim now/i }));

    await expect.poll(async () => {
      return (await page.evaluate(() => {
        return (window as unknown as { __analyticsCalls?: string[] }).__analyticsCalls ?? [];
      }));
    }).toEqual(expect.arrayContaining(['Claim Page Opened', 'Claim Succeeded']));
  });
});
