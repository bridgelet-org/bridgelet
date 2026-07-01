# Playwright Browser E2E Testing Standards

Our frontend functional execution flows are guarded via automated Playwright UI verification suites to intercept interface breaking changes.

## Core Best Practices
* **Test Attribute Selectors:** Use explicit `data-testid` properties inside JSX code structures rather than styling classes to prevent UI refactoring breaks.
* **Deterministic Isolation:** Ensure testing targets interact against stable staging servers or mock environment routes (`/claim/test-token`) to prevent external ledger dependencies from destabilizing CI test performance.