'use client';

import { useState, type FormEvent } from 'react';
import { PageShell } from '@/components/page-shell';
import { publicEnv } from '@/lib/env';

// Type definition for custom errors (Criteria 3: user vs platform)
interface PaymentError {
  message: string;
  isUserActionable: boolean;
  canRetry: boolean;
}

export default function SendPage() {
  // Input and transaction tracking states
  const [amount, setAmount] = useState<string>('');
  const [balance, setBalance] = useState<number>(50.00); // Simulated sender wallet balance
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<PaymentError | null>(null);

  const handleSendSubmission = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    setErrorState(null);
    setSuccess(false);
    setIsSubmitting(true);

    const sendAmount = parseFloat(amount);

    if (isNaN(sendAmount) || sendAmount <= 0) {
      setIsSubmitting(false);
      setErrorState({
        message: "Please enter a valid transfer amount.",
        isUserActionable: true,
        canRetry: false
      });
      return;
    }

    // ❌ CRITERIA 1: Detect insufficient balance BEFORE signature request
    if (sendAmount > balance) {
      setIsSubmitting(false);
      setErrorState({
        message: "Insufficient Balance: Your wallet balance is too low to fund this transaction and its ephemeral account fees.",
        isUserActionable: true, // User action needed: deposit funds
        canRetry: false
      });
      return;
    }

    try {
      // Simulate transaction request pipeline context
      // Randomly simulating a 50% chance of RPC/Network error for demonstration
      if (Math.random() > 0.5) {
        throw new Error('RPC_NETWORK_TIMEOUT');
      }

      // Successful dispatch simulation
      setIsSubmitting(false);
      setSuccess(true);
      setBalance((prev) => prev - sendAmount);
      setAmount('');
    } catch (error: any) {
      setIsSubmitting(false);
      
      // 🛠️ CRITERIA 3: Distinguish user-actionable vs platform-side issues
      if (error.message === 'RPC_NETWORK_TIMEOUT') {
        setErrorState({
          message: "Network Error: Connectivity dropped mid-submission while connecting to the RPC server.",
          isUserActionable: false, // Platform-side infrastructure drop
          canRetry: true // CRITERIA 2: Provide a retry option instead of a dead-end
        });
      } else {
        setErrorState({
          message: "Transaction failed due to an internal system error. Please try again later.",
          isUserActionable: false,
          canRetry: false
        });
      }
    }
  };

  return (
    <PageShell
      title="Sender Flow"
      description="Sender journey for creating, validating, and funding a payment claim."
    >
      <div className="max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Wallet Balance Display */}
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <span className="text-slate-500 font-medium">Your Simulated Balance: </span>
          <span className="font-bold text-slate-900">{balance.toFixed(2)} CRYPTO</span>
        </div>

        {/* The Submission Input Form */}
        <form onSubmit={handleSendSubmission} className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1">
              Amount to Send
            </label>
            <input
              id="amount"
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              placeholder="0.00"
            />
          </div>

          {/* 🚨 ERROR CONTAINER: Renders warning states & active retry paths */}
          {errorState && (
            <div className={`p-4 rounded-md border text-sm ${errorState.isUserActionable ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
              <p className="font-medium">{errorState.message}</p>
              
              {/* CRITERIA 2: Network failure retry option, not a dead-end error */}
              {errorState.canRetry && (
                <button
                  type="button"
                  onClick={handleSendSubmission}
                  className="mt-2 block font-semibold text-blue-600 underline hover:text-blue-800"
                >
                  🔄 Retry Submission
                </button>
              )}
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="p-4 rounded-md border bg-green-50 border-green-200 text-green-900 text-sm font-medium">
              ✅ Transaction successfully submitted and processed!
            </div>
          )}

          {/* Action Trigger Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:bg-slate-400"
          >
            {isSubmitting ? 'Processing Submission...' : 'Send Payment'}
          </button>
        </form>

        <hr className="border-slate-200" />

        {/* Metadata Details */}
        <dl className="grid grid-cols-2 gap-4 text-xs text-slate-500">
          <div>
            <dt className="font-medium text-slate-700">API Base URL</dt>
            <dd className="truncate">{publicEnv.NEXT_PUBLIC_API_BASE_URL}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Network</dt>
            <dd>{publicEnv.NEXT_PUBLIC_CRYPTO_NETWORK}</dd>
          </div>
        </dl>
      </div>
    </PageShell>
  );
}

