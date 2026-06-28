import { test, expect } from '@playwright/test'

test.describe('Send Success Screen', () => {
  test('should show success screen and match snapshot', async ({ page }) => {
    await page.goto('/sandbox/send-success')
    await expect(page).toHaveScreenshot('send-success.png', { fullPage: true })
  })
})
