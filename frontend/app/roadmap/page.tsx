import type { Metadata } from 'next';
import { PageShell } from '@/components/page-shell';
import { quarters, communityRequests, longTermVision } from '@/lib/roadmap-data';

export const metadata: Metadata = {
  title: 'Roadmap — Bridgelet',
  description:
    'Development timeline, planned features, and community priorities for the Bridgelet project.',
};

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-slate-300" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

type ProgressBarProps = {
  value: number;
};

function ProgressBar({ value }: ProgressBarProps) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function RoadmapPage() {
  const allItems = quarters.flatMap((q) => q.categories.flatMap((c) => c.items));
  const doneCount = allItems.filter((i) => i.done).length;
  const totalCount = allItems.length;
  const overallProgress = Math.round((doneCount / totalCount) * 100);

  return (
    <PageShell
      title="Roadmap"
      description="Development timeline, planned features, and community priorities for the Bridgelet project."
    >
      <div className="space-y-10">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Overall Progress</span>
            <span className="text-slate-500">
              {doneCount} / {totalCount} complete
            </span>
          </div>
          <ProgressBar value={overallProgress} />
          <p className="text-xs text-slate-400">
            Phase: MVP Implementation — Building core primitives for ephemeral account creation and
            sweeping.
          </p>
        </div>

        {/* Quarterly Sections */}
        <div className="space-y-8">
          {quarters.map((quarter) => {
            const quarterItems = quarter.categories.flatMap((c) => c.items);
            const quarterDone = quarterItems.filter((i) => i.done).length;
            const quarterTotal = quarterItems.length;
            const quarterProgress = Math.round((quarterDone / quarterTotal) * 100);

            return (
              <div
                key={quarter.id}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {quarter.emoji} {quarter.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{quarter.goal}</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-slate-500">
                    {quarterDone}/{quarterTotal}
                  </span>
                </div>

                <div className="mb-4">
                  <ProgressBar value={quarterProgress} />
                </div>

                <div className="space-y-4">
                  {quarter.categories.map((category) => (
                    <div key={category.label}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {category.label}
                      </h3>
                      <ul className="space-y-1">
                        {category.items.map((item) => (
                          <li
                            key={item.label}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            {item.done ? <CheckIcon /> : <MinusIcon />}
                            <span className={item.done ? 'text-slate-500' : ''}>
                              {item.done ? <s>{item.label}</s> : item.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Community Requests */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Community Requests</h2>
          <p className="text-sm text-slate-500">Priorities driven by community feedback.</p>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Feature</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Issue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {communityRequests.map((req) => (
                  <tr key={req.feature} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-900">{req.feature}</td>
                    <td className="px-4 py-2 text-slate-700">{req.status}</td>
                    <td className="px-4 py-2 text-slate-500">{req.issue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            Have a request?{' '}
            <a
              href="https://github.com/bridgelet-org/bridgelet/issues/new?template=feature_request.md"
              className="underline hover:text-slate-600"
            >
              Open a Feature Request
            </a>
          </p>
        </div>

        {/* Long-term Vision */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Long-term Vision 🔭</h2>
          <p className="text-sm text-slate-500">
            Bridgelet aims to become the standard &ldquo;invisible bridge&rdquo; for the Stellar
            network.
          </p>
          <ol className="list-inside list-decimal space-y-2 text-sm text-slate-700">
            {longTermVision.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ol>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 pt-4 text-xs text-slate-400">
          We build in the open. You can influence this roadmap by{' '}
          <a
            href="https://github.com/bridgelet-org/bridgelet/discussions"
            className="underline hover:text-slate-600"
          >
            voting on GitHub Discussions
          </a>
          , contributing code, or joining our community calls.
        </div>
      </div>
    </PageShell>
  );
}
