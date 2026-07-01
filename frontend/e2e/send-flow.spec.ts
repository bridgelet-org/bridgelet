import { expect, test } from '@playwright/test';

test.describe('Send flow', () => {
  test('completes the full happy path and shows a claim link', async ({ page }) => {
    await page.goto('/send');

    await expect(page.locator('h2').filter({ hasText: /Connect Wallet/i })).toBeVisible();

    await page.evaluate(() => {
      localStorage.setItem(
        'bridgelet_wallet',
        JSON.stringify({ publicKey: 'GBALBEDO76V6K67X4PZ72NC556XU54K75QNZP2Z5F4O7V6Y456QWERTY', type: 'freighter' }),
      );
    });

    await page.reload();

    await expect(page.locator('h2').filter({ hasText: /Payment Details/i })).toBeVisible();

    await page.getByLabel('Recipient email').fill('recipient@example.com');
    await page.getByLabel('Amount').fill('10');
    await page.getByLabel('Memo').fill('Launch party');
    await page.getByRole('button', { name: /review payment/i }).click();

    await expect(page.locator('h2').filter({ hasText: /Confirm & Send/i })).toBeVisible();
    await page.getByRole('button', { name: /confirm & send/i }).click();

    await expect(page.getByRole('status')).toContainText('Payment sent!');
    await expect(page.getByTestId('claim-link')).toHaveAttribute('href', /\/claim\/mock-token-123$/);
  });
});
