'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Logo from './logo';
import { ThemeToggle } from './theme-toggle';

type NavLink = { href: string; label: string; external?: boolean };

const LINKS: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/send', label: 'Send' },
  { href: 'https://github.com/bridgelet-org/bridgelet/tree/main/docs', label: 'Docs', external: true },
  { href: 'https://github.com/bridgelet-org/bridgelet', label: 'GitHub', external: true },
];

const BASE = 'rounded px-3 py-2 text-sm font-medium transition-colors';
const ACTIVE = 'bg-slate-100 text-[#0A1628] dark:bg-slate-800 dark:text-white';
const IDLE = 'text-slate-600 hover:text-[#0A1628] dark:text-slate-300 dark:hover:text-white';

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  // Close the mobile menu on Escape or a click outside the nav.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function onPointerDown(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  function renderLink(link: NavLink) {
    const active = !link.external && pathname === link.href;
    const className = `${BASE} ${active ? ACTIVE : IDLE}`;
    if (link.external) {
      return (
        <a
          key={link.href}
          href={link.href}
          className={className}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
        >
          {link.label}
        </a>
      );
    }
    return (
      <Link
        key={link.href}
        href={link.href}
        className={className}
        aria-current={active ? 'page' : undefined}
        onClick={() => setOpen(false)}
      >
        {link.label}
      </Link>
    );
  }

  return (
    <nav
      ref={navRef}
      aria-label="Main"
      className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/"
          aria-label="Bridgelet home"
          className="flex items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <Logo className="h-8 w-8" />
          <span className="text-lg font-medium tracking-tight text-[#0A1628] dark:text-white">
            bridgelet
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 md:flex">{LINKS.map(renderLink)}</div>
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex items-center rounded p-2 text-slate-600 md:hidden dark:text-slate-300"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-menu"
          data-testid="mobile-menu"
          className="flex flex-col gap-1 border-t border-slate-200 px-6 py-3 md:hidden dark:border-slate-800"
        >
          {LINKS.map(renderLink)}
        </div>
      )}
    </nav>
  );
}
