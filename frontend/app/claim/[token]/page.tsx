'use client'

import { useSearchParams } from 'next/navigation'
import { use } from 'react'
import { PageShell } from '@/components/page-shell'
import { SharePrompt } from '@/components/share-prompt'
import { ClaimStatusCard, type ClaimStatus } from '@/components/claim-status-card'
import { publicEnv } from '@/lib/env'

type ClaimPageProps = {
  params: Promise<{ token: string }>
}

export default function ClaimPage({ params }: ClaimPageProps) {
  const { token } = use(params)
  const searchParams = useSearchParams()
  const stateParam = searchParams.get('state') as ClaimStatus | null
  const status = stateParam || 'available'

  // Demo data — replace with a real API fetch once /claim/:token is live.
  const demoExpiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()

  return (
    <PageShell
      title="Claim your payment"
      description="A payment has been sent to you via Bridgelet. Review the details below and claim it to your Stellar wallet."
    >
      <div className="space-y-6">
        <section aria-labelledby="available-heading">
          <h2 id="available-heading" className="sr-only">Available payment</h2>
          <ClaimStatusCard
            status={status}
            amountStroops="50000000"
            assetCode="XLM"
            expiresAt={demoExpiresAt}
            memo="Invoice #42"
            supportEmail={publicEnv.NEXT_PUBLIC_SUPPORT_EMAIL}
          />
        </section>

        <p className="text-xs text-slate-400 text-center">
          Token:{' '}
          <span className="font-mono break-all">{token}</span>
        </p>

        <SharePrompt appUrl={publicEnv.NEXT_PUBLIC_APP_URL} />
      </div>
    </PageShell>
  )
}
