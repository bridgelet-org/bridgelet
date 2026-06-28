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
    await page.goto('/claim/example-token?state=claimed')
    await expect(page).toHaveScreenshot('claim-already-claimed.png', { fullPage: true })
  })

  test('should show expired state and match snapshot', async ({ page }) => {
    await page.goto('/claim/example-token?state=expired')
    await expect(page).toHaveScreenshot('claim-expired.png', { fullPage: true })
  })
})
