'use client'

import { PageShell } from '@/components/page-shell'
import type { SendFormState } from '@/components/send-form'

function SuccessView({ state }: { state: SendFormState }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-green-200 bg-green-50 px-4 py-4"
    >
      <p className="font-medium text-green-800">Payment sent!</p>
      <p className="mt-1 text-sm text-green-700">
        A claim link has been sent to <strong>{state.recipientEmail}</strong>. They have 24
        hours to claim their funds.
      </p>
    </div>
  )
}

const TEST_FORM_STATE: SendFormState = {
  publicKey: 'GABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890',
  recipientEmail: 'test@example.com',
  amountXlm: '5',
  assetCode: 'XLM',
  memo: 'Invoice #42'
}

export default function SendSuccessSandboxPage() {
  return (
    <PageShell
      title="Send a Payment"
      description="Send crypto to anyone — even recipients with no wallet. They claim from a secure link."
    >
      <div className="space-y-6">
        <nav aria-label="Send form progress">
          <ol className="flex gap-2" role="list">
            {['connect', 'details', 'confirm'].map((s, i) => {
              const isDone = i < 2
              return (
                <li key={s} className="flex items-center gap-2">
                  {i > 0 && (
                    <span aria-hidden="true" className="text-slate-300">
                      /
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium ${isDone ? 'text-green-600' : 'text-slate-400'}`}
                  >
                    {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
                    {isDone && <span className="sr-only"> (complete)</span>}
                  </span>
                </li>
              )
            })}
          </ol>
        </nav>
        <h2 className="text-xl font-semibold text-slate-900">
          Step 3 of 3: Confirm & Send
        </h2>
        <SuccessView state={TEST_FORM_STATE} />
      </div>
    </PageShell>
  )
}
