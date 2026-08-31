'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ClaimStatusCard } from '@/components/claim-status-card';
import { AccountStatus } from '@/lib/api/types';
import { BridgeletClient } from '@/lib/api/client';
import { ClaimView, loadClaimView, markTokenClaimed } from '@/lib/claim-view';
import { submitClaimWithRetry, pollClaimStatus } from '@/lib/claim-retry';
import { ClaimError } from '@/lib/claim-errors';

interface ClaimPageClientProps {
  token: string;
  supportEmail: string;
  initialView?: ClaimView;
}

const client = new BridgeletClient();

export function ClaimPageClient({ token, supportEmail, initialView }: ClaimPageClientProps) {
  const [view, setView] = useState<ClaimView | null>(initialView ?? null);
  const [loadError, setLoadError] = useState(false);
  // Track whether a submission is currently in-flight or being polled.
  const submissionInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadClaimView(token)
      .then((result) => {
        if (!cancelled) setView(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  /**
   * Submit the claim with bounded retry and double-submit prevention.
   *
   * On success: updates the view to CLAIMED/PARTIAL_SWEEP.
   * On ambiguous failure: polls status instead of resubmitting.
   * On retryable failure: throws a ClaimError with retryable=true so the
   *   UI can offer a "Try again" button.
   * On terminal failure: throws a ClaimError with retryable=false.
   */
  const handleClaim = useCallback(
    async (destinationAddress: string) => {
      if (submissionInFlight.current) {
        // Guard: prevent concurrent submissions for the same token.
        throw new ClaimError("NETWORK_ERROR", "A claim is already being processed. Please wait.");
      }
      submissionInFlight.current = true;

      try {
        const result = await submitClaimWithRetry(client, token, destinationAddress, {
          maxAttempts: 3,
          baseDelayMs: 1000,
          maxDelayMs: 15_000,
          pollTimeoutMs: 30_000,
          pollIntervalMs: 2_000,
        });

        switch (result.outcome.kind) {
          case "success": {
            // Sweep confirmed -- update view.
            markTokenClaimed(token);
            const resp = result.outcome.response;
            setView((prev) => ({
              ...(prev ?? { status: AccountStatus.CLAIMED }),
              status: resp.isPartial ? AccountStatus.PARTIAL_SWEEP : AccountStatus.CLAIMED,
              sweepNote: resp.message,
              claimedByMe: true,
              sweepDestination: destinationAddress,
              sweepAmountStroops: prev?.amountStroops,
            }));
            return;
          }

          case "alreadyClaimed": {
            // Token was already claimed (possibly by this session earlier).
            markTokenClaimed(token);
            setView((prev) => ({
              ...(prev ?? { status: AccountStatus.CLAIMED }),
              status: AccountStatus.CLAIMED,
              claimedByMe: true,
              sweepDestination: destinationAddress,
            }));
            return;
          }

          case "safeToRetry": {
            // The request never reached the server. Safe to retry.
            throw new ClaimError(
              "SUBMISSION_FAILED_RETRYABLE",
              "Your claim could not be sent right now. Please try again -- this is safe and will not cause any problems.",
              true,
            );
          }

          case "ambiguous": {
            // Submission may or may not have been received. We already polled
            // inside submitClaimWithRetry. If we are still here, the poll
            // timed out or the status is still processing.
            //
            // Kick off a background poll and update the view when it resolves.
            startBackgroundPoll(destinationAddress);
            throw new ClaimError(
              "SUBMISSION_TIMEOUT",
              "Your claim is taking longer than expected due to network congestion. We are checking on it -- please wait a moment.",
              false,
            );
          }

          case "terminal": {
            // Explicit rejection -- do not retry.
            const apiErr = result.outcome.error;
            throw new ClaimError(
              "SUBMISSION_FAILED_FINAL",
              apiErr?.message ?? "Something went wrong after several attempts. Your funds are safe, but we need our team to look into this.",
              false,
            );
          }
        }
      } finally {
        submissionInFlight.current = false;
      }
    },
    [token],
  );

  /**
   * Background poll: after an ambiguous submission, periodically check
   * the claim status and update the view when it resolves.
   */
  const startBackgroundPoll = useCallback(
    (destinationAddress: string) => {
      let cancelled = false;

      async function poll() {
        const deadline = Date.now() + 60_000; // max 60s total poll
        while (!cancelled && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 3_000));
          if (cancelled) return;

          try {
            const pollResult = await pollClaimStatus(client, token, {
              pollTimeoutMs: 5_000,
              pollIntervalMs: 2_000,
            });

            if (cancelled) return;

            if (
              pollResult.status === AccountStatus.CLAIMED ||
              pollResult.status === AccountStatus.PARTIAL_SWEEP
            ) {
              markTokenClaimed(token);
              setView((prev) => ({
                ...(prev ?? { status: AccountStatus.CLAIMED }),
                status: pollResult.status,
                claimedByMe: true,
                sweepDestination: destinationAddress,
                sweepAmountStroops: prev?.amountStroops,
              }));
              return;
            }

            if (
              pollResult.status === AccountStatus.FAILED ||
              pollResult.status === AccountStatus.EXPIRED
            ) {
              setView((prev) => ({
                ...(prev ?? { status: AccountStatus.FAILED }),
                status: pollResult.status,
              }));
              return;
            }
          } catch {
            // Keep polling on errors.
          }
        }
      }

      poll();

      return () => {
        cancelled = true;
      };
    },
    [token],
  );

  if (loadError) {
    return (
      <div
        role="alert"
        className="flex min-h-[80px] items-center rounded-lg border border-red-200 bg-red-50 px-4 py-4"
      >
        <p className="text-sm font-medium text-red-800">
          We could not load this claim right now. Please refresh the page.
        </p>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="flex min-h-[80px] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-sm text-slate-600">Loading claim details...</p>
      </div>
    );
  }

  return (
    <ClaimStatusCard
      status={view.status}
      amountStroops={view.amountStroops}
      assetCode={view.assetCode}
      expiresAt={view.expiresAt}
      sweepNote={view.sweepNote}
      supportEmail={supportEmail}
      onClaim={handleClaim}
      claimedByMe={view.claimedByMe}
      sweepDestination={view.sweepDestination}
      sweepAmountStroops={view.sweepAmountStroops}
    />
  );
}
