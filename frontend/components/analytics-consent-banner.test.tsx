import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ANALYTICS_CONSENT_KEY,
  resetAnalyticsConsent,
  setAnalyticsConsent,
} from '@/lib/analytics-consent';
import { AnalyticsConsentBanner } from './analytics-consent-banner';
import { AnalyticsConsentSettings } from './analytics-consent-settings';

describe('AnalyticsConsentBanner (#1092)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetAnalyticsConsent();
  });

  it('shows an accessible region while no decision is recorded', () => {
    render(<AnalyticsConsentBanner />);
    expect(screen.getByRole('region', { name: /optional product analytics/i })).toBeInTheDocument();
  });

  it('offers equally available Reject and Accept choices', () => {
    render(<AnalyticsConsentBanner />);
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept analytics/i })).toBeInTheDocument();
  });

  it('links to the analytics documentation for an informed choice', () => {
    render(<AnalyticsConsentBanner />);
    expect(screen.getByRole('link', { name: /learn more/i })).toHaveAttribute(
      'href',
      expect.stringContaining('docs/analytics-spec.md'),
    );
  });

  it('records a grant and hides the banner', async () => {
    const user = userEvent.setup();
    render(<AnalyticsConsentBanner />);

    await user.click(screen.getByRole('button', { name: /accept analytics/i }));

    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('granted');
    expect(screen.queryByRole('region', { name: /optional product analytics/i })).toBeNull();
  });

  it('records a rejection, purges identifiers and hides the banner', async () => {
    localStorage.setItem('bridgelet_anonymous_id', 'old-id');
    const user = userEvent.setup();
    render(<AnalyticsConsentBanner />);

    await user.click(screen.getByRole('button', { name: /^reject$/i }));

    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('denied');
    expect(localStorage.getItem('bridgelet_anonymous_id')).toBeNull();
    expect(screen.queryByRole('region', { name: /optional product analytics/i })).toBeNull();
  });

  it('does not show for a visitor who already chose', () => {
    setAnalyticsConsent('granted');
    render(<AnalyticsConsentBanner />);
    expect(screen.queryByRole('region', { name: /optional product analytics/i })).toBeNull();
  });

  it('can be reopened from the footer, making withdrawal as easy as opting in', async () => {
    setAnalyticsConsent('denied');
    const user = userEvent.setup();
    render(
      <>
        <AnalyticsConsentSettings />
        <AnalyticsConsentBanner />
      </>,
    );
    expect(screen.queryByRole('region', { name: /optional product analytics/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: /analytics settings/i }));

    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBeNull();
    expect(screen.getByRole('region', { name: /optional product analytics/i })).toBeInTheDocument();
  });
});
