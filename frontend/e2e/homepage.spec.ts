import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should render correctly and match snapshot', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveScreenshot('homepage.png', { fullPage: true })
  })
})
