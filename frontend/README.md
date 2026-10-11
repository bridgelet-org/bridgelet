# Bridgelet Frontend

Reference Next.js UI for initiating and claiming crypto payments.

## Tech stack

- Next.js 16 (App Router)
- TypeScript 5 in strict mode
- Tailwind CSS 4

## Local setup

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Start development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Routes

- `/` homepage placeholder
- `/send` sender flow placeholder
- `/claim/[token]` recipient claim placeholder

## Send flow

The send form (`components/send-form/`) is a three-step wizard: **Connect** → **Details** → **Confirm**.

The details step (`steps/details-step.tsx`) collects the payment details:

- **Recipient name** and **recipient email** — both optional; the email format is validated when provided.
- **Amount** — required, must be greater than 0.
- **Asset** — `XLM` or `USDC` (defaults to `XLM`).
- A live **XLM → USD conversion** is shown under the amount field, using the CoinGecko rate from `lib/xlm-price.ts` (cached for 60 seconds, hidden if the rate is unavailable).

Validation runs on submit and then re-runs on every change so errors clear as soon as the input becomes valid. Errors are announced to assistive technology via `role="alert"` and linked to their fields with `aria-describedby`/`aria-invalid`.

## FAQ accordion

The homepage now includes an accessible FAQ accordion covering:

- What is an ephemeral account?
- Do recipients need a wallet?
- What happens if the payment is unclaimed?
- Is it safe?

The component uses keyboard navigation and WAI-ARIA accordion patterns so users can open and close items using Enter, Space, Arrow Up/Down, Home, and End.

## SDK wrapper (`lib/bridgelet.ts`)

`lib/bridgelet.ts` is the typed entry point for the bridgelet-sdk API. The confirm step of the send form creates ephemeral accounts through it:

```ts
import { createEphemeralAccount, type EphemeralAccount } from '@/lib/bridgelet';

const account: EphemeralAccount = await createEphemeralAccount({
  fundingSource: senderPublicKey,
  recovery_address: senderPublicKey,
  amount: '25',
  expiresIn: 86400,
});
```

- **Auth** — the wrapper never sends credentials from the browser. Requests go to this app's own `app/api/accounts/route.ts`, which attaches the `Authorization: Bearer` SDK token server-side (`BRIDGELET_SDK_TOKEN`).
- **Errors** — non-2xx responses are parsed into typed errors: `RateLimitError` on 429 (exposes `retryAfter`) and `BridgeletApiError` otherwise (exposes `statusCode` and the backend error code). `lib/account-errors.ts` maps these to user-facing messages.
- **Retries** — transient network failures and 5xx responses are retried with exponential backoff by the underlying `BridgeletClient` (`lib/create-bridgelet-client.ts`).

## Quality checks

- Type-check only:

  ```bash
  npm run typecheck
  ```

- Unit tests:

  ```bash
  npm test
  ```

- E2E tests (Playwright → `http://localhost:3000`):

  ```bash
  npx playwright install chromium   # one-time
  npm run test:e2e
  ```

- Production build:

  ```bash
  npm run build
  ```


## Deploying

To successfully deploy or run a local instance of the frontend, you must properly configure the environment workspace.

### Required Environment Variables

| Variable | Scope | Target Destination | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | Public (Browser) | SDK Client Port | Handles browser-side `/claims/*` calls. Must be publicly reachable and allow CORS. |
| `BRIDGELET_SDK_URL` | Server-only | SDK Backend Port | Used strictly for server-side fetches. |
| `BRIDGELET_SDK_TOKEN` | Server-only | Authorization | Must be a valid, single-line JWT authentication token. |

### Configuration Rules:
1. **Token Minting:** The `BRIDGELET_SDK_TOKEN` must be signed exactly with the SDK's internal `JWT_SECRET`. It must be formatted as one unbroken string line; extra spaces or line breaks will trigger `401 Unauthorized` errors.
2. **CORS Alignment:** Ensure the target SDK instance has explicit CORS handling rules configured to authorize requests coming from this frontend's public deployment origin.
3. **Serverless Platform Limitations:** The endpoint logic in `app/api/accounts` configures a `maxDuration = 60` script limit. If you are deploying on serverless infrastructure, confirm that your hosting provider allows function lifetimes of at least 60 seconds.
