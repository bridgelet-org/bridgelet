'use client';

import { useEffect, useState } from 'react';
import { ClaimStatusCard } from '@/components/claim-status-card';
import { AccountStatus } from '@/lib/api/types';
import { BridgeletClient } from '@/lib/api/client';
import { ClaimView, loadClaimView, markTokenClaimed } from '@/lib/claim-view';

interface ClaimPageClientProps {
  token: string;
  supportEmail: string;
  initialView?: ClaimView;
}

const client = new BridgeletClient();

export function ClaimPageClient({ token, supportEmail, initialView }: ClaimPageClientProps) {
  const [view, setView] = useState<ClaimView | null>(initialView ?? null);
  const [loadError, setLoadError] = useState(false);

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
    const result = await client.redeemClaim(token, destinationAddress);
    if (!result.success) {
      throw new Error(result.error ?? 'Claim could not be completed. Please try again.');
    }
    // #435: record this session as the one that claimed the token
    markTokenClaimed(token);
    setView((prev) => ({
      ...(prev ?? { status: AccountStatus.CLAIMED }),
      status: result.isPartial ? AccountStatus.PARTIAL_SWEEP : AccountStatus.CLAIMED,
      sweepNote: result.message,
      // #435: we just claimed it in this session
      claimedByMe: true,
      // #433: destination and amount for success state
      sweepDestination: destinationAddress,
      sweepAmountStroops: prev?.amountStroops,
    }));
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
      claimedByMe={view.claimedByMe}
      sweepDestination={view.sweepDestination}
      sweepAmountStroops={view.sweepAmountStroops}
    />
  );
}
