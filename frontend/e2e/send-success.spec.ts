import { test, expect } from '@playwright/test'

test.describe('Send Success Screen', () => {
  test('should show success screen and match snapshot', async ({ page }) => {
    // Mock the connectFreighter function to return a test public key
    await page.addInitScript(() => {
      // @ts-ignore: Mocking for test purposes
      const original = window.require
      // @ts-ignore: Mocking for test purposes
      window.require = (mod: string) => {
        if (mod === '@/lib/wallet') {
          return {
            connectFreighter: () => Promise.resolve({ publicKey: 'GABC123456789' })
          }
        }
        return original?.(mod)
      }
    })

    await page.goto('/send')
    
    // Click connect button
    await page.click('button:has-text("Connect Freighter Wallet")')
    
    // Wait for wallet connected message
    await expect(page.getByText('Wallet connected')).toBeVisible()
    
    // Wait for next step to load, then fill details
    await page.waitForSelector('#recipient-email')
    await page.fill('#recipient-email', 'test@example.com')
    await page.fill('#amount', '5')
    await page.click('button:has-text("Review Payment")')
    
    // Confirm and send
    await page.click('button:has-text("Confirm & Send")')
    
    // Wait for success screen
    await expect(page.getByText('Payment sent!')).toBeVisible()
    await page.goto('/sandbox/send-success')
    await expect(page).toHaveScreenshot('send-success.png', { fullPage: true })
  })
})
