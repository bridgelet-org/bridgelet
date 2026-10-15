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

## Deploying

The frontend needs four settings to line up. The most common failures are the
wrong SDK port, a token that does not match the SDK's `JWT_SECRET`, and a CORS
origin that does not include the frontend.

### Required environment variables

| Variable | Visibility | Purpose | Must match |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | browser | Public URL of this frontend; used to build claim links | The SDK's `CLAIM_BASE_URL` |
| `NEXT_PUBLIC_API_BASE_URL` | browser | Public SDK URL the browser calls for `/claims/*` | SDK host/port, with CORS allowing this origin |
| `BRIDGELET_SDK_URL` | server-only | SDK URL used by server Route Handlers (account create/lookup) | SDK host/port (may be internal) |
| `BRIDGELET_SDK_TOKEN` | server-only | `Authorization: Bearer` JWT for the SDK | Signed with the SDK's `JWT_SECRET` |
| `RESEND_API_KEY` | server-only | Sends the claim-link email | A Resend account key |
| `EMAIL_FROM` | server-only | Verified `from` address for that email | A domain verified in Resend |

- **Browser vs server.** Anything prefixed `NEXT_PUBLIC_` is inlined into the
  browser bundle and must never hold a secret. `BRIDGELET_SDK_URL` and
  `BRIDGELET_SDK_TOKEN` are read only inside `app/api/**/route.ts` and never
  reach the client.
- **SDK port.** The SDK listens on the port set in *its own* `.env` (3001 in our
  setup), which is different from this frontend's 3000. Point both
  `NEXT_PUBLIC_API_BASE_URL` and `BRIDGELET_SDK_URL` at the SDK, not the app.
- **Minting the token.** Generate a JWT signed with the SDK's `JWT_SECRET` using
  the SDK's tooling, and paste it as one unbroken line. A malformed or
  mismatched token surfaces as a 401 from `/api/accounts`.
- **Claim links.** Set the SDK's `CLAIM_BASE_URL` to the public frontend URL
  (`NEXT_PUBLIC_APP_URL`) so the link a recipient receives points at this app.
- **CORS.** The SDK must allow this frontend's origin so browser calls to
  `/claims/*` succeed.

### Function duration

`app/api/accounts/route.ts` sets `maxDuration = 60` because creating an
ephemeral account provisions an on-chain account and can take tens of seconds
(plus cold starts). On a host with a lower serverless limit, raise the limit for
this route or deploy it on a long-running runtime; otherwise the request is
killed mid-flight.

### Fail fast

Validate the required variables before building or starting:

```bash
npm run check-env
```

This exits non-zero with a readable list when `BRIDGELET_SDK_URL`,
`BRIDGELET_SDK_TOKEN`, `RESEND_API_KEY`, or `EMAIL_FROM` are missing, instead of
failing on the first request.

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

## Freighter sender signing (experimental, off by default)

The confirm step can optionally ask Freighter to sign the account-creation
transaction. This experiment is **disabled by default** because the SDK does
not implement `POST /accounts/prepare` yet, so enabling it only adds a request
that is expected to 404 before falling back to backend signing.

- `NEXT_PUBLIC_ENABLE_FREIGHTER_SENDER_SIGNING` — set to `true` (or `1`/`on`/`yes`)
  to opt in; empty or `false` keeps the default backend-signing-only path.
- With the flag off, the default send makes **no** request to
  `/api/accounts/prepare`.
- The dormant code (`lib/freighter-sender-signing.ts`,
  `app/api/accounts/prepare/route.ts`) is kept for the SDK follow-up described
  in [`docs/experiments/freighter-sender-signing.md`](../docs/experiments/freighter-sender-signing.md).

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

  The suite is hermetic: it starts a local stub SDK + Horizon
  (`e2e/stub-sdk.mjs`) and replaces Freighter with a `window.postMessage`
  responder (`e2e/fixtures.ts`), so it never touches Stellar testnet, the real
  SDK, a browser extension, or any secret. Optionally, a full manual testnet
  smoke test can be run against a real SDK instance — see
  [`../TESTING.md`](../TESTING.md).

- Production build:

  ```bash
  npm run build
  ```
