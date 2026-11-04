# Bridgelet E2E Integration Tests

End-to-end tests covering the full **send → claim → sweep** user journey across all three Bridgelet components:

- **bridgelet** (this repo): Next.js frontend
- **[bridgelet-sdk](https://github.com/bridgelet-org/bridgelet-sdk)**: NestJS backend
- **[bridgelet-core](https://github.com/bridgelet-org/bridgelet-core)**: Soroban smart contracts (Stellar testnet)

---

## Test Coverage

| Test file | Scenarios |
|---|---|
| `tests/happy-path.spec.ts` | Full send flow, claim pending state, end-to-end send → claim → sweep |
| `tests/failure-paths.spec.ts` | Expired token (401), already-claimed (409), invalid token (400), network error, redemption failure (500) |

---

## Quick Start (Mocked Backend)

The default mode uses **MSW (Mock Service Worker)** to intercept all API calls.
No real `bridgelet-sdk` or Stellar testnet account is required.

```bash
# 1. Install e2e dependencies
cd e2e
npm install

# 2. Install Playwright browser
npx playwright install --with-deps chromium

# 3. Run tests (starts the Next.js dev server automatically)
npm test
```

The test runner starts `cd ../frontend && npm run dev` before executing tests.
If you already have the dev server running on port 3000, it will be reused.

---

## Running Against a Real bridgelet-sdk Instance

### Prerequisites

1. **bridgelet-sdk** running locally:

   ```bash
   cd /path/to/bridgelet-sdk
   cp .env.example .env.local
   # Set STELLAR_NETWORK=testnet and a funded testnet account keypair
   npm run start:dev
   # SDK will be available at http://localhost:3001
   ```

2. **Stellar testnet account** with test XLM (get free testnet XLM at [friendbot](https://friendbot.stellar.org)).

3. **Environment variables** in `e2e/.env` (create this file, it is gitignored):

   ```env
   E2E_USE_MOCKS=false
   E2E_API_BASE_URL=http://localhost:3001
   E2E_BASE_URL=http://localhost:3000
   ```

4. Run tests:

   ```bash
   cd e2e
   npm test
   ```

### With bridgelet-core (Soroban contracts)

For full cross-layer testing with the smart contracts:

1. Deploy `bridgelet-core` contracts to Stellar testnet: see [bridgelet-core README](https://github.com/bridgelet-org/bridgelet-core).
2. Configure `bridgelet-sdk` with the deployed contract address in its `.env`.
3. The e2e tests exercise the same HTTP API surface regardless of whether the SDK is backed by real contracts or its own internal logic.

---

## Test Modes

| Mode | `E2E_USE_MOCKS` | `E2E_API_BASE_URL` | What it tests |
|---|---|---|---|
| **MSW mocked** (default) | `true` | not set | Frontend routing, UI state machines, error handling |
| **SDK integration** | `false` | `http://localhost:3001` | Frontend ↔ bridgelet-sdk API contract |
| **Full e2e** | `false` | `http://localhost:3001` | All three layers + Stellar testnet |

---

## Useful Commands

```bash
# Run tests with interactive Playwright UI (shows browser, timeline, etc.)
npm run test:ui

# Debug a specific test step-by-step
npm run test:debug -- tests/failure-paths.spec.ts

# View the HTML report from the last run
npm run test:report

# Run a single test file
npx playwright test tests/happy-path.spec.ts

# Run tests matching a name pattern
npx playwright test -g "expired"

# Run with verbose output
npx playwright test --reporter=list
```

---

## CI

The e2e tests run as a **separate, scheduled workflow** (`.github/workflows/e2e.yml`) rather than blocking every PR, because:

- The full suite requires either MSW mocking (fast, ~60 s) or real testnet accounts (slow, ~5 min).
- Cross-repo dependency setup (bridgelet-sdk + testnet) is expensive to reproduce on every commit.

The scheduled job runs daily and on manual dispatch. It is also triggered automatically on PRs that modify:

- `e2e/**`
- `frontend/app/**`
- `frontend/components/**`
- `frontend/lib/**`
- `frontend/mocks/**`

See `.github/workflows/e2e.yml` for the full workflow definition.

---

## Troubleshooting

### `Error: No tests found`

Make sure you are running `npm test` from the `e2e/` directory, not the repo root.

### `Error: connect ECONNREFUSED localhost:3000`

The Next.js dev server is not running. Either:
- Let Playwright start it: run `npm test` (it starts the server automatically).
- Start it manually: `cd ../frontend && npm run dev`, then run `npm test` again.

### Test fails with `element not found` on the claim page

The claim page renders a loading spinner while `POST /claims/verify` resolves.
Make sure the test calls `claimPage.waitForClaimCard()` before asserting UI state.

### Playwright browser not installed

```bash
cd e2e
npx playwright install --with-deps chromium
```

### Trace files for debugging failures

Playwright saves trace files on the first retry of a failed test. View them:

```bash
npx playwright show-trace ../frontend/test-results/<test-name>/trace.zip
```
