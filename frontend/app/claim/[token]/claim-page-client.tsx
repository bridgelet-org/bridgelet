'use client';

import { useEffect, useState } from 'react';
import { ClaimStatusCard, type ClaimRedemptionStatus } from '@/components/claim-status-card';
import { AccountStatus } from '@/lib/api/types';
import { ClaimView, loadClaimView, toStroops } from '@/lib/claim-view';
import { submitClaimRedemption } from '@/lib/claim-redemption';

interface ClaimPageClientProps {
  token: string;
  supportEmail: string;
  initialView?: ClaimView;
}

export function ClaimPageClient({ token, supportEmail, initialView }: ClaimPageClientProps) {
  const [view, setView] = useState<ClaimView | null>(initialView ?? null);
  const [loadError, setLoadError] = useState(false);
  const [redemptionStatus, setRedemptionStatus] = useState<ClaimRedemptionStatus>('idle');
  const [redemptionError, setRedemptionError] = useState<string | null>(null);
  const [redemptionRetryAfter, setRedemptionRetryAfter] = useState<number | null | undefined>(undefined);

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

  async function handleClaim(destinationAddress: string) {
    setRedemptionStatus('submitting');
    setRedemptionError(null);

    const outcome = await submitClaimRedemption(token, destinationAddress);

    switch (outcome.kind) {
      case 'confirmed': {
        setRedemptionStatus('confirmed');
        setView((prev) => ({
          ...(prev ?? { status: AccountStatus.CLAIMED }),
          status: outcome.isPartial ? AccountStatus.PARTIAL_SWEEP : AccountStatus.CLAIMED,
          sweepNote: outcome.message,
        }));
        return;
      }
      case 'pending-confirmation': {
        setRedemptionStatus('pending-confirmation');
        setRedemptionError(outcome.message);
        return;
      }
      case 'failed-safe-to-retry': {
        setRedemptionStatus('failed-safe-to-retry');
        setRedemptionError(outcome.error);
        setRedemptionRetryAfter(outcome.retryInSeconds);
        return;
      }
      case 'failed-needs-support': {
        setRedemptionStatus('failed-needs-support');
        setRedemptionError(outcome.error);
        return;
      }
    }
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-4">
        <p className="text-sm font-medium text-red-800">
          We couldn&apos;t load this claim right now. Please refresh the page.
        </p>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-sm text-slate-600">Loading claim details…</p>
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
      redemptionStatus={redemptionStatus}
      redemptionError={redemptionError}
      redemptionRetryAfter={redemptionRetryAfter}
    />
  );
}
