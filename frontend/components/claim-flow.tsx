'use client';

import { useState, useEffect } from 'react';
import { ClaimStatusCard, type ClaimStatus } from '@/components/claim-status-card';

type ClaimFlowProps = {
  token: string;
  defaultStatus: ClaimStatus;
  demoExpiresAt: string;
  supportEmail: string;
};

export function ClaimFlow({ token, defaultStatus, demoExpiresAt, supportEmail }: ClaimFlowProps) {
  const [sweepNote, setSweepNote] = useState<string>();

  async function handleClaim() {
    const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
    if (process.env.NODE_ENV === 'development' || isDemo) {
      const res = await fetch('/claims/redeem', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to redeem claim');
      const data = await res.json();
      setSweepNote(data.sweepNote);
    } else {
      // Stub for real implementation when not in demo/dev mode
      await new Promise((res) => setTimeout(res, 800));
    }
  }

  return (
    <ClaimStatusCard
      status={defaultStatus}
      amountStroops="50000000"
      assetCode="XLM"
      expiresAt={demoExpiresAt}
      memo="Invoice #42"
      supportEmail={supportEmail}
      onClaim={handleClaim}
      sweepNote={sweepNote}
    />
  );
}
