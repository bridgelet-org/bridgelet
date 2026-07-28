'use client';

import { useState, useRef, useMemo, type KeyboardEvent } from 'react';

type FAQ = {
  question: string;
  answer: string;
};

const FAQS: FAQ[] = [
  {
    question: 'What is an ephemeral account?',
    answer:
      'An ephemeral account is a temporary Stellar account created for a single payment. It is funded by the sender, and the payment is swept to the recipient’s wallet only after the recipient claims it.',
  },
  {
    question: 'Do recipients need a wallet?',
    answer:
      'Recipients do not need a wallet to receive the claim link or understand the payment. To complete the claim, they must submit a valid Stellar wallet address so the funds can be transferred into their own wallet.',
  },
  {
    question: 'What happens if the payment is unclaimed?',
    answer:
      'If a payment is not claimed, the ephemeral account remains isolated and the funds stay there until the configured expiry or recovery process. This prevents the payment from being lost or mixed with other balances.',
  },
  {
    question: 'Is it safe?',
    answer:
      'Yes. The ephemeral account is isolated for the payment, and the claim process requires a valid wallet address before funds are swept. No recipient private key is exposed by the payment creation flow.',
  },
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const buttonIdPrefix = 'faq-accordion-button-';
  const panelIdPrefix = 'faq-accordion-panel-';

  const handleToggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  const moveFocus = (index: number) => {
    const button = buttonRefs.current[index];
    if (button) {
      button.focus();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const maxIndex = FAQS.length - 1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(index === maxIndex ? 0 : index + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(index === 0 ? maxIndex : index - 1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      moveFocus(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      moveFocus(maxIndex);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle(index);
    }
  };

  const faqList = useMemo(
    () =>
      FAQS.map((faq, index) => {
        const isOpen = openIndex === index;
        const buttonId = `${buttonIdPrefix}${index}`;
        const panelId = `${panelIdPrefix}${index}`;

        return (
          <div key={faq.question} className="rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
            <h3 className="m-0">
              <button
                ref={(node) => {
                  buttonRefs.current[index] = node;
                }}
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => handleToggle(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium text-slate-950 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                <span>{faq.question}</span>
                <span className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                  {isOpen ? 'Open' : 'Closed'}
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-5 pb-5 pt-0 text-slate-700 dark:text-slate-300"
            >
              <p className="mt-2 text-sm leading-7">{faq.answer}</p>
            </div>
          </div>
        );
      }),
    [openIndex],
  );

  return (
    <section aria-labelledby="faq-heading" className="space-y-4 py-8">
      <div className="space-y-2">
        <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Frequently asked questions
        </h2>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Answers for ephemeral accounts, wallets, claim safety, and what happens when a payment is unclaimed.
        </p>
      </div>
      <div className="grid gap-3">{faqList}</div>
    </section>
  );
}
