import Link from 'next/link';
import { PageShell } from '@/components/page-shell';
import { HowItWorks } from '@/components/how-it-works';
import { CTABanner } from '@/components/cta-banner';
import { FAQAccordion } from '@/components/faq-accordion';

export default function HomePage() {
  return (
    <PageShell
      title="Bridgelet Payment Flows"
      description="Reference placeholder UI for sender and recipient claim experiences."
      footer={<CTABanner />}
    >
      <div className="space-y-8">
        <HowItWorks intervalMs={3500} />
        <div className="space-y-4">
          <p className="text-slate-700">Select a flow to continue.</p>
          <nav aria-label="Flow selection" className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/send"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              Open Sender Flow
            </Link>
            <Link
              href="/claim/example-token"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Open Claim Flow
            </Link>
          </nav>
        </div>
        <FAQAccordion />
      </div>
    </PageShell>
  );
}
