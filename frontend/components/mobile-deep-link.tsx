'use client';

import { useState, useCallback, useEffect } from 'react';

interface DeepLinkConfig {
  iosScheme: string;
  androidScheme: string;
  fallbackUrl: string;
  appStore: { ios: string; android: string };
}

const DEFAULT_CONFIG: DeepLinkConfig = {
  iosScheme: 'bridgelet://claim',
  androidScheme: 'bridgelet://claim',
  fallbackUrl: '',
  appStore: {
    ios: 'https://apps.apple.com/app/bridgelet/id000000000',
    android: 'https://play.google.com/store/apps/details?id=org.bridgelet.app',
  },
};

type Platform = 'ios' | 'android' | 'desktop';

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

export function MobileDeepLinkHandoff({
  claimId,
  config = DEFAULT_CONFIG,
  className = '',
}: {
  claimId: string;
  config?: DeepLinkConfig;
  className?: string;
}) {
  const [platform] = useState<Platform>(detectPlatform);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (platform === 'desktop') return;
    const deepLinkUrl = platform === 'ios'
      ? `${config.iosScheme}?id=${claimId}`
      : `${config.androidScheme}?id=${claimId}`;

    const timer = setTimeout(() => {}, 2000);
    window.location.href = deepLinkUrl;
    return () => clearTimeout(timer);
  }, [claimId, config, platform]);

  const handleOpenInApp = useCallback(() => {
    const deepLinkUrl = platform === 'ios'
      ? `${config.iosScheme}?id=${claimId}`
      : `${config.androidScheme}?id=${claimId}`;

    window.location.href = deepLinkUrl;
    setAttempted(true);

    setTimeout(() => {
      window.location.href = platform === 'ios' ? config.appStore.ios : config.appStore.android;
    }, 2500);
  }, [claimId, config, platform, attempted]);

  if (platform === 'desktop') return null;

  return (
    <div role="region" aria-label="Open in mobile app" className={`rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 ${className}`}>
      <div className="flex items-center gap-3">
        <svg className="h-6 w-6 flex-shrink-0 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Open in the Bridgelet app</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Faster claim experience on mobile</p>
        </div>
        <button
          onClick={handleOpenInApp}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          Open App
        </button>
      </div>
    </div>
  );
}
