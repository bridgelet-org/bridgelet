import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { runAxe, summarizeViolations } from './axe';
import { AccessibleClaimForm } from '@/components/accessible-claim-form';
import { ClaimStatusCard } from '@/components/claim-status-card';
import { AccountStatus } from '@/lib/api/types';

/**
 * WCAG 2.1 AA automated audit for the claim flow (Issue #466).
 *
 * Covers both the new-wallet path (accessible claim form) and the
 * existing-wallet path (claim status card). axe-core runs in jsdom as an
 * informational audit; findings should be filed as separate follow-up
 * issues rather than silently fixed here.
 */

describe('WCAG 2.1 AA audit — claim flow', () => {
  it('reports zero violations on the new-wallet claim form', async () => {
    const { container } = render(<AccessibleClaimForm onSubmit={() => {}} />);

    const results = await runAxe(container);
    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    // eslint-disable-next-line no-console
    console.log(`[claim-form audit]\n${summarizeViolations(results)}`);

    expect(criticalOrSerious).toEqual([]);
  });

  it('checks the existing-wallet claim status card for formal issues', async () => {
    const { container } = render(
      <ClaimStatusCard
        status={AccountStatus.PENDING_CLAIM}
        amountStroops="10000000"
        assetCode="XLM"
        expiresAt="2099-01-01T00:00:00.000Z"
        onClaim={() => {}}
      />,
    );

    const results = await runAxe(container);
    const structural = results.violations.filter(
      (v) => v.id === 'heading-order' || v.id === 'button-name' || v.id === 'link-name',
    );

    // eslint-disable-next-line no-console
    console.log(`[claim-status-card audit]\n${summarizeViolations(results)}`);

    expect(structural).toEqual([]);
  });
});
