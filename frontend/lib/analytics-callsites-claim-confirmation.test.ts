import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { analytics } from '@/lib/analytics';

const source = (relativePath: string) => readFileSync(resolve(__dirname, '..', relativePath), 'utf8');

const CLAIM_CARD = 'components/claim-status-card.tsx';
const CLAIM_PAGE = 'app/claim/[token]/claim-page-client.tsx';

/** Name of the event an emitter sends, captured through the Plausible hook. */
function eventNameOf(emit: () => void): string {
  const plausible = vi.fn();
  (window as unknown as { plausible?: unknown }).plausible = plausible;
  emit();
  return plausible.mock.calls[0]![0] as string;
}

afterEach(() => {
  delete (window as unknown as { plausible?: unknown }).plausible;
});

describe('#1004 Wallet Address Entered', () => {
  it('is emitted by the claim card only after the address passes validation', () => {
    const card = source(CLAIM_CARD);
    const handleClaim = card.indexOf('async function handleClaim()');
    const guard = card.indexOf('if (!isValidAddress)', handleClaim);
    const entered = card.indexOf('analytics.walletAddressEntered(', handleClaim);

    expect(handleClaim).toBeGreaterThan(-1);
    expect(entered).toBeGreaterThan(guard);
    expect(card.lastIndexOf('analytics.walletAddressEntered(')).toBe(entered); // exactly one call site
  });

  it('is emitted before the claim is submitted', () => {
    const card = source(CLAIM_CARD);

    expect(card.indexOf('analytics.walletAddressEntered(')).toBeLessThan(card.indexOf('await onClaim?.('));
  });

  it('never sends the address', () => {
    const card = source(CLAIM_CARD);
    const call = card.slice(card.indexOf('analytics.walletAddressEntered('));

    expect(call.slice(0, call.indexOf(';'))).not.toContain('destinationAddress');
  });

  it('uses the spec event name', () => {
    expect(eventNameOf(() => analytics.walletAddressEntered({ claimId: 'c', usedPreviousAddress: false }))).toBe(
      'Wallet Address Entered',
    );
  });
});

describe('#1005 Wallet Address Validation Failed', () => {
  it('is emitted by the claim card when an entered address fails validation', () => {
    expect(source(CLAIM_CARD)).toContain('analytics.walletAddressValidationFailed(');
  });

  it('uses the spec event name', () => {
    expect(
      eventNameOf(() =>
        analytics.walletAddressValidationFailed({ claimId: 'c', validationError: 'invalid_prefix', attemptNumber: 1 }),
      ),
    ).toBe('Wallet Address Validation Failed');
  });
});

describe('#1006 Claim Confirmation Viewed', () => {
  it('is emitted once the claim is verified and claimable', () => {
    const page = source(CLAIM_PAGE);
    const verified = page.indexOf('analytics.claimVerified(');
    const confirmation = page.indexOf('analytics.claimConfirmationViewed(');

    expect(verified).toBeGreaterThan(-1);
    expect(confirmation).toBeGreaterThan(verified);
  });

  it('uses the spec event name', () => {
    expect(eventNameOf(() => analytics.claimConfirmationViewed({ claimId: 'c' }))).toBe('Claim Confirmation Viewed');
  });
});

describe('#1007 Claim Submitted', () => {
  it('is emitted when the claim is submitted, before the request is sent', () => {
    const page = source(CLAIM_PAGE);
    const submitted = page.indexOf('analytics.claimSubmitted(');
    const request = page.indexOf('await submitClaimWithRetry(');

    expect(submitted).toBeGreaterThan(-1);
    expect(submitted).toBeLessThan(request);
  });

  it('is emitted after the in-flight guard, so a blocked duplicate does not count', () => {
    const page = source(CLAIM_PAGE);

    expect(page.indexOf('analytics.claimSubmitted(')).toBeGreaterThan(page.indexOf('submissionInFlight.current = true'));
  });

  it('uses the spec event name', () => {
    expect(eventNameOf(() => analytics.claimSubmitted({ claimId: 'c' }))).toBe('Claim Submitted');
  });
});
