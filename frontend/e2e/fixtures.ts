/**
 * Shared Playwright fixtures for the frontend e2e suite (issue #767).
 *
 * Everything the send/claim flow needs is stubbed here and in
 * `stub-sdk.mjs`:
 *   - the Next app points at the stub SDK + Horizon via env (playwright.config).
 *   - Freighter is replaced by a `window.postMessage` responder that answers
 *     the library's `FREIGHTER_EXTERNAL_MSG_REQUEST` messages.
 *
 * No testnet, no real extension, no live SDK.
 */

/* eslint-disable react-hooks/rules-of-hooks -- Playwright's fixture `use` callback is not a React hook */

import { test as base, expect, type Page, type Locator } from '@playwright/test';

/** A real (valid strkey) Stellar public key standing in for the sender wallet. */
export const WALLET_PK = 'GCQCSGSQLB4TPCPVP6QKIVBAW5RQWYESS2WQI3KET2U4XKFACRJRQEUI';

/** A valid strkey destination for a claim sweep. */
export const CLAIM_DESTINATION = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

/** Hide the Next.js dev overlay so it never intercepts clicks in dev mode. */
async function hideNextDevPortal(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const inject = () => {
      if (document.getElementById('pw-next-dev-overlay-hide')) return;
      const style = document.createElement('style');
      style.id = 'pw-next-dev-overlay-hide';
      style.textContent =
        'nextjs-portal, [data-nextjs-portal], nextjs-dev-tools { display: none !important; visibility: hidden !important; pointer-events: none !important; }';
      (document.head || document.documentElement).appendChild(style);
    };
    if (document.readyState === 'interactive' || document.readyState === 'complete') inject();
    else document.addEventListener('DOMContentLoaded', inject, { once: true });
  });
}

/**
 * Runs before navigation:
 *   1. Unregisters any service workers (keeps MSW from grabbing requests).
 *   2. Seeds a connected wallet in localStorage.
 *   3. Replaces `window.postMessage` with a Freighter responder.
 */
async function setupPage(page: Page, publicKey = WALLET_PK): Promise<void> {
  await hideNextDevPortal(page);
  await page.addInitScript((key: string) => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((reg) => reg.unregister()));
    }

    localStorage.setItem(
      'bridgelet_wallet',
      JSON.stringify({ publicKey: key, type: 'freighter' }),
    );

    const origPostMessage = window.postMessage.bind(window);
    window.postMessage = function (data: unknown, ...args: unknown[]) {
      const msg = data as { source?: string; type?: string; transactionXdr?: string; messageId?: string };
      if (msg && msg.source === 'FREIGHTER_EXTERNAL_MSG_REQUEST') {
        const respond = (extra: Record<string, unknown>) => {
          setTimeout(() => {
            window.dispatchEvent(
              new MessageEvent('message', {
                source: window,
                data: {
                  source: 'FREIGHTER_EXTERNAL_MSG_RESPONSE',
                  messagedId: msg.messageId,
                  publicKey: key,
                  address: key,
                  ...extra,
                },
              }),
            );
          }, 0);
        };
        if (msg.type === 'SUBMIT_TRANSACTION') {
          // Echo the unsigned envelope back. TransactionBuilder.fromXDR only
          // parses it (signatures are never verified) and the Horizon submit
          // is served by the stub, so no real signing is required.
          respond({ signedTransaction: msg.transactionXdr, signerAddress: key });
          return;
        }
        respond({ isConnected: true });
        return;
      }
      return (origPostMessage as (msg: unknown, ...rest: unknown[]) => void)(data, ...args);
    };
  }, publicKey);
}

/** Block the MSW service worker script so it cannot re-register. */
async function blockMsw(page: Page): Promise<void> {
  await page.route('**/mockServiceWorker.js', (route) => route.abort());
}

function press(page: Page, locator: Locator) {
  return locator.click({ timeout: 10_000 });
}

// ── SendFlow page object ──────────────────────────────────────────────────────

export class SendFlowPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/send');
    await expect(
      this.page.getByRole('heading', { name: /step 1 of 4: connect wallet/i }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async connectWallet(): Promise<void> {
    await press(this.page, this.page.getByRole('button', { name: /connect freighter wallet/i }));
    await expect(
      this.page.getByRole('heading', { name: /step 2 of 4: set expiry/i }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async goThroughExpiry(): Promise<void> {
    await press(this.page, this.page.getByRole('button', { name: /continue/i }));
    await expect(
      this.page.getByRole('heading', { name: /step 3 of 4: set account details/i }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async fillDetails(opts: { amount?: string; email?: string } = {}): Promise<void> {
    const { amount = '10', email = 'e2e@example.com' } = opts;
    await this.page.getByLabel('Amount').fill(amount);
    await this.page.getByLabel('Recipient email').fill(email);
    await press(this.page, this.page.getByRole('button', { name: /review payment/i }));
    await expect(
      this.page.getByRole('heading', { name: /step 4 of 4: create account/i }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async confirmAndSend(): Promise<void> {
    await press(this.page, this.page.getByRole('button', { name: /confirm & send/i }));
  }

  async waitForSuccess(): Promise<void> {
    await expect(this.page.getByText(/payment sent!/i)).toBeVisible({ timeout: 20_000 });
  }

  async submitFullFlow(): Promise<void> {
    await this.goto();
    await this.connectWallet();
    await this.goThroughExpiry();
    await this.fillDetails();
    await this.confirmAndSend();
    await this.waitForSuccess();
  }
}

// ── ClaimFlow page object ─────────────────────────────────────────────────────

export class ClaimFlowPage {
  constructor(private readonly page: Page) {}

  async goto(token: string): Promise<void> {
    await this.page.goto(`/claim/${token}`);
  }

  async waitForClaimCard(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: /claim your payment|payment|expired|already/i }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async claimFunds(destinationAddress = CLAIM_DESTINATION): Promise<void> {
    await this.page.getByLabel(/your stellar wallet address/i).fill(destinationAddress);
    await press(this.page, this.page.getByRole('button', { name: /claim now/i }));
  }
}

type BridgeletFixtures = {
  sendPage: SendFlowPage;
  claimPage: ClaimFlowPage;
};

export const test = base.extend<BridgeletFixtures>({
  async sendPage({ page }, use) {
    await setupPage(page);
    await blockMsw(page);
    await use(new SendFlowPage(page));
  },

  async claimPage({ page }, use) {
    await hideNextDevPortal(page);
    await blockMsw(page);
    await use(new ClaimFlowPage(page));
  },
});

export { expect, press };
