import { beforeEach, describe, expect, it } from 'vitest';
import { getRememberedClaimLinks, rememberClaimLink } from './claim-links';

describe('local claim link recovery', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns an empty map when nothing has been saved', () => {
    expect(getRememberedClaimLinks()).toEqual({});
  });

  it('remembers a claim link by account id', () => {
    rememberClaimLink('account-1', 'https://app.example/claim/token-1');

    expect(getRememberedClaimLinks()).toEqual({
      'account-1': 'https://app.example/claim/token-1',
    });
  });

  it('overwrites an existing link for the same account', () => {
    rememberClaimLink('account-1', 'https://app.example/claim/old');
    rememberClaimLink('account-1', 'https://app.example/claim/new');

    expect(getRememberedClaimLinks()).toEqual({
      'account-1': 'https://app.example/claim/new',
    });
  });

  it('ignores blank account ids and links', () => {
    rememberClaimLink('', 'https://app.example/claim/token');
    rememberClaimLink('account-1', '   ');

    expect(getRememberedClaimLinks()).toEqual({});
  });

  it('recovers from malformed storage data', () => {
    window.localStorage.setItem('bridgelet_claim_links', '{not-json');

    expect(getRememberedClaimLinks()).toEqual({});
  });

  it('skips malformed entries while keeping valid ones', () => {
    window.localStorage.setItem(
      'bridgelet_claim_links',
      JSON.stringify({
        valid: { claimUrl: 'https://app.example/claim/valid', savedAt: '2026-11-04T00:00:00Z' },
        noUrl: { savedAt: '2026-11-04T00:00:00Z' },
        wrongType: { claimUrl: 42, savedAt: '2026-11-04T00:00:00Z' },
        notAnObject: 'nope',
      }),
    );

    expect(getRememberedClaimLinks()).toEqual({
      valid: 'https://app.example/claim/valid',
    });
  });
});
