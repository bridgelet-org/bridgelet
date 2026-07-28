'use client';

import { useState, useEffect, useCallback } from 'react';

type Step = {
  number: number;
  title: string;
  description: string;
  ariaLabel: string;
  icon: React.ReactNode;
};

const STEPS: Step[] = [
  {
    number: 1,
    title: 'Sender creates ephemeral account',
    description: 'A temporary Stellar account is funded for this payment only.',
    ariaLabel: 'Step 1: Sender creates ephemeral account',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    number: 2,
    title: 'Recipient claims via link',
    description: 'The recipient opens a secure claim link and submits their wallet.',
    ariaLabel: 'Step 2: Recipient claims via link',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    number: 3,
    title: 'Funds sweep to permanent wallet',
    description: 'Funds are swept from the ephemeral account to the recipient\'s wallet.',
    ariaLabel: 'Step 3: Funds sweep to permanent wallet',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    ),
  },
];

export function HowItWorks({ intervalMs = 3000 }: { intervalMs?: number }) {
  const [activeStep, setActiveStep] = useState(0);

  const nextStep = useCallback(() => {
    setActiveStep((prev) => (prev + 1) % STEPS.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextStep, intervalMs);
    return () => clearInterval(timer);
  }, [nextStep, intervalMs]);

  return (
    <section aria-labelledby="how-it-works-heading" className="py-10">
      <h2 id="how-it-works-heading" className="text-center text-2xl font-semibold text-slate-950 dark:text-slate-50">
        How It Works
      </h2>
      <p className="mt-2 text-center text-sm text-slate-700">
        Three simple steps to send crypto without requiring a wallet.
      </p>

      <div
        role="list"
        aria-label="How It Works steps"
        className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3"
      >
        {STEPS.map((step, index) => {
          const isActive = index === activeStep;
          const isPast = index < activeStep;

          return (
            <div
              key={step.number}
              role="listitem"
              aria-label={step.ariaLabel}
              aria-current={isActive ? 'step' : undefined}
              className={`relative flex flex-col items-center rounded-xl border p-6 text-center transition-all duration-500 ${
                isActive
                  ? 'border-sky-500 bg-white shadow-lg animate-step-pulse dark:bg-slate-800'
                  : isPast
                    ? 'border-sky-200 bg-white dark:border-sky-800 dark:bg-slate-800'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-500 ${
                  isActive ? 'bg-sky-600 text-white' : isPast ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {step.icon}
              </div>

              <div className="mt-4">
                <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-700">{step.description}</p>
              </div>

              {index < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 z-10" aria-hidden="true">
                  <svg
                    aria-hidden="true"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isPast ? '#0EA5E9' : '#CBD5E1'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-colors duration-500 ${isActive ? 'animate-bounce' : ''}`}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {STEPS[activeStep]?.title ?? ''}
      </div>
    </section>
  );
}
