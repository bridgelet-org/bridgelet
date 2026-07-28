// #124 – Sandbox page for generating and claiming test tokens (dev/staging only)

import { redirect } from 'next/navigation';

export default function ClaimTestPage() {
  // Prevent access to this page in production since it is intended
  // only for testing and development purposes.
  if (process.env.NODE_ENV === 'production') {
    redirect('/');
  }

  // Generate a unique demo token using the current timestamp.
  // This simulates a test token without requiring a backend service.
  const demoToken = 'sandbox_demo_token_' + Date.now();

  return (
    <main className="p-8 max-w-lg mx-auto space-y-6">
      {/* Page heading */}
      <h1 className="text-xl font-bold">Claim Test Sandbox</h1>

      {/* Inform users that this page is only available in non-production environments */}
      <p className="text-sm text-slate-500">
        Only visible in development and staging environments.
      </p>

      {/* Display the generated token and provide a link to claim it */}
      <div className="rounded-lg border p-4 space-y-2 bg-slate-50">
        <p className="text-xs font-mono break-all text-slate-600">
          Token: {demoToken}
        </p>

        {/* Navigates to the claim page using the generated demo token */}
        <a
          href={`/claim/${demoToken}`}
          className="inline-block rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          Claim this test token →
        </a>
      </div>

      {/* Tip for testing different claim states by modifying the URL */}
      <p className="text-xs text-slate-400">
        Append <code>?state=claimed</code> or <code>?state=expired</code> to test other states.
      </p>
    </main>
  );
}