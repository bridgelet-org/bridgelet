import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { analytics, CLAIM_FAILED_ERROR_TYPES } from '@/lib/analytics';

const source = (relativePath: string) => readFileSync(resolve(__dirname, '..', relativePath), 'utf8');

const CLAIM_CARD = 'components/claim-status-card.tsx';
const CLAIM_PAGE = 'app/claim/[token]/claim-page-client.tsx';

type Plausible = ReturnType<typeof vi.fn>;

function install(): Plausible {
  const plausible = vi.fn();
  (window as unknown as { plausible?: unknown }).plausible = plausible;
  return plausible;
}

const propsOf = (plausible: Plausible, call = 0) =>
  (plausible.mock.calls[call]![1] as { props: Record<string, unknown> }).props;

const occurrences = (text: string, needle: string) => text.split(needle).length - 1;

afterEach(() => {
  delete (window as unknown as { plausible?: unknown }).plausible;
});

describe('#1008 Claim Succeeded', () => {
  it('is emitted in both places where a confirmed sweep is observed, after the token is marked claimed', () => {
    const page = source(CLAIM_PAGE);

    expect(occurrences(page, 'analytics.claimSucceeded(')).toBe(2);
    let from = 0;
    for (let i = 0; i < 2; i++) {
      const succeeded = page.indexOf('analytics.claimSucceeded(', from);
      expect(page.slice(Math.max(0, succeeded - 600), succeeded)).toContain('markTokenClaimed(token)');
      from = succeeded + 1;
    }
  });

  it('reports the sweep duration measured from submission', () => {
    expect(source(CLAIM_PAGE)).toContain('sweepDurationMs: Math.max(0, Date.now() - submittedAtRef.current)');
  });

  it('sends the spec event with the claim id and sweep duration', () => {
    const plausible = install();

    analytics.claimSucceeded({ claimId: 'tok-1008-a', assetType: 'XLM', sweepDurationMs: 1200 });

    expect(plausible.mock.calls[0]![0]).toBe('Claim Succeeded');
    expect(propsOf(plausible)).toEqual(
      expect.objectContaining({ journey: 'recipient', claim_id: 'tok-1008-a', sweep_duration_ms: 1200 }),
    );
  });

  it('is counted once per claim id even if both observation paths fire (§9.4)', () => {
    const plausible = install();

    analytics.claimSucceeded({ claimId: 'tok-1008-b', sweepDurationMs: 10 });
    analytics.claimSucceeded({ claimId: 'tok-1008-b', sweepDurationMs: 20 });
    analytics.claimSucceeded({ claimId: 'tok-1008-c', sweepDurationMs: 30 });

    expect(plausible).toHaveBeenCalledTimes(2);
  });
});

describe('#1009 Claim Failed', () => {
  it('is emitted for a retryable submission failure and for a terminal rejection', () => {
    const page = source(CLAIM_PAGE);

    expect(occurrences(page, 'analytics.claimFailed(')).toBe(2);
    expect(page).toContain("errorType: 'network_error'");
    expect(page).toContain("errorType: 'transaction_failed'");
  });

  it('only uses error types from the §5.3 taxonomy', () => {
    const page = source(CLAIM_PAGE);
    const used = [...page.matchAll(/analytics\.claimFailed\([\s\S]*?errorType: '([a-z_]+)'/g)].map((m) => m[1]);

    expect(used.length).toBe(2);
    for (const type of used) expect(Object.keys(CLAIM_FAILED_ERROR_TYPES)).toContain(type);
  });

  it('reports the attempt number of the failed submission', () => {
    expect(source(CLAIM_PAGE)).toContain('attemptNumber: currentAttempt');
  });

  it('sends the spec event with error code, error type and attempt number', () => {
    const plausible = install();

    analytics.claimFailed({
      claimId: 'tok-1009',
      assetType: 'XLM',
      errorCode: 'SUBMISSION_FAILED_RETRYABLE',
      errorType: 'network_error',
      attemptNumber: 2,
    });

    expect(plausible.mock.calls[0]![0]).toBe('Claim Failed');
    expect(propsOf(plausible)).toEqual(
      expect.objectContaining({
        journey: 'recipient',
        claim_id: 'tok-1009',
        error_code: 'SUBMISSION_FAILED_RETRYABLE',
        error_type: 'network_error',
        attempt_number: 2,
      }),
    );
  });

  it('is not deduplicated: every failed attempt is a real event (§9.4)', () => {
    const plausible = install();

    for (const attemptNumber of [1, 2]) {
      analytics.claimFailed({ claimId: 'tok-1009-b', errorType: 'network_error', attemptNumber });
    }

    expect(plausible).toHaveBeenCalledTimes(2);
  });
});

describe('#1010 Claim Success Viewed', () => {
  it('is emitted when the claimed panel renders the result, only for a claim made by this recipient', () => {
    const card = source(CLAIM_CARD);
    const viewed = card.indexOf('analytics.claimSuccessViewed(');
    const effect = card.lastIndexOf('useEffect(', viewed);

    expect(viewed).toBeGreaterThan(-1);
    expect(card.slice(effect, viewed)).toContain('if (claimedByMe && claimId)');
    expect(card.lastIndexOf('analytics.claimSuccessViewed(')).toBe(viewed);
  });

  it('sends the spec event with the claim id and asset', () => {
    const plausible = install();

    analytics.claimSuccessViewed({ claimId: 'tok-1010', assetType: 'XLM' });

    expect(plausible.mock.calls[0]![0]).toBe('Claim Success Viewed');
    expect(propsOf(plausible)).toEqual(
      expect.objectContaining({ journey: 'recipient', claim_id: 'tok-1010', asset_type: 'XLM' }),
    );
  });
});

describe('#1011 Sender Signup CTA Clicked', () => {
  it('is emitted from the click handler of the signup link on the claim success screen', () => {
    const card = source(CLAIM_CARD);
    const click = card.indexOf('analytics.senderSignupCtaClicked(');
    const anchor = card.lastIndexOf('<a', click);

    expect(click).toBeGreaterThan(-1);
    expect(card.slice(anchor, click)).toContain('href="/send"');
    expect(card.slice(anchor, click)).toContain('onClick');
    expect(card.lastIndexOf('analytics.senderSignupCtaClicked(')).toBe(click);
  });

  it('sends the spec event with the claim id and the success-screen source', () => {
    const plausible = install();

    analytics.senderSignupCtaClicked({ claimId: 'tok-1011' });

    expect(plausible.mock.calls[0]![0]).toBe('Sender Signup CTA Clicked');
    expect(propsOf(plausible)).toEqual(
      expect.objectContaining({ journey: 'recipient', claim_id: 'tok-1011', source: 'claim_success_screen' }),
    );
  });
});
