'use client';

import { useEffect } from 'react';

export function MockProvider() {
  useEffect(() => {
    const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
    if (process.env.NODE_ENV === 'development' || isDemo) {
      import('@/mocks').then(({ initMocks }) => initMocks());
    }
  }, []);

  return null;
}
