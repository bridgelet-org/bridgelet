import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { DevToolbar } from '@/components/dev-toolbar';
import { MockProvider } from '@/components/mock-provider';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/toast-provider';

export const metadata: Metadata = {
  title: 'Bridgelet Payments',
  description: 'Reference UI for sending and claiming crypto payments.',
  icons: { icon: '/logo-icon.svg' },
  manifest: '/manifest.webmanifest',
};

type RootLayoutProps = {
  children: ReactNode;
};

/**
 * Inline script run before the page renders to avoid a flash of
 * unstyled content (FOUC) when the user has a stored dark-mode preference.
 * Issue #184
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <ServiceWorkerRegister />
            {children}
            {isDev && <DevToolbar />}
            {isDev && <MockProvider />}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
