/**
 * Issue #767 — theme toggle (case 5 of the five).
 *
 * Clicking the toggle must actually change the page, not just the button.
 */

import { test, expect } from './fixtures';

test.describe('Theme toggle', () => {
  test('switches the page between light and dark', async ({ page }) => {
    // Start from a known light theme regardless of host preference.
    await page.addInitScript(() => localStorage.setItem('bridgelet-theme', 'light'));

    await page.goto('/');

    const toggle = page.getByRole('button', { name: /switch to dark mode/i });
    await expect(toggle).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await toggle.click();

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: /switch to light mode/i })).toBeVisible();

    await page.getByRole('button', { name: /switch to light mode/i }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
