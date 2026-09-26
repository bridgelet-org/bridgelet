import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { DevToolbar } from '@/components/dev-toolbar';
import { MockProvider } from '@/components/mock-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { PlausibleScript } from '@/components/plausible-script';

export const metadata: Metadata = {
  title: 'Bridgelet Payments',
  description: 'Reference UI for sending and claiming crypto payments.',
  icons: { icon: '/logo-icon.svg' },
};

type RootLayoutProps = {
  children: ReactNode;
};

/**
 * Inline script run before the page renders to avoid a flash of
 * unstyled content (FOUC) when the user has a stored dark-mode preference.
 */
const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('bridgelet-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: RootLayoutProps) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en" suppressHydrationWarning>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          {isDev && <DevToolbar />}
          {isDev && <MockProvider />}
          {/* Plausible loader — kept inside RootLayout so the loader is present
              on every route; the underlying script tag is stripped server-side
              on claim routes, where third-party scripts are forbidden by the
              security model (T-16, token-in-Referer). */}
          <PlausibleScript />
        </ThemeProvider>
      </body>
    </html>
  );
}