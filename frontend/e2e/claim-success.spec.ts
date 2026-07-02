import { test, expect } from '@playwright/test'

test.describe('Claim Success Screens', () => {
  test('should show claim submission success and match snapshot', async ({ page }) => {
    await page.goto('/claim/example-token')
    
    // Click "Claim now" to see the success state
    await page.click('button:has-text("Claim now")')
    
    // Wait for success message
    await expect(page.getByText('Claim submitted!')).toBeVisible()
    await expect(page).toHaveScreenshot('claim-submitted-success.png', { fullPage: true })
  })
  
  test('should show already claimed state and match snapshot', async ({ page }) => {
    // Let's create a test page or component that shows claimed state
    // Wait, let's modify ClaimStatusCard to have a way to test all states
    // Wait, let's create a temporary test route or use the sandbox
    // Let's create a test page that renders ClaimStatusCard with status="claimed"
    await page.goto('/claim/example-token?state=claimed')
    await expect(page).toHaveScreenshot('claim-already-claimed.png', { fullPage: true })
  })
})
