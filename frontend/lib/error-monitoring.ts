// Production error capture integration for failed claim/send transactions
export function logTransactionError(txHash: string, errorMsg: string) {
  console.error(`[TX FAILED] Hash: ${txHash} | Error: ${errorMsg}`);
  // Sentry / Logflare integration hooks
}
