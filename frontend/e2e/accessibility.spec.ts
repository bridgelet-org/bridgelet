import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/', '/send', '/claim/example-token'];

test.describe('Accessibility checks', () => {
  for (const route of routes) {
    test(`has no WCAG 2.1 AA violations on ${route}`, async ({ page }) => {
      await page.goto(route);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag21aa'])
        .analyze();

      expect(
        results.violations,
        results.violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n'),
      ).toEqual([]);
    });
  }
});
