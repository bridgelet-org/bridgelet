/** Prevent Open Graph pre-fetching by Discord, Slack, etc. */
import { headers } from 'next/headers';
import { PageShell } from '@/components/page-shell';
import { SharePrompt } from '@/components/share-prompt';
import { ClaimPageClient } from './claim-page-client';
import { publicEnv, resolveAppUrl } from '@/lib/env';
import { loadClaimView } from '@/lib/claim-view';

type ClaimPageProps = {
  params: Promise<{ token: string }>;
};

export default async function ClaimPage({ params }: ClaimPageProps) {
  const { token } = await params;
  const requestHeaders = await headers();
  const appUrl = resolveAppUrl({ headers: requestHeaders });

  // Skip the server-side fetch to avoid blocking SSR on slow/unreachable API calls.
  // The client component re-fetches after hydration.
  const initialView = undefined;

  return (
    <PageShell
      title="Claim your payment"
      description="A payment has been sent to you via Bridgelet. Review the details below and claim it to your Stellar wallet."
    >
      <div className="space-y-6">
        <ClaimPageClient
          token={token}
          supportEmail={publicEnv.NEXT_PUBLIC_SUPPORT_EMAIL ?? ''}
          initialView={initialView}
        />

        <p className="text-xs text-slate-500 text-center">
          Token: <span className="font-mono break-all">{token}</span>
        </p>

        <SharePrompt appUrl={appUrl} />
      </div>
    </PageShell>
  );
}
