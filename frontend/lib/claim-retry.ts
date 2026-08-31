/**
 * claim-retry.ts — Bounded retry with backoff and status-polling fallback
 * for the claim redemption flow.
 *
 * Problem: Under Stellar network congestion or RPC timeouts, the claim
 * submission may or may not have been received by the server. Naive retry
 * risks double-submitting a sweep (moving funds twice).
 *
 * Solution:
 *  1. Track whether a submission attempt actually left the client.
 *  2. Distinguish "safe to retry" (never left) from "ambiguous" (might have
 *     been received) and "terminal" (confirmed failed / already claimed).
 *  3. For ambiguous outcomes, poll the claim status endpoint rather than
 *     resubmitting blindly.
 *  4. Cap total attempts to prevent infinite loops.
 */

import { BridgeletClient, BridgeletApiError } from '@/lib/create-bridgelet-client';
import { RequestTimeoutError } from '@/lib/fetch-with-timeout';
import type { RedeemClaimResponse } from '@/lib/bridgelet';
import { AccountStatus } from '@/lib/api/types';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Outcome classification for a claim submission attempt.
 *
 * - `success`: The sweep completed (server confirmed).
 * - `alreadyClaimed`: Server says token is already claimed (409). Not an error.
 * - `safeToRetry`: The request never left the client (network timeout,
 *   DNS failure, abort). It is safe to resubmit.
 * - `ambiguous`: The request may or may not have been received (timeout
 *   after the TCP connect, 5xx on a POST that might have been processed,
 *   sequence-number conflict). Do NOT resubmit; poll status instead.
 * - `terminal`: The server explicitly rejected the request (4xx other than
 *   409). Do not retry; show the user an actionable error.
 */
export type ClaimOutcome =
  | { kind: 'success'; response: RedeemClaimResponse }
  | { kind: 'alreadyClaimed'; response: RedeemClaimResponse }
  | { kind: 'safeToRetry'; cause: Error }
  | { kind: 'ambiguous'; cause: Error }
  | { kind: 'terminal'; error: BridgeletApiError };

export interface ClaimRetryOptions {
  /** Maximum number of total submission attempts (including the first). Default: 3. */
  maxAttempts?: number;
  /** Base delay in ms for exponential backoff. Default: 1000. */
  baseDelayMs?: number;
  /** Maximum delay in ms. Default: 15_000. */
  maxDelayMs?: number;
  /** Max time in ms to spend polling status after an ambiguous submission. Default: 30_000. */
  pollTimeoutMs?: number;
  /** Interval in ms between status polls. Default: 2_000. */
  pollIntervalMs?: number;
}

export interface ClaimSubmissionResult {
  outcome: ClaimOutcome;
  /** Total number of submission attempts made. */
  attempts: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classify an error from `BridgeletClient.redeemClaim` into whether it is
 * safe to retry, ambiguous, or terminal.
 *
 * Key invariant: if we KNOW the server never received the request, it is
 * safe to retry. If we are unsure, it is ambiguous. If the server explicitly
 * responded with a non-retryable error, it is terminal.
 */
function classifyError(err: unknown): ClaimOutcome {
  // Network-level failures where the request definitely didn't reach the server.
  if (err instanceof RequestTimeoutError) {
    // RequestTimeoutError is thrown by fetchWithTimeout when the abort fires
    // BEFORE a response is received. The request may or may not have been
    // received by the server depending on where the timeout hit.
    //
    // Conservative approach: treat as ambiguous because under congestion
    // the request might have been received but the response was slow.
    return { kind: 'ambiguous', cause: err };
  }

  if (err instanceof TypeError) {
    // TypeError from fetch means the request failed at the network level
    // (DNS resolution, connection refused, CORS). The request definitely
    // did not reach the server.
    return { kind: 'safeToRetry', cause: err };
  }

  if (err instanceof BridgeletApiError) {
    // 409 = already claimed — not an error, just means it succeeded previously.
    if (err.statusCode === 409) {
      // We handle this as a synthetic "already claimed" in the caller,
      // but here we treat it as terminal (no retry needed).
      return { kind: 'terminal', error: err };
    }

    // 4xx (except 409) = the server understood and rejected the request.
    // Do not retry.
    if (err.statusCode >= 400 && err.statusCode < 500) {
      return { kind: 'terminal', error: err };
    }

    // 5xx = server error. The request might have been processed (e.g. the
    // server started the sweep but crashed before responding). Ambiguous.
    if (err.statusCode >= 500) {
      return { kind: 'ambiguous', cause: err };
    }
  }

  // Unknown error — treat as ambiguous to be safe.
  return { kind: 'ambiguous', cause: err instanceof Error ? err : new Error(String(err))};
}

/**
 * Exponential backoff delay with jitter.
 */
function backoffDelay(attempt: number, baseMs: number, maxMs: number): number {
  const delay = Math.min(baseMs * Math.pow(2, attempt), maxMs);
  const jitter = Math.random() * delay * 0.3; // up to 30% jitter
  return delay + jitter;
}

/**
 * Attempt a single claim submission and classify the outcome.
 */
async function attemptSubmission(
  client: BridgeletClient,
  token: string,
  destinationAddress: string,
): Promise<ClaimOutcome> {
  try {
    const response = await client.redeemClaim(token, destinationAddress);

    if (response.success) {
      return { kind: 'success', response };
    }

    // If the server returned success=false but the response indicates
    // the token was already claimed (e.g. via txHash being present),
    // treat as already claimed.
    if (response.txHash) {
      return { kind: 'alreadyClaimed', response };
    }

    // Explicit failure from the server — terminal.
    return {
      kind: 'terminal',
      error: new BridgeletApiError(
        { error: response.error ?? 'SWEEP_FAILED', message: response.message ?? 'The transfer could not be completed.' },
        400,
      ),
    };
  } catch (err) {
    return classifyError(err);
  }
}

// ─── Status polling ───────────────────────────────────────────────────────────

/**
 * Poll the claim status endpoint to resolve an ambiguous submission.
 *
 * Returns the polled account status. We stop polling when:
 *  - The status is CLAIMED or PARTIAL_SWEEP (success — the sweep went through).
 *  - The status is FAILED (terminal — the sweep was rejected).
 *  - The status is EXPIRED (terminal — too late).
 *  - The poll timeout is reached.
 */
export async function pollClaimStatus(
  client: BridgeletClient,
  token: string,
  options: Pick<ClaimRetryOptions, 'pollTimeoutMs' | 'pollIntervalMs'> = {},
): Promise<{ status: AccountStatus; view: unknown }> {
  const pollTimeoutMs = options.pollTimeoutMs ?? 30_000;
  const pollIntervalMs = options.pollIntervalMs ?? 2_000;
  const deadline = Date.now() + pollTimeoutMs;

  while (Date.now() < deadline) {
    try {
      const view = await client.verifyClaim(token);

      // Determine status from the view
      let status: AccountStatus;

      // The verifyClaim response may contain a status field or may throw
      // specific status codes that we map to account statuses.
      // Since verifyClaim returns a ClaimView, we check for the status field.
      if (view && typeof view === 'object' && 'status' in view) {
        status = (view as { status: AccountStatus }).status;
      } else {
        // If no explicit status, assume still processing
        status = AccountStatus.CLAIMING;
      }

      // Terminal statuses — stop polling
      if (
        status === AccountStatus.CLAIMED ||
        status === AccountStatus.PARTIAL_SWEEP ||
        status === AccountStatus.FAILED ||
        status === AccountStatus.EXPIRED
      ) {
        return { status, view };
      }

      // Still processing — keep polling
    } catch {
      // If verifyClaim fails, we can't determine status — keep trying
      // until timeout.
    }

    await sleep(pollIntervalMs);
  }

  // Poll timeout reached — return the last known state as CLAIMING
  return { status: AccountStatus.CLAIMING, view: null };
}

// ─── Main retry orchestrator ──────────────────────────────────────────────────

/**
 * Submit a claim with bounded retry and backoff, with double-submit prevention.
 *
 * Behavior:
 *  1. Attempt the submission.
 *  2. If it succeeds or the token is already claimed, return immediately.
 *  3. If the failure is "safe to retry" (request never left client), retry
 *     after backoff.
 *  4. If the failure is "ambiguous" (request may have been received), poll
 *     the claim status endpoint instead of resubmitting.
 *  5. If the failure is "terminal" (explicit rejection), return the error.
 *  6. After exhausting retries on safe-to-retry errors, fall through to
 *     status polling.
 *
 * This function NEVER double-submits a sweep. Once a submission is
 * ambiguous, it polls rather than resubmitting.
 */
export async function submitClaimWithRetry(
  client: BridgeletClient,
  token: string,
  destinationAddress: string,
  options: ClaimRetryOptions = {},
): Promise<ClaimSubmissionResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 15_000;

  let attempts = 0;
  let lastOutcome: ClaimOutcome | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    attempts++;

    const outcome = await attemptSubmission(client, token, destinationAddress);
    lastOutcome = outcome;

    // Success or already-claimed — done.
    if (outcome.kind === 'success' || outcome.kind === 'alreadyClaimed') {
      return { outcome, attempts };
    }

    // Terminal — do not retry.
    if (outcome.kind === 'terminal') {
      return { outcome, attempts };
    }

    // Safe to retry — back off and try again.
    if (outcome.kind === 'safeToRetry' && attempt < maxAttempts - 1) {
      const delay = backoffDelay(attempt, baseDelayMs, maxDelayMs);
      await sleep(delay);
      continue;
    }

    // Ambiguous — do NOT resubmit. Poll status instead.
    if (outcome.kind === 'ambiguous') {
      const pollResult = await pollClaimStatus(client, token, options);

      if (pollResult.status === AccountStatus.CLAIMED || pollResult.status === AccountStatus.PARTIAL_SWEEP) {
        // The sweep went through despite the ambiguous response.
        return {
          outcome: { kind: 'success', response: { success: true, amountSwept: '0', asset: 'XLM', destination: destinationAddress } },
          attempts,
        };
      }

      if (pollResult.status === AccountStatus.FAILED || pollResult.status === AccountStatus.EXPIRED) {
        return {
          outcome: {
            kind: 'terminal',
            error: new BridgeletApiError(
              { error: 'SWEEP_FAILED', message: 'The transfer could not be completed. Please try again or contact support.' },
              400,
            ),
          },
          attempts,
        };
      }

      // Still processing or timed out — return the ambiguous outcome.
      return { outcome, attempts };
    }

    // Safe to retry but exhausted all attempts — fall through to ambiguous handling.
    if (outcome.kind === 'safeToRetry') {
      // All retries exhausted on what was "safe" — now it becomes ambiguous.
      const pollResult = await pollClaimStatus(client, token, options);

      if (pollResult.status === AccountStatus.CLAIMED || pollResult.status === AccountStatus.PARTIAL_SWEEP) {
        return {
          outcome: { kind: 'success', response: { success: true, amountSwept: '0', asset: 'XLM', destination: destinationAddress } },
          attempts,
        };
      }

      return { outcome: { kind: 'ambiguous', cause: outcome.cause }, attempts };
    }
  }

  // Should never reach here, but safety net.
  return {
    outcome: lastOutcome ?? { kind: 'terminal', error: new BridgeletApiError({ error: 'UNKNOWN', message: 'Unexpected state.' }, 500) },
    attempts,
  };
}
