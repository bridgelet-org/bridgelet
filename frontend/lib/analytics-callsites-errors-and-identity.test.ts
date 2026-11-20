import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analytics, getAnonymousId } from '@/lib/analytics';

const source = (relativePath: string) => readFileSync(resolve(__dirname, '..', relativePath), 'utf8');

const CLAIM_CARD = 'components/claim-status-card.tsx';
const CLAIM_PAGE = 'app/claim/[token]/claim-page-client.tsx';
const CONNECT_STEP = 'components/send-form/steps/connect-step.tsx';
const GLOBAL_ERROR = 'app/global-error.tsx';

type Plausible = ReturnType<typeof vi.fn>;

function install(): Plausible {
  const plausible = vi.fn();
  (window as unknown as { plausible?: unknown }).plausible = plausible;
  return plausible;
}

const propsOf = (plausible: Plausible, call = 0) =>
  (plausible.mock.calls[call]![1] as { props: Record<string, unknown> }).props;

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as unknown as { plausible?: unknown }).plausible;
});

describe('#1015 base payload anonymous_id', () => {
  it('is present on every event and is the persisted browser id', () => {
    const plausible = install();

    analytics.sendFormViewed();
    analytics.pageViewed({ page: 'home' });

    const stored = window.localStorage.getItem('bridgelet_anonymous_id');
    expect(stored).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(propsOf(plausible, 0).anonymous_id).toBe(stored);
    expect(propsOf(plausible, 1).anonymous_id).toBe(stored);
  });

  it('is stable across events and equals getAnonymousId()', () => {
    const plausible = install();

    const first = getAnonymousId();
    analytics.sendFormViewed();
    analytics.sendFormViewed();

    expect(propsOf(plausible, 0).anonymous_id).toBe(first);
    expect(propsOf(plausible, 1).anonymous_id).toBe(first);
  });

  it('reuses an id that is already stored instead of minting a new one', () => {
    window.localStorage.setItem('bridgelet_anonymous_id', 'existing-id');
    const plausible = install();

    analytics.sendFormViewed();

    expect(propsOf(plausible).anonymous_id).toBe('existing-id');
  });

  it('cannot be overridden or blanked by a call site', () => {
    const plausible = install();

    analytics.errorDisplayed({ journey: 'shared', errorType: 'unknown', sourceScreen: 'x' });

    expect(propsOf(plausible).anonymous_id).toEqual(expect.any(String));
    expect(propsOf(plausible).anonymous_id).not.toBe('');
  });

  it('is not minted for a visitor who asked not to be tracked', () => {
    vi.stubGlobal('navigator', { userAgent: 'test', doNotTrack: '1' });
    const plausible = install();

    analytics.sendFormViewed();

    expect(plausible).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('bridgelet_anonymous_id')).toBeNull();
  });
});

describe('#1014 Retry Clicked', () => {
  it('is emitted when the recipient re-submits after seeing an error', () => {
    const card = source(CLAIM_CARD);
    const retry = card.indexOf('analytics.retryClicked(');
    const guard = card.lastIndexOf('if (claimError)', retry);

    expect(retry).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(card.indexOf('async function handleClaim()'));
    expect(card.slice(guard, retry)).not.toContain('}');
  });

  it('sends the spec event with the journey, error type and attempt number', () => {
    const plausible = install();

    analytics.retryClicked({ journey: 'recipient', claimId: 'tok', errorType: 'unknown', attemptNumber: 2 });

    expect(plausible.mock.calls[0]![0]).toBe('Retry Clicked');
    expect(propsOf(plausible)).toEqual(
      expect.objectContaining({ journey: 'recipient', claim_id: 'tok', error_type: 'unknown', attempt_number: 2 }),
    );
  });

  it('omits the claim id when there is none', () => {
    const plausible = install();

    analytics.retryClicked({ journey: 'sender', claimId: null, errorType: 'unknown', attemptNumber: 1 });

    expect(propsOf(plausible)).not.toHaveProperty('claim_id');
  });
});

describe('#1013 Error Displayed', () => {
  it.each([
    [CLAIM_PAGE, 'the claim page'],
    [CLAIM_CARD, 'the claim card'],
    [CONNECT_STEP, 'the wallet connect step'],
    [GLOBAL_ERROR, 'the global error boundary'],
  ])('is emitted from %s (%s)', (file) => {
    expect(source(file)).toContain('analytics.errorDisplayed(');
  });

  it('is emitted from the connect step only when the connection attempt fails', () => {
    const step = source(CONNECT_STEP);
    const attempt = step.indexOf('await connectFreighter()');
    const catchBlock = step.indexOf('} catch (err) {', attempt);

    expect(step.indexOf('analytics.errorDisplayed(')).toBeGreaterThan(catchBlock);
  });

  it('sends the spec event with a spec error type, a source screen and the journey', () => {
    const plausible = install();

    analytics.errorDisplayed({
      journey: 'recipient',
      claimId: 'tok',
      errorType: 'expired_token',
      errorCode: 'TOKEN_EXPIRED',
      sourceScreen: 'claim_landing',
    });

    expect(plausible.mock.calls[0]![0]).toBe('Error Displayed');
    expect(propsOf(plausible)).toEqual(
      expect.objectContaining({
        journey: 'recipient',
        claim_id: 'tok',
        error_type: 'expired_token',
        error_code: 'TOKEN_EXPIRED',
        source_screen: 'claim_landing',
      }),
    );
  });

  it('defaults the error code to "unknown"', () => {
    const plausible = install();

    analytics.errorDisplayed({ journey: 'shared', errorType: 'unknown', sourceScreen: 'global_error' });

    expect(propsOf(plausible).error_code).toBe('unknown');
  });
});

describe('#1012 Explorer Link Clicked', () => {
  it('is emitted from the click handler of the explorer link on the claimed panel', () => {
    const card = source(CLAIM_CARD);
    const click = card.indexOf('analytics.explorerLinkClicked(');
    const anchor = card.lastIndexOf('<a', click);

    expect(click).toBeGreaterThan(-1);
    expect(card.slice(anchor, click)).toContain('href={explorerUrl}');
    expect(card.slice(anchor, click)).toContain('onClick');
  });

  it('sends the spec event with the journey, claim id and source screen', () => {
    const plausible = install();

    analytics.explorerLinkClicked({ journey: 'recipient', claimId: 'tok', sourceScreen: 'claim_success' });

    expect(plausible.mock.calls[0]![0]).toBe('Explorer Link Clicked');
    expect(propsOf(plausible)).toEqual(
      expect.objectContaining({ journey: 'recipient', claim_id: 'tok', source_screen: 'claim_success' }),
    );
  });
});
