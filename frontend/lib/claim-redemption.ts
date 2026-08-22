'use client';

import {
  BridgeletApiError,
  BridgeletClient,
  RateLimitError,
  type RedeemClaimResponse,
} from '@/lib/create-bridgelet-client';
import { RequestTimeoutError } from '@/lib/fetch-with-timeout';
import { AccountStatus } from '@/lib/api/types';

/**
 * Safe claim-redemption orchestration.
 *
 * Claiming moves real funds, so this module is deliberately conservative:
 * a sweep is NEVER re-submitted after an ambiguous failure. Instead the
 * account's on-chain status is polled to decide whether the submission
 * actually landed before offering a retry.
 *
 * The low-level `BridgeletClient.request()` retries transient failures and
 * 5xx responses, which is the right behaviour for idempotent reads but
 * dangerous for a non-idempotent sweep submission. This module therefore
 * performs the redeem call through a client with retries disabled
 * (`maxRetries: 0`) and owns the retry decision itself, based on status.
 */

export type ClaimRedemptionOutcome =
  /** Submission confirmed by the server; funds are being swept. */
  | { kind: 'confirmed'; isPartial: boolean; message?: string }
  /**
   * Submission is known to have landed, but the server hasn't confirmed a
   * terminal state yet. Never retry — poll or direct the user to check
   * their wallet.
   */
  | { kind: 'pending-confirmation'; message: string }
  /**
   * Failure definitely happened *before* any submission (e.g. the request
   * never reached the server, which we verify by polling the claim status
   * and seeing it still `pending_claim`). Retrying is safe.
   */
  | { kind: 'failed-safe-to-retry'; error: string; retryInSeconds?: number }
  /**
   * Either the submission may have landed (ambiguous timeout) and status
   * polling couldn't confirm it, or the server returned a terminal error.
   * Do not retry; direct the user to support / check their wallet.
   */
  | { kind: 'failed-needs-support'; error: string };

export interface ClaimRedemptionOptions {
  /** Base URL for the backend. Defaults to the same env-var driven default. */
  baseUrl?: string;
  /** How many times to poll claim status after an ambiguous failure. */
  maxStatusPolls?: number;
  /** Base polling interval in ms (doubles each poll, capped). */
  pollIntervalMs?: number;
  /** Cap for the exponential polling delay in ms. */
  maxPollDelayMs?: number;
}

const DEFAULT_MAX_STATUS_POLLS = 3;
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_MAX_POLL_DELAY_MS = 8_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll `/claims/verify` until the account leaves `pending_claim`, or we run
 * out of attempts.
 *
 * @returns the observed status if it ever left `pending_claim`; otherwise
 *          `PENDING_CLAIM` (all polls succeeded and consistently showed the
 *          claim was never submitted), or `null` if polling itself failed.
 */
export async function pollClaimStatus(
  client: BridgeletClient,
  claimToken: string,
  options: ClaimRedemptionOptions = {},
): Promise<AccountStatus | null> {
  const maxStatusPolls = options.maxStatusPolls ?? DEFAULT_MAX_STATUS_POLLS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxPollDelayMs = options.maxPollDelayMs ?? DEFAULT_MAX_POLL_DELAY_MS;

  let delay = pollIntervalMs;
  let allPollsSucceeded = true;
  for (let attempt = 0; attempt < maxStatusPolls; attempt++) {
    if (attempt > 0) await sleep(delay);
    try {
      const view = await client.verifyClaim(claimToken);
      // verifyClaim maps responses onto the lifecycle enum; a `pending_claim`
      // status means the sweep definitively did not land.
      const status = view.status;
      if (status !== AccountStatus.PENDING_CLAIM && status !== undefined) {
        return status;
      }
    } catch (err) {
      if (
        err instanceof BridgeletApiError &&
        err.statusCode === 409 // already claimed
      ) {
        return AccountStatus.CLAIMED;
      }
      if (
        err instanceof BridgeletApiError &&
        err.statusCode === 400 // no payment yet
      ) {
        return AccountStatus.PENDING_PAYMENT;
      }
      if (
        err instanceof BridgeletApiError &&
        err.statusCode === 401 // expired
      ) {
        return AccountStatus.EXPIRED;
      }
      // Transient polling failure — keep trying until attempts are exhausted.
      allPollsSucceeded = false;
    }
    delay = Math.min(delay * 2, maxPollDelayMs);
  }
  // If every poll succeeded but the claim is still pending, we definitively
  // know the sweep never landed → safe to retry.
  return allPollsSucceeded ? AccountStatus.PENDING_CLAIM : null;
}

/** True when the error indicates the request never reached the server. */
function isPreSubmissionFailure(err: unknown): boolean {
  // RequestTimeoutError / TypeError mean the fetch itself failed before any
  // response was received — the backend never saw (or at least never started)
  // the sweep. These are safe to retry *as long as* status still reads
  // pending_claim (verified by pollClaimStatus).
  return err instanceof RequestTimeoutError || err instanceof TypeError;
}

/**
 * Submit a claim redemption exactly once, then decide the outcome based on
 * the response and — for ambiguous failures — on a status poll.
 *
 * @returns a classified {@link ClaimRedemptionOutcome}. Callers should treat
 *          `failed-safe-to-retry` as the only retryable outcome.
 */
export async function submitClaimRedemption(
  claimToken: string,
  destinationAddress: string,
  options: ClaimRedemptionOptions = {},
): Promise<ClaimRedemptionOutcome> {
  // Retries disabled at the transport layer: a sweep must never be
  // auto-re-submitted by the generic request() retry loop.
  const client = new BridgeletClient({ baseUrl: options.baseUrl, maxRetries: 0 });
  const trustedClient = new BridgeletClient({ baseUrl: options.baseUrl });

  let response: RedeemClaimResponse;
  try {
    response = await client.redeemClaim(claimToken, destinationAddress);
  } catch (err) {
    // Fast-path for errors that are terminal server-side (no ambiguity).
    if (err instanceof BridgeletApiError) {
      const code = err.statusCode;
      if (code === 409) {
        return {
          kind: 'failed-needs-support',
          error: 'This payment has already been claimed. Check your wallet for the transfer.',
        };
      }
      if (code === 410) {
        return {
          kind: 'failed-needs-support',
          error: 'This claim link has expired. Contact the sender for a new one.',
        };
      }
      if (code === 404) {
        return {
          kind: 'failed-needs-support',
          error: 'This claim link is invalid or no longer exists.',
        };
      }
    }

    if (err instanceof RateLimitError) {
      return {
        kind: 'failed-safe-to-retry',
        error: err.message,
        retryInSeconds: err.retryAfter ?? undefined,
      };
    }

    if (isPreSubmissionFailure(err)) {
      // Ambiguous: the fetch failed, but a late server-side commit is
      // possible. Poll status to decide whether the sweep actually landed.
      const status = await pollClaimStatus(trustedClient, claimToken, options);
      if (status === null) {
        // Polling itself failed repeatedly — we cannot rule out that the
        // sweep landed. Never auto-retry.
        return {
          kind: 'failed-needs-support',
          error:
            'We could not confirm whether your claim was submitted. Check your wallet before trying again, and contact support if the funds do not appear.',
        };
      }
      if (
        status === AccountStatus.CLAIMED ||
        status === AccountStatus.PARTIAL_SWEEP ||
        status === AccountStatus.CLAIMING ||
        status === AccountStatus.PENDING_PAYMENT
      ) {
        // The claim is (or is about to be) processing — the sweep landed.
        return {
          kind: 'pending-confirmation',
          message:
            status === AccountStatus.CLAIMING
              ? 'Your claim is being processed on the Stellar network.'
              : 'Your claim was received — check your wallet for the incoming transfer.',
        };
      }
      // Still pending_claim (or equivalent pre-submission state): the sweep
      // definitively did not land, so retrying is safe.
      return {
        kind: 'failed-safe-to-retry',
        error:
          err instanceof Error ? err.message : 'The request timed out. Please try again.',
      };
    }

    return {
      kind: 'failed-needs-support',
      error:
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please contact support.',
    };
  }

  // Explicit server acknowledgement — the sweep is in flight. Do not retry.
  return {
    kind: 'confirmed',
    isPartial: response.isPartial ?? false,
    message: response.message,
  };
}