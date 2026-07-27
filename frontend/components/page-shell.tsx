import Link from 'next/link';
import type { ReactNode } from 'react';
import Logo from './logo';
import { SiteFooter } from './site-footer';
import { ThemeToggle } from './theme-toggle';

type PageShellProps = {
  title: string;
  description: string;
  children?: ReactNode;
  /** Optional full-width content rendered below the main section (e.g. a CTA banner). */
  footer?: ReactNode;
};

export function PageShell({ title, description, children, footer }: PageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <nav className="border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            aria-label="Bridgelet home"
            className="flex items-center gap-2"
          >
            <Logo className="w-8 h-8" />
            <span className="text-lg font-medium tracking-tight text-[#0A1628] dark:text-white">
              bridgelet
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
          <p className="text-base text-slate-700">{description}</p>
        </header>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {children}
        </section>
      </main>
      {footer}
      <SiteFooter />
    </div>
  );
}
