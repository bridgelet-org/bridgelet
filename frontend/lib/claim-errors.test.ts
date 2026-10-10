import { describe, expect, it } from 'vitest';
import {
  ClaimError,
  claimErrorCodeFromApiCode,
  getClaimErrorMessage,
  toClaimError,
} from '@/lib/claim-errors';

describe('claim error messages', () => {
  it('tells the user to fund an unfunded destination', () => {
    expect(getClaimErrorMessage('DESTINATION_NOT_FUNDED')).toBe(
      'Fund this wallet with at least 1 XLM first.',
    );
  });

  it('reassures the user when the sweep contract fails', () => {
    expect(getClaimErrorMessage('SWEEP_CONTRACT_FAILED')).toBe(
      'The claim could not be completed. Your funds are safe; contact support.',
    );
  });

  it('shows a rate-limit message for 429', () => {
    expect(getClaimErrorMessage('RATE_LIMITED')).toBe('Too many attempts, wait a minute.');
  });

  it('keeps the existing generic messages', () => {
    expect(getClaimErrorMessage('TOKEN_NOT_FOUND')).toBe(
      'This claim link is invalid or no longer exists.',
    );
    expect(getClaimErrorMessage('ALREADY_CLAIMED')).toBe('This payment has already been claimed.');
    expect(getClaimErrorMessage('EXPIRED')).toBe(
      'This claim link has expired. Contact the sender for a new one.',
    );
  });
});

describe('claimErrorCodeFromApiCode', () => {
  it.each([
    ['DESTINATION_NOT_FUNDED', 'DESTINATION_NOT_FUNDED'],
    ['SWEEP_CONTRACT_FAILED', 'SWEEP_CONTRACT_FAILED'],
    ['INVALID_ADDRESS', 'INVALID_ADDRESS'],
    ['ALREADY_CLAIMED', 'ALREADY_CLAIMED'],
    ['TOKEN_NOT_FOUND', 'TOKEN_NOT_FOUND'],
    ['EXPIRED', 'EXPIRED'],
  ] as const)('maps %s to %s', (apiCode, expected) => {
    expect(claimErrorCodeFromApiCode(apiCode)).toBe(expected);
  });

  it('returns undefined for unknown or missing codes', () => {
    expect(claimErrorCodeFromApiCode('SOMETHING_ELSE')).toBeUndefined();
    expect(claimErrorCodeFromApiCode(undefined)).toBeUndefined();
  });
});

describe('toClaimError', () => {
  it('prefers a specific backend code over the generic status message', () => {
    const err = toClaimError(400, 'DESTINATION_NOT_FUNDED');
    expect(err).toBeInstanceOf(ClaimError);
    expect(err.code).toBe('DESTINATION_NOT_FUNDED');
    expect(err.message).toBe('Fund this wallet with at least 1 XLM first.');
  });

  it('maps a 429 to a retryable rate-limit error', () => {
    const err = toClaimError(429);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.message).toBe('Too many attempts, wait a minute.');
    expect(err.retryable).toBe(true);
  });

  it('falls back to status-based codes', () => {
    expect(toClaimError(404).code).toBe('TOKEN_NOT_FOUND');
    expect(toClaimError(409).code).toBe('ALREADY_CLAIMED');
    expect(toClaimError(410).code).toBe('EXPIRED');
    expect(toClaimError(500)).toBeInstanceOf(ClaimError);
    expect(toClaimError(500).code).toBe('NETWORK_ERROR');
  });
});
