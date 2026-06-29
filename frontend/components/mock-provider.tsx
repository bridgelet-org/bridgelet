'use client';

import { useEffect, useState } from 'react';

export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';
    const isDemo = typeof window !== 'undefined' && window.location.search.includes('demo=true');

    if (isDev || isDemo) {
      import('@/mocks').then(({ initMocks }) => {
        initMocks().then(() => setReady(true));
      });
    } else {
      setReady(true);
    }
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
