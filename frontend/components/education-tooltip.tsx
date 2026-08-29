'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface TooltipContent {
  term: string;
  explanation: string;
  details?: string;
}

const COMMON_TERMS: TooltipContent[] = [
  { term: 'Stellar wallet', explanation: 'A digital account that holds your cryptocurrency.', details: 'Think of it like a bank account for digital money. You need one to receive crypto, but with Bridgelet, you can set one up when you claim your payment.' },
  { term: 'Claim link', explanation: 'A secure URL that lets you receive funds without having a wallet beforehand.', details: 'When someone sends you crypto through Bridgelet, they get a claim link to share with you. You just open it and follow the steps.' },
  { term: 'XLM', explanation: 'The native cryptocurrency of the Stellar network.', details: 'XLM (Stellar Lumens) is the digital currency used on the Stellar blockchain. It\'s used to pay tiny network fees (fractions of a cent).' },
  { term: 'Ephemeral account', explanation: 'A temporary account that holds your funds until you claim them.', details: 'Bridgelet creates a one-time account to hold the payment. Once you claim, the funds move to your permanent wallet and the temporary account disappears.' },
  { term: 'Network fee', explanation: 'A tiny cost (less than $0.01) to process a transaction on Stellar.', details: 'Every blockchain transaction has a small fee to prevent spam. Stellar\'s fees are among the lowest — typically 0.00001 XLM per transaction.' },
];

export function EducationTooltip({
  term,
  content,
  children,
}: {
  term: string;
  content?: TooltipContent;
  children?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const tooltipData = content ?? COMMON_TERMS.find((t) => t.term === term);

  const handleMouseEnter = useCallback(() => setIsOpen(true), []);
  const handleMouseLeave = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  if (!tooltipData) return <>{children ?? term}</>;

  return (
    <span className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onFocus={handleMouseEnter} onBlur={handleMouseLeave}>
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={`tooltip-${term.replace(/\s+/g, '-').toLowerCase()}`}
        onClick={() => setIsOpen(!isOpen)}
        className="inline cursor-help border-b border-dashed border-slate-400 text-inherit transition-colors hover:border-sky-500 hover:text-sky-600 dark:border-slate-500 dark:hover:border-sky-400 dark:hover:text-sky-400"
      >
        {children ?? term}
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          id={`tooltip-${term.replace(/\s+/g, '-').toLowerCase()}`}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{tooltipData.explanation}</p>
          {tooltipData.details && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{tooltipData.details}</p>}
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" aria-hidden="true" />
        </div>
      )}
    </span>
  );
}

export { COMMON_TERMS };
