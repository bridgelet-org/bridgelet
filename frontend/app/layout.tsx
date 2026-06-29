import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { DevToolbar } from '@/components/dev-toolbar';
import { MockProvider } from '@/components/mock-provider';

export const metadata: Metadata = {
  title: 'Bridgelet Payments',
  description: 'Reference UI for sending and claiming crypto payments.',
  icons: { icon: '/logo-icon.svg' }
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en">
      <body>
        <MockProvider>
          {children}
          {isDev && <DevToolbar />}
        </MockProvider>
      </body>
    </html>
  );
}
