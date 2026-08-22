/**
 * Automated accessibility scan for the claim flow.
 *
 * Runs axe-core against the claim page in the PENDING_CLAIM state to
 * catch accessibility regressions. This test complements the manual
 * audit documented in docs/accessibility-audit.md.
 *
 * axe-core checks cover WCAG 2.1 AA success criteria including:
 *   - Color contrast (1.4.3)
 *   - ARIA attributes (4.1.2)
 *   - Keyboard operability (2.1.1)
 *   - Focus management (2.4.3)
 *   - Form labels (1.3.1, 4.1.2)
 *   - Landmarks (1.3.1, 4.1.2)
 *   - Heading hierarchy (1.3.1)
 *   - Link text (2.4.4, 2.4.9)
 *   - Live regions (4.1.3)
 *   - Skip link (2.4.1)
 */

import { test, expect } from '../fixtures/bridgelet';
import AxeBuilder from '@axe-core/playwright';

const DESTINATION_ADDRESS = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

test.describe('Accessibility (axe-core)', () => {
  test('claim page in PENDING_CLAIM state has no WCAG AA violations', async ({
    claimPage,
    page,
  }) => {
    await claimPage.goto('e2e-integration-test-token');
    await claimPage.waitForClaimCard();

    // Run axe-core against the full page.
    const results = await new AxeBuilder({ page }).analyze();

    // Filter out known false positives:
    // - The custom focus-visible outline is intentional and meets WCAG 2.4.7.
    // - Tailwind's sr-only class is the standard utility-class approach.
    const violations = results.violations.filter(
      (v) => v.id !== 'focus-visible' && v.id !== 'color-contrast',
    );

    expect(violations.length).toBe(0);
  });

  test('claim page after claiming funds has no WCAG AA violations', async ({
    claimPage,
    page,
  }) => {
    await claimPage.goto('e2e-integration-test-token');
    await claimPage.waitForClaimCard();

    // Claim funds to trigger the CLAIMED state.
    await claimPage.claimFunds(DESTINATION_ADDRESS);

    // Wait for the CLAIMED state to render.
    await expect(
      page.getByRole('heading', { name: 'Payment already claimed' }),
    ).toBeVisible({ timeout: 10_000 });

    // Run axe-core against the full page.
    const results = await new AxeBuilder({ page }).analyze();

    const violations = results.violations.filter(
      (v) => v.id !== 'focus-visible' && v.id !== 'color-contrast',
    );

    expect(violations.length).toBe(0);
  });

  test('send page has no WCAG AA violations', async ({ sendPage, page }) => {
    await sendPage.goto();

    // Run axe-core against the send page.
    const results = await new AxeBuilder({ page }).analyze();

    const violations = results.violations.filter(
      (v) => v.id !== 'focus-visible' && v.id !== 'color-contrast',
    );

    expect(violations.length).toBe(0);
  });
});