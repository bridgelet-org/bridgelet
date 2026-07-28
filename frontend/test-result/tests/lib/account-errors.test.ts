import { describe, it, expect, vi } from 'vitest';
import {
  classifyAccountCreationError,
  AccountCreationErrorCode,
  type AccountCreationErrorInfo,
} from '../../../lib/account-errors';
import { BridgeletApiError, RateLimitError } from '../../../lib/create-bridgelet-client';
import { RequestTimeoutError } from '../../../lib/fetch-with-timeout';

function makeApiError(
  body: unknown,
  statusCode: number,
): BridgeletApiError {
  return new BridgeletApiError(body, statusCode);
}

describe('classifyAccountCreationError', () => {
  it('classifies RequestTimeoutError as NETWORK_FAILURE', () => {
    const err = new RequestTimeoutError();
    const info = classifyAccountCreationError(err);
    expect(info.code).toBe(AccountCreationErrorCode.NETWORK_FAILURE);
    expect(info.retryable).toBe(true);
  });

  it('classifies TypeError as NETWORK_FAILURE', () => {
    const err = new TypeError('fetch failed');
    const info = classifyAccountCreationError(err);
    expect(info.code).toBe(AccountCreationErrorCode.NETWORK_FAILURE);
    expect(info.retryable).toBe(true);
  });

  it('classifies RateLimitError', () => {
    const err = new RateLimitError(5);
    const info = classifyAccountCreationError(err);
    expect(info.code).toBe(AccountCreationErrorCode.RATE_LIMITED);
    expect(info.retryable).toBe(true);
  });

  it('maps 402 with INSUFFICIENT_BALANCE code', () => {
    const err = makeApiError({ error: { code: 'INSUFFICIENT_BALANCE', message: 'No funds' } }, 402);
    const info = classifyAccountCreationError(err);
    expect(info.code).toBe(AccountCreationErrorCode.INSUFFICIENT_FUNDS);
    expect(info.retryable).toBe(false);
  });

  it('maps 402 without error code to INSUFFICIENT_FUNDS via status', () => {
    const err = makeApiError({ error: { message: 'No funds' } }, 402);
    const info = classifyAccountCreationError(err);
    expect(info.code).toBe(AccountCreationErrorCode.INSUFFICIENT_FUNDS);
    expect(info.retryable).toBe(false);
  });

  it('maps flat error string INSUFFICIENT_BALANCE', () => {
    const err = makeApiError({ error: 'INSUFFICIENT_BALANCE', message: 'No funds' }, 402);
    const info = classifyAccountCreationError(err);
    expect(info.code).toBe(AccountCreationErrorCode.INSUFFICIENT_FUNDS);
    expect(info.retryable).toBe(false);
  });

  it('maps STELLAR error code', () => {
    const err = makeApiError({ error: { code: 'STELLAR_ERROR', message: 'tx failed' } }, 500);
    const info = classifyAccountCreationError(err);
    expect(info.code).toBe(AccountCreationErrorCode.STELLAR_CREATION_FAILURE);
    expect(info.retryable).toBe(true);
  });

  it('maps NETWORK_ERROR code', () => {
    const err = makeApiError({ error: { code: 'NETWORK_ERROR', message: 'no network' } }, 503);
    const info = classifyAccountCreationError(err);
    expect(info.code).toBe(AccountCreationErrorCode.NETWORK_FAILURE);
    expect(info.retryable).toBe(true);
  });

  it('maps 429 to RATE_LIMITED', () => {
    const err = makeApiError({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'slow down' } }, 429);
    const info = classifyAccountCreationError(err);
    expect(info.code).toBe(AccountCreationErrorCode.RATE_LIMITED);
    expect(info.retryable).toBe(true);
  });

  it('maps 401 to UNAUTHORIZED', () => {
    const err = makeApiError({ message: 'not authorized' }, 401);
    const info = classifyAccountCreationError(err);
    expect(info.code).toBe(AccountCreationErrorCode.UNAUTHORIZED);
    expect(info.retryable).toBe(false);
  });

  it('maps 400 to INVALID_REQUEST', () => {
    const err = makeApiError({ message: 'bad input' }, 400);
    const info = classifyAccountCreationError(err);
    expect(info.code).toBe(AccountCreationErrorCode.INVALID_REQUEST);
    expect(info.retryable).toBe(false);
  });

  it('maps 500+ to SERVER_ERROR', () => {
    const err = makeApiError({ message: 'internal boom' }, 500);
    const info = classifyAccountCreationError(err);
    expect(info.code).toBe(AccountCreationErrorCode.SERVER_ERROR);
    expect(info.retryable).toBe(true);
  });

  it('returns UNKNOWN_ERROR for generic Error', () => {
    const err = new Error('something weird');
    const info = classifyAccountCreationError(err);
    expect(info.code).toBe(AccountCreationErrorCode.UNKNOWN_ERROR);
    expect(info.retryable).toBe(true);
  });

  it('returns UNKNOWN_ERROR for unknown input', () => {
    const info = classifyAccountCreationError(null);
    expect(info.code).toBe(AccountCreationErrorCode.UNKNOWN_ERROR);
    expect(info.retryable).toBe(true);
  });
});
