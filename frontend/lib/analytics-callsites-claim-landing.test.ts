import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { analytics } from '@/lib/analytics';

const source = (relativePath: string) => readFileSync(resolve(__dirname, '..', relativePath), 'utf8');

const CLAIM_CARD = 'components/claim-status-card.tsx';
const CLAIM_PAGE = 'app/claim/[token]/claim-page-client.tsx';

/** The event name and props an emitter sends, captured through the Plausible hook. */
function capture(emit: () => void): { name: string; props: Record<string, unknown> } {
  const plausible = vi.fn();
  (window as unknown as { plausible?: unknown }).plausible = plausible;
  emit();
  const [name, options] = plausible.mock.calls[0]! as [string, { props: Record<string, unknown> }];
  return { name, props: options.props };
}

afterEach(() => {
  delete (window as unknown as { plausible?: unknown }).plausible;
});

describe('#1000 Claim Page Opened', () => {
  it('is emitted as the first action of the claim page effect, before token verification', () => {
    const page = source(CLAIM_PAGE);
    const opened = page.indexOf('analytics.claimPageOpened(');
    const verification = page.indexOf('loadClaimView(token)');

    expect(opened).toBeGreaterThan(-1);
    expect(opened).toBeLessThan(verification);
  });

  it('sends the recipient journey, claim id and entry channel', () => {
    const { name, props } = capture(() => analytics.claimPageOpened({ claimId: 'tok', entryChannel: 'sms' }));

    expect(name).toBe('Claim Page Opened');
    expect(props).toEqual(
      expect.objectContaining({ journey: 'recipient', claim_id: 'tok', entry_channel: 'sms' }),
    );
  });
});

describe('#1001 Claim Verified', () => {
  it('is emitted only for a claimable (pending_claim) account', () => {
    const page = source(CLAIM_PAGE);
    const verified = page.indexOf('analytics.claimVerified(');
    const branch = page.lastIndexOf('AccountStatus.PENDING_CLAIM', verified);

    expect(verified).toBeGreaterThan(-1);
    expect(branch).toBeGreaterThan(-1);
    expect(page.slice(branch, verified)).not.toContain('else if');
  });

  it('sends the claim id, asset, remaining days and verification time', () => {
    const { name, props } = capture(() =>
      analytics.claimVerified({ claimId: 'tok', assetType: 'XLM', expiryDaysRemaining: 3, verificationTimeMs: 120 }),
    );

    expect(name).toBe('Claim Verified');
    expect(props).toEqual(expect.objectContaining({ journey: 'recipient', claim_id: 'tok' }));
    expect(Object.values(props)).toContain(120);
  });
});

describe('#1002 Claim CTA Clicked', () => {
  it('is emitted at the start of the claim handler, before the in-flight guard', () => {
    const page = source(CLAIM_PAGE);
    const handler = page.indexOf('async (destinationAddress: string)');
    const cta = page.indexOf('analytics.claimCtaClicked(', handler);
    const guard = page.indexOf('if (submissionInFlight.current)', handler);

    expect(cta).toBeGreaterThan(handler);
    expect(cta).toBeLessThan(guard);
  });

  it('uses the spec event name and the recipient journey', () => {
    const { name, props } = capture(() => analytics.claimCtaClicked({ claimId: 'tok', assetType: 'XLM' }));

    expect(name).toBe('Claim CTA Clicked');
    expect(props).toEqual(expect.objectContaining({ journey: 'recipient', claim_id: 'tok' }));
  });
});

describe('#1003 Wallet Address Screen Viewed', () => {
  it('is emitted once when the address panel mounts', () => {
    const card = source(CLAIM_CARD);
    const viewed = card.indexOf('analytics.walletAddressScreenViewed(');
    const effect = card.lastIndexOf('useEffect(', viewed);

    expect(viewed).toBeGreaterThan(-1);
    expect(card.lastIndexOf('analytics.walletAddressScreenViewed(')).toBe(viewed);
    expect(card.slice(effect, viewed)).toContain('screenViewedRef.current');
  });

  it('reports that no previous address was offered, for the claim being viewed', () => {
    const card = source(CLAIM_CARD);

    expect(card).toContain('analytics.walletAddressScreenViewed({ claimId, hasPreviousAddress: false })');
  });

  it('sends the spec event with the recipient journey and no address', () => {
    const { name, props } = capture(() =>
      analytics.walletAddressScreenViewed({ claimId: 'tok', hasPreviousAddress: false }),
    );

    expect(name).toBe('Wallet Address Screen Viewed');
    expect(props).toEqual(
      expect.objectContaining({ journey: 'recipient', claim_id: 'tok', has_previous_address: false }),
    );
    expect(Object.keys(props)).not.toContain('wallet_address');
  });
});
