'use client';

import { useEffect, useRef, useState } from 'react';
import { ConnectStep } from './steps/connect-step';
import { ExpiryStep } from './steps/expiry-step';
import { DetailsStep } from './steps/details-step';
import { ConfirmStep } from './steps/confirm-step';

export type SendFormStep = 'connect' | 'expiry' | 'details' | 'confirm';

export interface SendFormState {
  publicKey: string;
  recipientName: string;
  recipientEmail: string;
  amountXlm: string;
  assetCode: string;
  memo: string;
  expiresIn: number;
}

const INITIAL_STATE: SendFormState = {
  publicKey: '',
  recipientName: '',
  recipientEmail: '',
  amountXlm: '',
  assetCode: 'XLM',
  memo: '',
  expiresIn: 7 * 24 * 60 * 60,
};

const STEP_ORDER: SendFormStep[] = ['connect', 'expiry', 'details', 'confirm'];

const STEP_LABELS: Record<SendFormStep, string> = {
  connect: 'Step 1 of 4: Connect wallet',
  expiry: 'Step 2 of 4: Set expiry',
  details: 'Step 3 of 4: Set account details',
  confirm: 'Step 4 of 4: Create account',
};

/**
 * Multi-step send form.
 *
 * Accessibility: when the active step changes, focus is programmatically
 * moved to the step heading so screen reader users hear the new context
 * without having to navigate backwards from wherever focus was left.
 */
export function SendForm() {
  const [step, setStep] = useState<SendFormStep>('connect');
  const [formState, setFormState] = useState<SendFormState>(INITIAL_STATE);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the step heading every time the step changes.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function goNext() {
    const idx = STEP_ORDER.indexOf(step);
    const next = STEP_ORDER[idx + 1];
    if (next) setStep(next);
  }

  function goBack() {
    const idx = STEP_ORDER.indexOf(step);
    const prev = STEP_ORDER[idx - 1];
    if (prev) setStep(prev);
  }

  function updateState(patch: Partial<SendFormState>) {
    setFormState((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <nav aria-label="Create ephemeral account progress">
        <ol className="flex gap-2" role="list">
          {STEP_ORDER.map((s, i) => {
            const isCurrent = s === step;
            const isDone = STEP_ORDER.indexOf(step) > i;
            return (
              <li key={s} className="flex items-center gap-2">
                {i > 0 && (
                  <span aria-hidden="true" className="text-slate-300">
                    /
                  </span>
                )}
                <span
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`text-xs font-medium ${
                    isCurrent ? 'text-slate-900' : isDone ? 'text-green-700' : 'text-slate-500'
                  }`}
                >
                  {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
                  {isDone && <span className="sr-only"> (complete)</span>}
                  {isCurrent && <span className="sr-only"> (current)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step heading — receives focus on every step transition */}
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-semibold text-slate-900 focus:outline-none"
      >
        {STEP_LABELS[step]}
      </h2>

      {/* Step content */}
      {step === 'connect' && (
        <ConnectStep
          publicKey={formState.publicKey}
          onConnected={(key) => {
            updateState({ publicKey: key });
            goNext();
          }}
        />
      )}
      {step === 'expiry' && (
        <ExpiryStep
          expiresIn={formState.expiresIn}
          onChange={(expiresIn) => updateState({ expiresIn })}
          onBack={goBack}
          onNext={goNext}
        />
      )}
      {step === 'details' && (
        <DetailsStep state={formState} onChange={updateState} onBack={goBack} onNext={goNext} />
      )}
      {step === 'confirm' && <ConfirmStep state={formState} onBack={goBack} />}
    </div>
  );
}
