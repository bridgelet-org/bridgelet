import { PageShell } from '@/components/page-shell';
import { SendHistory } from '@/components/send-history';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sent payments',
  description: 'Payments created through this app and their claim status.',
};

export default function SendHistoryPage() {
  return (
    <PageShell
      title="Sent payments"
      description="Payments created through this app, newest first. Claim links are recoverable for payments created in this browser."
    >
      <SendHistory />
    </PageShell>
  );
}
