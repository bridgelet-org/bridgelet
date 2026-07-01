# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: send-flow.spec.ts >> Send flow >> completes the full happy path and shows a claim link
- Location: e2e\send-flow.spec.ts:4:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('status')
Expected substring: "Payment sent!"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByRole('status')

```

```yaml
- navigation:
  - link "Bridgelet home":
    - /url: /
    - img
    - text: bridgelet
- main:
  - heading "Send a Payment" [level=1]
  - paragraph: Send crypto to anyone — even recipients with no wallet. They claim from a secure link.
  - navigation "Send form progress":
    - list:
      - listitem: 1. Connect (complete)
      - listitem: 2. Details (complete)
      - listitem: 3. Confirm (current)
  - 'heading "Step 3 of 3: Confirm & Send" [level=2]'
  - term: From wallet
  - definition: GBALBEDO76V6K67X4PZ72NC556XU54K75QNZP2Z5F4O7V6Y456QWERTY
  - term: Recipient
  - definition: recipient@example.com
  - term: Amount
  - definition: 10 XLM
  - term: Memo
  - definition: Launch party
  - alert: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
  - button "Back"
  - button "Confirm & Send"
- alert
- complementary "Developer toolbar":
  - text: Mock Scenario
  - button "Collapse developer toolbar"
  - group "Choose a mock scenario":
    - text: Choose a mock scenario
    - radio "Happy Path All API calls succeed normally" [checked]
    - text: Happy Path All API calls succeed normally
    - radio "Expired Claim token has expired"
    - text: Expired Claim token has expired
    - radio "Already Claimed Token was already redeemed"
    - text: Already Claimed Token was already redeemed
    - radio "Network Error Simulate a network failure"
    - text: Network Error Simulate a network failure
  - paragraph: Dev only · persisted to sessionStorage
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | test.describe('Send flow', () => {
  4  |   test('completes the full happy path and shows a claim link', async ({ page }) => {
  5  |     await page.goto('/send');
  6  | 
  7  |     await expect(page.locator('h2').filter({ hasText: /Connect Wallet/i })).toBeVisible();
  8  | 
  9  |     await page.evaluate(() => {
  10 |       localStorage.setItem(
  11 |         'bridgelet_wallet',
  12 |         JSON.stringify({ publicKey: 'GBALBEDO76V6K67X4PZ72NC556XU54K75QNZP2Z5F4O7V6Y456QWERTY', type: 'freighter' }),
  13 |       );
  14 |     });
  15 | 
  16 |     await page.reload();
  17 | 
  18 |     await expect(page.locator('h2').filter({ hasText: /Payment Details/i })).toBeVisible();
  19 | 
  20 |     await page.getByLabel('Recipient email').fill('recipient@example.com');
  21 |     await page.getByLabel('Amount').fill('10');
  22 |     await page.getByLabel('Memo').fill('Launch party');
  23 |     await page.getByRole('button', { name: /review payment/i }).click();
  24 | 
  25 |     await expect(page.locator('h2').filter({ hasText: /Confirm & Send/i })).toBeVisible();
  26 |     await page.getByRole('button', { name: /confirm & send/i }).click();
  27 | 
> 28 |     await expect(page.getByRole('status')).toContainText('Payment sent!');
     |                                            ^ Error: expect(locator).toContainText(expected) failed
  29 |     await expect(page.getByTestId('claim-link')).toHaveAttribute('href', /\/claim\/mock-token-123$/);
  30 |   });
  31 | });
  32 | 
```