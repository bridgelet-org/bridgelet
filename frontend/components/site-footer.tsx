import Link from 'next/link';

const REPO_URL = 'https://github.com/bridgelet-org/bridgelet';

export function SiteFooter() {
  return (
    <footer
      role="contentinfo"
      className="border-t border-slate-200 bg-white px-6 py-8 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
        <nav aria-label="Footer links" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-slate-900 dark:hover:text-white"
          >
            GitHub
          </a>
          <Link
            href="/docs"
            className="transition hover:text-slate-900 dark:hover:text-white"
          >
            Docs
          </Link>
          <a
            href={`${REPO_URL}/blob/main/SECURITY.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-slate-900 dark:hover:text-white"
          >
            Security Policy
          </a>
          <a
            href={`${REPO_URL}/blob/main/CONTRIBUTING.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-slate-900 dark:hover:text-white"
          >
            Contributing
          </a>
        </nav>

        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-medium text-slate-900 dark:text-white">bridgelet</span>
          <span>Released under the MIT License.</span>
          <span className="text-slate-500 dark:text-slate-500">
            Built for the Stellar ecosystem.
          </span>
        </div>
      </div>
    </footer>
  );
}
