/**
 * Shared Playwright test fixtures for the Bridgelet e2e harness.
 *
 * ## How mocking works
 *
 * The frontend dev server runs MSW as a browser service worker that intercepts
 * all API calls. Playwright's `page.route()` handlers run at the network
 * proxy level *before* the service worker, so they take priority — but only
 * for requests that reach the network. MSW intercepts at the browser level
 * *after* `page.route()` has a chance to fulfill.
 *
 * In practice, Playwright `page.route()` DOES take precedence over MSW
 * because Playwright intercepts at the CDP level before the request reaches
 * the browser's network stack. However, there's one edge case: if MSW's
 * service worker is already registered and has handled a request in the same
 * browser context, it may have cached service worker registrations that
 * interfere.
 *
 * Our strategy: unregister all service workers via `addInitScript` so MSW
 * never activates, then use `page.route()` for all API mocking.
 */

import { test as base, expect, type Page, type Locator } from '@playwright/test';

// ── Constants ─────────────────────────────────────────────────────────────────

/** A deterministic fake Stellar public key used across all e2e tests. */
export const MOCK_PUBLIC_KEY = 'GBALBEDOFAKEWALLETADDRESSKEYPLACEHOLDERXXXXXQNZP2Z5F4O7QWERTY';

/**
 * Hide Next.js dev-server UI that would otherwise intercept pointer events.
 *
 * Next.js 15/16 dev mode injects a `<nextjs-portal>` shell (dev indicators,
 * hot-reload bubble, error overlay). Its hit area overlaps page content and
 * makes Playwright report "element intercepts pointer events" when clicking
 * real buttons. In CI the e2e suite runs against `npm run dev`, so this rule
 * must be applied in every test that clicks; it is inert in production
 * builds (no portal is injected).
 *
 * NOTE: the style must live in `<head>` — a bare style appended to
 * `document.documentElement` from an init script is discarded by Next's
 * hydration. We wait for the DOM to be ready before injecting.
 */
export async function hideNextDevPortal(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const inject = () => {
      if (document.getElementById('pw-next-dev-overlay-hide')) return;
      const style = document.createElement('style');
      style.id = 'pw-next-dev-overlay-hide';
      style.textContent =
        'nextjs-portal, [data-nextjs-portal], nextjs-dev-tools { display: none !important; visibility: hidden !important; pointer-events: none !important; }';
      (document.head || document.documentElement).appendChild(style);
    };
    if (document.readyState === 'ready' || document.readyState === 'complete') {
      inject();
    } else {
      document.addEventListener('DOMContentLoaded', inject, { once: true });
    }
  });
}

// ── Pre-navigation setup ──────────────────────────────────────────────────────

/**
 * Runs before page load to:
 *  1. Unregister any existing service workers (disables MSW).
 *  2. Seed localStorage with a connected wallet.
 *  3. Reset the dev toolbar mock scenario to 'happy'.
 *  4. Mock window.freighter so the Connect Wallet button succeeds.
 *  5. Hide the Next.js dev portal (see `hideNextDevPortal`).
 */
async function setupPage(page: Page, publicKey = MOCK_PUBLIC_KEY): Promise<void> {
  await hideNextDevPortal(page);
  await page.addInitScript((key: string) => {
    // 1. Unregister all service workers to prevent MSW from intercepting
    //    requests before Playwright's page.route() handlers can fire.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
    }

    // 2. Seed the wallet in localStorage so the send form can use it.
    localStorage.setItem('bridgelet_wallet', JSON.stringify({ publicKey: key, type: 'freighter' }));

    // 3. Reset the dev toolbar scenario to 'happy'.
    sessionStorage.setItem('bridgelet_mock_scenario', 'happy');

    // 4. Mock the freighter chrome-extension messaging so connectFreighter()
    //    succeeds without a real extension installed.
    //    The freighter-api library uses window.postMessage + window.addEventListener
    //    to communicate with the extension content script.
    //    We intercept by overriding postMessage to immediately dispatch the
    //    expected FREIGHTER_EXTERNAL_MSG_RESPONSE back.
    const origPostMessage = window.postMessage.bind(window);
    window.postMessage = function (data: unknown, ...args: unknown[]) {
      const msg = data as Record<string, unknown>;
      if (msg && msg['source'] === 'FREIGHTER_EXTERNAL_MSG_REQUEST') {
        // Immediately synthesize the extension response.
        setTimeout(() => {
          window.dispatchEvent(new MessageEvent('message', {
            source: window,
            data: {
              source: 'FREIGHTER_EXTERNAL_MSG_RESPONSE',
              messagedId: msg['messageId'],
              isConnected: true,
              publicKey: key,
              address: key,
            },
          }));
        }, 0);
        return;
      }
      return origPostMessage(data, ...(args as [string?, WindowPostMessageOptions?]));
    };
  }, publicKey);
}

/**
 * Lightweight setup for claim-page-only tests: unregisters MSW and resets
 * the mock scenario, but does not seed a wallet or mock freighter.
 */
async function setupClaimPage(page: Page): Promise<void> {
  await hideNextDevPortal(page);
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
    }
    sessionStorage.setItem('bridgelet_mock_scenario', 'happy');
  });
}

// ── API route interceptors ────────────────────────────────────────────────────

/** Install happy-path API route interceptors (replaces MSW in e2e tests). */
export async function installHappyPathMocks(page: Page): Promise<void> {
  // POST /api/accounts — account creation (proxied through Next.js)
  await page.route('**/api/accounts', async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        accountId: 'e2e-test-account-id',
        publicKey: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZEGFXTT2EWY38EWZMV3QH',
        claimUrl: '/claim/e2e-mock-claim-token-abc123',
        amount: '10.0000000',
        asset: 'XLM',
        status: 'pending_payment',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      }),
    });
  });

  // POST /api/accounts/prepare — not supported in e2e; return 404 so the client
  // falls through to backend account creation (see isPrepareUnavailableError)
  await page.route('**/api/accounts/prepare', async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not supported' }) });
  });

  // POST /claims/verify — claim token verification
  await page.route('**/claims/verify', async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        valid: true,
        accountId: 'e2e-test-account-id',
        amount: '100.0000000', // 100 XLM
        asset: 'XLM',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    });
  });

  // POST /claims/redeem — sweep execution
  await page.route('**/claims/redeem', async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        txHash: 'e2e-mock-tx-hash-abc123',
        amountSwept: '100.0000000',
        asset: 'XLM',
        destination: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        sweptAt: new Date().toISOString(),
        message: 'E2E test sweep completed.',
      }),
    });
  });

  // Block the MSW service worker registration script itself so it can't
  // re-register after our unregisterAll call.
  await page.route('**/mockServiceWorker.js', async (route) => {
    await route.fulfill({ status: 404, body: 'Not found in e2e mode' });
  });
}

/**
 * Click a button reliably in both desktop and touch/mobile contexts.
 *
 * Playwright's `click()` in WebKit mobile projects can hang in its "scroll
 * into view / stability" loop for elements near the bottom of the page
 * without ever dispatching (macOS/iOS Safari reports the element as outside
 * the viewport indefinitely). A short timeout with a DOM-click fallback
 * (React's event delegation still receives `dispatchEvent`) keeps the click
 * honest on desktop while never hanging on mobile WebKit.
 */
export async function press(page: Page, locator: Locator): Promise<void> {
  try {
    await locator.click({ timeout: 5_000 });
  } catch {
    await locator.dispatchEvent('click');
  }
}

// ── SendFlow page object ──────────────────────────────────────────────────────

export class SendFlowPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/send');
    await expect(this.page.locator('h1').filter({ hasText: /create a new ephemeral account/i })).toBeVisible({
      timeout: 10_000,
    });
  }

  /**
   * Advance past the Connect Wallet step.
   * The freighter extension messaging is mocked via `setupPage()` so the
   * button click resolves immediately with the seeded public key.
   */
  async connectWallet(): Promise<void> {
    // Check if already past the connect step.
    const alreadyAtDetails = await this.page.locator('h2').filter({ hasText: /step 2 of 4/i }).isVisible().catch(() => false);
    if (alreadyAtDetails) return;

    await press(this.page, this.page.getByRole('button', { name: /connect freighter wallet/i }));
    await expect(
      this.page.locator('h2').filter({ hasText: /step 2 of 4: set expiry/i }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async fillDetails(opts: { email?: string; amount?: string; memo?: string } = {}): Promise<void> {
    const { email = 'e2e-test@bridgelet.app', amount = '10', memo = 'E2E test payment' } = opts;

    // Step 2 is expiry — accept the default (24 h) and continue.
    await press(this.page, this.page.getByRole('button', { name: /continue/i }));
    await expect(
      this.page.locator('h2').filter({ hasText: /step 3 of 4: set account details/i }),
    ).toBeVisible({ timeout: 10_000 });

    await this.page.getByLabel('Recipient email').fill(email);
    await this.page.getByLabel('Amount').fill(amount);
    if (memo) await this.page.getByLabel(/memo/i).fill(memo);
    await press(this.page, this.page.getByRole('button', { name: /review payment/i }));
    await expect(
      this.page.locator('h2').filter({ hasText: /step 4 of 4: create account/i }),
    ).toBeVisible({ timeout: 10_000 });
  }

  async confirmAndSend(): Promise<void> {
    await expect(this.page.locator('h2').filter({ hasText: /step 4 of 4: create account/i })).toBeVisible({ timeout: 10_000 });
    await press(this.page, this.page.getByRole('button', { name: /confirm & send/i }));
  }

  async waitForSuccess(): Promise<void> {
    await expect(this.page.getByRole('status')).toBeVisible({ timeout: 15_000 });
    await expect(this.page.getByRole('status')).toContainText(/payment sent/i);
  }

  async getClaimUrl(): Promise<string | null> {
    const claimLink = this.page.locator('[role="status"] a[href*="/claim/"]');
    const href = await claimLink.getAttribute('href').catch(() => null);
    if (href) return href;
    return this.page.getByTestId('claim-link').getAttribute('href').catch(() => null);
  }
}

// ── ClaimFlow page object ─────────────────────────────────────────────────────

export class ClaimFlowPage {
  constructor(private readonly page: Page) {}

  async goto(token: string): Promise<void> {
    await this.page.goto(`/claim/${token}`);
    await expect(this.page.getByRole('heading', { name: /claim your payment/i })).toBeVisible({ timeout: 10_000 });
  }

  async waitForClaimCard(): Promise<void> {
    await expect(this.page.getByText(/loading claim details/i)).not.toBeVisible({ timeout: 15_000 });
  }

  /** Fill destination and click "Claim now" (the button text in AvailablePanel). */
  async claimFunds(destinationAddress: string): Promise<void> {
    await this.page.getByLabel(/your stellar wallet address/i).fill(destinationAddress);
    await press(this.page, this.page.getByRole('button', { name: /claim now/i }));
  }
}

// ── Analytics spy ────────────────────────────────────────────────────────────

/**
 * Installs a `window.plausible` stub that records every analytics call into
 * `window.__analyticsEvents` before the page loads. This lets e2e tests
 * assert which events fired — and that none were silently dropped — without
 * relying on a live Plausible instance.
 *
 * Must be called before `page.goto()` so the stub is in place when the
 * Plausible script tag would normally mount.
 */
export async function addAnalyticsSpy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__analyticsEvents = [];
    (window as unknown as Record<string, unknown>).plausible = (
      event: string,
      opts: { props?: Record<string, unknown> },
    ) => {
      (window as unknown as { __analyticsEvents: Array<{ event: string; props: Record<string, unknown> }> }).__analyticsEvents.push({
        event,
        props: opts?.props ?? {},
      });
    };
  });
}

/** Returns all events captured by the analytics spy. */
export async function getAnalyticsEvents(
  page: Page,
): Promise<Array<{ event: string; props: Record<string, unknown> }>> {
  return page.evaluate(() => {
    return (window as unknown as { __analyticsEvents: Array<{ event: string; props: Record<string, unknown> }> }).__analyticsEvents ?? [];
  });
}

// ── Extended test fixtures ────────────────────────────────────────────────────

type BridgeletFixtures = {
  sendPage: SendFlowPage;
  claimPage: ClaimFlowPage;
};

export const test = base.extend<BridgeletFixtures>({
  async sendPage({ page }, use) {
    await setupPage(page);
    await installHappyPathMocks(page);
    await use(new SendFlowPage(page));
  },

  async claimPage({ page }, use) {
    await setupClaimPage(page);
    await installHappyPathMocks(page);
    await use(new ClaimFlowPage(page));
  },
});

export { expect };
