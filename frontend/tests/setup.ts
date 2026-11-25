import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { setAnalyticsConsent } from '@/lib/analytics-consent';

/**
 * #1092: production requires explicit opt-in before any analytics event.
 * Existing event-emission tests are about payloads and call sites, not the
 * consent gate, so they run with consent granted here. Dedicated gate tests
 * call `resetAnalyticsConsent()` to exercise the opt-in default.
 */
beforeEach(() => {
  setAnalyticsConsent('granted');
});
