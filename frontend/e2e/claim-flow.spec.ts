import { test, expect } from '@playwright/test';

test.describe('Issue #61/#138: Token Claim Flow E2E Happy Path Matrix', () => {
  
  test('should navigate through the entire token claim pipeline successfully', async ({ page }) => {
    // 1. Visit the targeted claim landing page route
    await page.goto('/claim/test-token');

    // 2. Acceptance Criteria: Verify the token status indicator is present and active
    const statusBadge = page.locator('[data-testid="claim-status-available"]');
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).text().toContain('Available');

    // 3. Fill in a valid destination wallet parameter
    const walletInput = page.locator('input[name="walletAddress"]');
    await expect(walletInput).toBeVisible();
    await walletInput.fill('GBALBEDO76V6K67X4PZ72NC556XU54K75QNZP2Z5F4O7V6Y456QWERTY');

    // 4. Submit the claim form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // 5. Assert the loading transition wraps and displays the success screen elements
    const successScreen = page.locator('[data-testid="claim-success-container"]');
    await expect(successScreen).toBeVisible({ timeout: 10000 }); // Graceful allowance for mock pipeline propagation lag
    
    const successHeader = page.locator('h2');
    await expect(successHeader).text().toContain('Claim Submitted Successfully!');
  });
});