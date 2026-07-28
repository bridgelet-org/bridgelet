# Bridgelet Testing Documentation

This document provides comprehensive testing guidelines for the Bridgelet project, covering the frontend web app, mobile app, and SDK integration. It includes testing strategies, tooling setup, and best practices for contributors.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Categories](#test-categories)
3. [Test Coverage Overview](#test-coverage-overview)
4. [Frontend Testing](#frontend-testing)
   - [MSW Mock Service Worker](#msw-mock-service-worker)
   - [Unit and Component Tests](#unit-and-component-tests)
   - [Playwright E2E Tests](#playwright-e2e-tests)
   - [Storybook Visual Testing](#storybook-visual-testing)
   - [Lighthouse CI Performance Audits](#lighthouse-ci-performance-audits)
5. [Mobile Testing](#mobile-testing)
6. [Unit Tests](#unit-tests)
7. [Integration Tests](#integration-tests)
8. [End-to-End (E2E) Tests](#end-to-end-e2e-tests)
9. [Manual Testing](#manual-testing)
10. [Testing Against Live Testnet](#testing-against-live-testnet)
11. [Testing with Mock Data](#testing-with-mock-data)
12. [Test Data Requirements](#test-data-requirements)
13. [Release Testing Checklist](#release-testing-checklist)
14. [Troubleshooting Guide](#troubleshooting-guide)
15. [Contributing Tests](#contributing-tests)

## Testing Philosophy

The Bridgelet testing strategy is built on multiple layers of validation to ensure reliability, security, and correctness of the ephemeral account system. Our approach emphasizes:

- **Security First:** All financial interactions are thoroughly tested to prevent vulnerabilities
- **Deterministic Testing:** Tests should be reproducible and not dependent on external state
- **Clear Boundaries:** Each test category has a specific scope and responsibility
- **Coverage Goals:** Aim for >80% code coverage on critical paths (SDK, smart contracts)
- **Representative Data:** Test data should reflect real-world usage patterns

## Test Coverage Overview

The table below maps each part of the codebase to the testing tools and the current status of that coverage.

| Area | Tool(s) | Scope | Status |
|---|---|---|---|
| Frontend components | Vitest + React Testing Library | Unit / component rendering | 🔲 Planned |
| Frontend API layer | MSW v2 | Network mock in dev and tests | ✅ Mock handlers implemented |
| Frontend E2E flows | Playwright | Full browser user journeys | ✅ Configured (smoke suite) |
| Frontend visual regression | Storybook + Chromatic | Component story snapshots | 🔲 Planned |
| Frontend performance | Lighthouse CI | Core Web Vitals, accessibility score | 🔲 Planned |
| Mobile unit tests | Jest + jest-expo | Component and utility logic | ⚠️ Runner configured, no test files yet |
| SDK unit tests | Jest | Core account / payment logic | 🔲 Planned |
| SDK integration tests | Jest + Stellar testnet | Blockchain interactions | 🔲 Planned |
| E2E system tests | Playwright | End-to-end cross-layer flows | 🔲 Planned |

Legend: ✅ In place · ⚠️ Partially set up · 🔲 Planned

> Coverage thresholds are not yet enforced in CI. The target is **≥ 80 %** on critical paths once the unit test suites are stable. See [BRANCH_PROTECTION.md](.github/BRANCH_PROTECTION.md) for the CI gate policy.

---

## Frontend Testing

The frontend lives in `frontend/` and is a Next.js 16 App Router application written in TypeScript. Its testing stack is being built incrementally; this section documents both what is already in place and what to add next.

### MSW Mock Service Worker

[Mock Service Worker (MSW) v2](https://mswjs.io/) intercepts `fetch` and XHR calls at the network level. The frontend ships a fully implemented set of handlers used for local development and, once a test runner is wired up, for component and integration tests as well.

#### Handler inventory

| Handler file | Method + URL | What it mocks |
|---|---|---|
| `mocks/handlers/accounts.ts` | `POST /api/accounts` | Creates a fake ephemeral Stellar account; 300 ms delay |
| `mocks/handlers/claims.ts` | `POST /claims/redeem` | Returns a stubbed claim/sweep response |
| `mocks/handlers/horizon.ts` | `GET https://horizon-testnet.stellar.org/fee_stats` | Testnet fee statistics |
| `mocks/handlers/horizon.ts` | `GET https://horizon-testnet.stellar.org/accounts/:id` | Testnet account with 10 000 XLM balance |

#### Activating MSW in development

The worker is **not** started automatically. Add the following to `app/layout.tsx` (or your top-level client component) to activate it in development:

```tsx
// app/layout.tsx
if (process.env.NODE_ENV === 'development') {
  const { initMocks } = await import('@/mocks');
  await initMocks();
}
```

`initMocks()` is a no-op in SSR contexts (`typeof window === 'undefined'` guard is already in place).

#### Running MSW in tests

When Vitest (or Jest) is added to the frontend, use `msw/node` for a server-side handler instead of the browser service worker:

```ts
// tests/setup.ts
import { server } from '@/mocks/server'; // create this file — see below

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Create `frontend/mocks/server.ts` alongside `browser.ts`:

```ts
// frontend/mocks/server.ts
import { setupServer } from 'msw/node';
import { accountHandlers } from './handlers/accounts';
import { claimsHandlers } from './handlers/claims';
import { horizonHandlers } from './handlers/horizon';

export const server = setupServer(
  ...accountHandlers,
  ...claimsHandlers,
  ...horizonHandlers,
);
```

To override a handler for a single test:

```ts
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';

it('shows an error when account creation fails', async () => {
  server.use(
    http.post('/api/accounts', () =>
      HttpResponse.json({ error: 'Service unavailable' }, { status: 503 }),
    ),
  );

  // render and assert...
});
```

#### Known issue — missing import in `browser.ts`

`frontend/mocks/browser.ts` uses `horizonHandlers` but the import line is missing. Add it:

```ts
import { horizonHandlers } from './handlers/horizon';
```

---

### Unit and Component Tests

The frontend does not yet have a unit test runner configured. The recommended setup uses **Vitest** (fast, native ESM, shares the TypeScript config) together with **React Testing Library**.

#### Setup

```bash
cd frontend
npm install --save-dev vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom
```

Add a `vitest.config.ts` at `frontend/`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, branches: 80, functions: 80 },
      exclude: ['**/node_modules/**', '**/mocks/**', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

Add the test script to `frontend/package.json`:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

#### Running tests

```bash
# Single run (used in CI)
npm test

# Watch mode for local development
npm run test:watch

# With coverage report
npm run test:coverage
```

---

### Playwright E2E Tests

Playwright drives a real browser against `http://localhost:3000`. Use it for critical user journeys: navigation, sender flow, claim flow, and error paths.

#### Location

| Path | Purpose |
|---|---|
| `frontend/playwright.config.ts` | Base config (`baseURL` → `localhost:3000`) |
| `frontend/e2e/*.spec.ts` | Browser specs (smoke suite today) |
| `docs/testing/E2E_GUIDELINES.md` | Selector and isolation standards |

#### One-time browser install

```bash
cd frontend
npx playwright install --with-deps chromium
```

#### Running Playwright tests

```bash
cd frontend

# Headless — starts `next dev` automatically (or reuses a running server)
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# Single file
npx playwright test e2e/home.spec.ts

# Debug mode (pauses on each step)
npx playwright test --debug
```

Locally, `webServer` runs `npm run dev` and reuses an existing server when present. In CI (`CI=true`), it runs `npm run start` against the **built** Next.js app (the workflow runs `npm run build` first).

#### Writing tests

Place new specs in `frontend/e2e/`. Prefer role/label/`data-testid` selectors over CSS classes — see [E2E Guidelines](docs/testing/E2E_GUIDELINES.md).

```ts
// e2e/home.spec.ts
import { test, expect } from '@playwright/test';

test('loads the homepage', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /bridgelet payment flows/i }),
  ).toBeVisible();
});
```

Deeper send/claim journeys that depend on wallets or the API should stay deterministic (mocked routes or sandbox pages) so CI does not hit live Stellar.

#### CI integration

`.github/workflows/frontend-ci.yml` builds the app, installs Chromium, then runs `npm run test:e2e` with `CI=true` so Playwright serves the production build via `next start`. On failure, the Playwright HTML report is uploaded as an artifact.

---

### Storybook Visual Testing

Storybook documents UI components in isolation and enables visual regression testing via [Chromatic](https://www.chromatic.com/).

#### Setup

```bash
cd frontend
npx storybook@latest init
# Choose: Next.js, TypeScript, no ESLint extension
```

This creates `.storybook/` with `main.ts` and `preview.ts`, and adds Storybook scripts to `package.json`.

#### Writing stories

Create a story file alongside each component, e.g. `components/share-prompt.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { SharePrompt } from './share-prompt';

const meta: Meta<typeof SharePrompt> = {
  title: 'Components/SharePrompt',
  component: SharePrompt,
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof SharePrompt>;

export const Default: Story = {
  args: {
    claimUrl: 'https://bridgelet.app/claim/abc123',
  },
};

export const LongUrl: Story = {
  args: {
    claimUrl: 'https://bridgelet.app/claim/' + 'x'.repeat(64),
  },
};
```

Cover the main components:

| Component | Story variants to add |
|---|---|
| `ClaimStatusCard` | loading, success, expired, error |
| `SharePrompt` | default, long URL, copied state |
| `WalletConnect` | disconnected, connecting, connected |
| `SendForm` steps | connect, details, confirm |
| `Logo` | light, dark |
| `PageShell` | default layout |

#### Running Storybook

```bash
# Start dev server at http://localhost:6006
npm run storybook

# Build a static version
npm run build-storybook
```

#### Visual regression with Chromatic

```bash
npm install --save-dev chromatic
npx chromatic --project-token=<your-token>
```

Add to CI:

```yaml
- name: Publish to Chromatic
  run: npx chromatic --project-token=${{ secrets.CHROMATIC_PROJECT_TOKEN }}
  working-directory: frontend
```

Chromatic compares component snapshots on each PR. Reviewers approve or reject visual diffs in the Chromatic dashboard before merging.

---

### Lighthouse CI Performance Audits

Lighthouse CI runs Google Lighthouse against the built app on every pull request and push to main, enforcing strict minimum scores for performance, accessibility, and best practices.

#### Setup

The configuration is already present in `frontend/lighthouserc.js` and the workflow in `.github/workflows/lighthouse-ci.yml`.

#### Running Locally

You can run the Lighthouse checks locally before pushing to catch regressions early:

```bash
cd frontend
npm install
npm run build
npm run lhci
```

#### Score thresholds

| Category | Error threshold (Minimum Score) |
|---|---|
| Performance | 85 |
| Accessibility | 95 |
| Best Practices | 90 |

**Any score dropping below these thresholds will block the CI job (fail the build).** If you see a CI failure, review the output logs or the temporary public storage link for a detailed Lighthouse report to fix the issues.

---

## Mobile Testing

The mobile app lives in `mobile/` and uses Expo + React Native. Jest is already configured.

### Running mobile tests

```bash
cd mobile
npm test                    # single run with coverage
npm test -- --watch         # watch mode
npm test -- --testPathPattern="ComponentName"   # single file
```

### Jest configuration

`mobile/jest.config.js` uses the `jest-expo` preset which handles Babel transforms for React Native packages. Coverage is collected from all `*.ts` and `*.tsx` files.

```js
// mobile/jest.config.js (current)
module.exports = {
  preset: 'jest-expo',
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],
};
```

Place test files next to the source files or in `__tests__/` directories:

```
mobile/
  app/
    (onboarding)/
      index.tsx
      __tests__/
        index.test.tsx
  components/
    my-component.tsx
    my-component.test.tsx
```

---

## Test Categories

Bridgelet employs a multi-tiered testing strategy across the frontend, mobile, and SDK layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    End-to-End Tests (E2E)                   │
│              Full user flows across all systems              │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│             Integration Tests (SDK + Blockchain)             │
│         Tests SDK with real/mock Stellar interactions        │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│                    Unit Tests (Isolated)                     │
│         Individual functions, methods, and components        │
└─────────────────────────────────────────────────────────────┘
```

### Unit Tests (SDK Repository)

**Scope:** Individual functions and methods in isolation

**Location:** `bridgelet-sdk/src/**/*.spec.ts`

**Coverage Areas:**

- Account creation logic
- Payment processing
- Claim validation
- Cryptographic operations
- Data validation and sanitization
- Error handling paths

**Tools & Frameworks:**

- Jest for test runner
- TypeScript for type safety
- Mocking libraries (ts-mockito, jest.mock)

**Example Test Structure:**

```typescript
describe("AccountService", () => {
  describe("createEphemeralAccount", () => {
    it("should generate a valid Stellar keypair", () => {
      // Test keypair generation
    });

    it("should reject invalid configuration", () => {
      // Test input validation
    });

    it("should handle cryptographic errors gracefully", () => {
      // Test error handling
    });
  });
});
```

### Integration Tests (SDK + Blockchain)

**Scope:** SDK interactions with Stellar blockchain (testnet)

**Location:** `bridgelet-sdk/tests/integration/**`

**Coverage Areas:**

- Account creation on testnet
- Smart contract interactions
- Payment submission and validation
- Fund sweeping operations
- Testnet state transitions
- Transaction confirmation

**Setup Requirements:**

- Testnet node access
- Test account funding
- Smart contract deployment
- Environment variables for testnet RPC

### End-to-End Tests (E2E)

**Scope:** Complete user workflows from claim to fund sweep

**Location:** `bridgelet-sdk/tests/e2e/**`

**Coverage Areas:**

- Full payment initialization workflow
- Account claiming process
- Fund distribution and sweep
- Expiration and recovery flows
- Multi-recipient scenarios
- Edge cases and error recovery

**Environment:**

- Testnet for blockchain operations
- Test database with clean state
- Mock payment processor (optional)

### Manual Testing

**Scope:** User acceptance testing and exploratory testing

**When to Use:**

- Before release candidate creation
- Testing new features requiring user interaction
- Exploratory testing for edge cases
- UI/UX validation
- Manual security review

**Manual Test Scenarios:**

- Account creation and ownership verification
- Claim flow with various wallet types
- Payment settlement timing
- Fund recovery after expiration
- Error message clarity

## Unit Tests

### Writing Unit Tests

1. **Use descriptive names:**

   ```typescript
   it("should return 404 when account does not exist", () => {
     // Implementation
   });
   ```

2. **Follow AAA Pattern (Arrange, Act, Assert):**

   ```typescript
   it("should calculate sweep amount correctly", () => {
     // Arrange
     const balance = 1000;
     const fee = 0.01;

     // Act
     const sweepAmount = calculateSweepAmount(balance, fee);

     // Assert
     expect(sweepAmount).toBe(999.99);
   });
   ```

3. **Mock external dependencies:**
   ```typescript
   it("should log account creation", () => {
     // Mock the logger
     const loggerSpy = jest.spyOn(logger, "info");

     createAccount();

     expect(loggerSpy).toHaveBeenCalledWith("Account created");
   });
   ```

### Running Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- AccountService.spec.ts

# Run with coverage report
npm test -- --coverage
```

## Integration Tests

### Setting Up Integration Tests

/// To be updated later

### Integration Test Patterns

/// Not enough information

## End-to-End (E2E) Tests

### E2E Test Environment

E2E tests require a complete environment:

```
┌──────────────────────────────────┐
│  Test Client / Web Driver        │ (Puppeteer/Playwright)
└──────────────┬───────────────────┘
               │
┌──────────────▼───────────────────┐
│      Backend SDK (Test Mode)     │ (NestJS on :3001)
└──────────────┬───────────────────┘
               │
┌──────────────▼───────────────────┐
│    Stellar Testnet Blockchain    │
└──────────────────────────────────┘
```

### Running E2E Tests

```bash
cd frontend

# One-time: install Chromium for Playwright
npx playwright install --with-deps chromium

# Run the smoke suite (starts Next.js automatically)
npm run test:e2e

# Run a specific file
npm run test:e2e -- e2e/home.spec.ts
```

For full-stack journeys that need the SDK backend and Stellar testnet, start those services separately and keep browser specs deterministic (mocks/sandbox routes). See [Playwright E2E Tests](#playwright-e2e-tests) and [docs/testing/E2E_GUIDELINES.md](docs/testing/E2E_GUIDELINES.md).

## Testing Against Live Testnet

### Prerequisites

1. **Testnet Account Setup:**

   ```bash
   # Fund a testnet account using friendbot
   curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
   ```

2. **Environment Configuration:**

   ```bash
   # .env.testnet
   STELLAR_NETWORK=testnet
   STELLAR_RPC_URL=https://soroban-testnet.stellar.org
   STELLAR_ACCOUNT_SECRET=SBBB...
   TESTNET_FUNDING_AMOUNT=1000
   ```

3. **Smart Contract Deployment:**
   ```bash
   # Deploy contracts to testnet (from bridgelet-core)
   ./scripts/deploy-testnet.sh
   ```

### Testnet Testing Strategy

**Phase 1: Smoke Tests**

- Quick validation that basic operations work
- Account creation
- Simple fund transfers

**Phase 2: Functional Tests**

- Complete workflow tests
- Multiple payment scenarios
- Expiration handling

**Phase 3: Load Tests** (optional)

- Multiple concurrent transactions
- Performance baseline establishment

## Additional Resources

- [Bridgelet SDK Repository](https://github.com/bridgelet-org/bridgelet-sdk) - Test examples
- [Stellar Testing Documentation](https://developers.stellar.org/learn/fundamentals/stellar-ubiquitous-platform)
- [Jest Documentation](https://jestjs.io/)
- [Soroban Testing Guide](https://soroban.stellar.org/docs/learn/testing)

## Getting Help

- **Test Issues:** Create an issue with `[test]` label
- **Questions:** Post in Discussions
- **Security:** See [SECURITY.md](./SECURITY.md) for responsible disclosure

---

**Last Updated:** June 2026
**Maintained By:** Bridgelet Core Team
