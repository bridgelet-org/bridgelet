'use client';

import React from 'react';

export interface Step {
  id: string;
  label: string;
  description?: string;
}

export interface MultiStepProgressProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showDescriptions?: boolean;
  className?: string;
}

export function MultiStepProgress({
  steps,
  currentStep,
  onStepClick,
  size = 'md',
  showDescriptions = false,
  className = '',
}: MultiStepProgressProps) {
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0;

  return (
    <nav aria-label="Claim flow progress" className={className}>
      <div className="relative mb-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-sky-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={currentStep + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-label={`Step ${currentStep + 1} of ${steps.length}`}
          />
        </div>
      </div>

      <ol className="flex items-start justify-between" role="list">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = onStepClick && (isCompleted || isCurrent);

          const sizeClasses = {
            sm: 'h-6 w-6 text-xs',
            md: 'h-8 w-8 text-sm',
            lg: 'h-10 w-10 text-base',
          };

          return (
            <li key={step.id} className="flex flex-1 flex-col items-center" aria-current={isCurrent ? 'step' : undefined}>
              <button
                onClick={isClickable ? () => onStepClick(index) : undefined}
                disabled={!isClickable}
                aria-label={`${step.label}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
                className={`flex items-center justify-center rounded-full border-2 transition-all duration-300 ${sizeClasses[size]} ${
                  isCompleted
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : isCurrent
                      ? 'border-sky-600 bg-white text-sky-600 shadow-md dark:bg-slate-900'
                      : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800'
                } ${isClickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </button>

              <span className={`mt-2 text-center text-xs font-medium ${
                isCurrent ? 'text-sky-600 dark:text-sky-400' : isCompleted ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
              }`}>
                {step.label}
              </span>

              {showDescriptions && step.description && (
                <span className="mt-1 text-center text-[10px] text-slate-400 dark:text-slate-500">
                  {step.description}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.label}
      </div>
    </nav>
  );
}
