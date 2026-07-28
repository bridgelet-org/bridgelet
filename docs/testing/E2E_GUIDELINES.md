# Playwright Browser E2E Testing Standards

Our frontend functional execution flows are guarded via automated Playwright UI verification suites to intercept interface breaking changes.

## Setup

```bash
cd frontend
npm install
npx playwright install --with-deps chromium
```

Config lives at `frontend/playwright.config.ts` and targets **`http://localhost:3000`**. Specs live in `frontend/e2e/`.

## Running

```bash
cd frontend
npm run test:e2e          # headless
npm run test:e2e:ui       # interactive
```

- **Local:** Playwright starts `npm run dev` (or reuses a server already on `:3000`).
- **CI:** After `npm run build`, Playwright starts `npm run start` so E2E runs against the **built** Next.js app.

See [TESTING.md](../../TESTING.md#playwright-e2e-tests) for the full guide.

## Core Best Practices

* **Test Attribute Selectors:** Prefer role/label queries and explicit `data-testid` properties over styling classes to prevent UI refactoring breaks.
* **Deterministic Isolation:** Interact against stable pages or mock/sandbox routes (e.g. `/claim/example-token`, `/sandbox/*`) so external ledger dependencies do not destabilize CI.
* **Smoke first:** Keep CI green with navigation and page-render smoke tests; expand wallet/API journeys behind mocks.
