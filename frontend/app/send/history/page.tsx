import { PageShell } from '@/components/page-shell';
import { SendHistory } from '@/components/send-history';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sent payments',
  description: 'Payments you created from this browser and their claim status.',
};

export default function SendHistoryPage() {
  return (
    <PageShell
      title="Sent payments"
      description="Payments you created from this browser, newest first. Claim links are withheld here on purpose."
    >
      <SendHistory />
    </PageShell>
  );
}
