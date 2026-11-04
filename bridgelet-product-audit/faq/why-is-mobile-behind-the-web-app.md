# FAQ: Why does the mobile app seem less complete than the web frontend?

**Short answer:** The mobile app (`mobile/`) is at an earlier stage of
development than the web frontend (`frontend/`). Two concrete, observable
signals confirm this as a factual current-state observation.

---

## Signal 1: The mobile app has zero CI coverage

The `.github/workflows/` directory contains two workflow files:

| Workflow | What it covers | Scoped to |
|---|---|---|
| `frontend-ci.yml` | Lint, type-check, unit tests, build, Playwright e2e | `frontend/` |
| `lighthouse-ci.yml` | Lighthouse performance audit | `frontend/` |

Neither workflow references `mobile/` in any way. This means lint regressions,
type errors, and unit test failures in the mobile codebase merge uncaught,
there is no automated gate.

This is documented in full in
[`postmortems/mobile-app-zero-ci-coverage.md`](../postmortems/mobile-app-zero-ci-coverage.md),
including the risk assessment and a recommended fix (creating
`.github/workflows/mobile-ci.yml`).

---

## Signal 2: Only one `services/` subdirectory is populated

The `mobile/services/` directory, the layer that would connect the mobile UI
to the Bridgelet backend SDK, contains only a `logger/` subdirectory. The
services needed to create accounts, validate claim tokens, or execute sweeps
are not yet implemented there.

This is documented in
[`glossary/mobile-app-services-logger.md`](../glossary/mobile-app-services-logger.md).

---

## This is a factual observation, not a judgment

The gap between the two clients reflects development priorities, not a
permanent architectural decision. The web frontend was built first as the
reference implementation demonstrating SDK integration. The mobile app is
scaffolded and in progress.

**For future plans**, refer to [`ROADMAP.md`](../../ROADMAP.md), which tracks
what is planned across both clients.

---

## Specific gaps between mobile and web

A tracked list of concrete feature and infrastructure gaps is maintained in the
audit knowledge base. The key categories are:

- No CI pipeline for mobile (lint, type-check, unit tests)
- Service layer not yet wired to bridgelet-sdk
- Wallet connection flow (Freighter, LOBSTR, generated) parity with web
- No Playwright or equivalent E2E tests for mobile flows

---

## Related documents

- [`postmortems/mobile-app-zero-ci-coverage.md`](../postmortems/mobile-app-zero-ci-coverage.md)
  - full analysis of the missing CI coverage and recommendations
- [`glossary/mobile-app-services-logger.md`](../glossary/mobile-app-services-logger.md)
  - what exists today in `mobile/services/`
- [`integration-notes/mobile-app-contract-awareness.md`](../integration-notes/mobile-app-contract-awareness.md)
  - how the mobile app relates to the Soroban contract layer
- [`runbooks/onboard-mobile-app-to-ci.md`](../runbooks/onboard-mobile-app-to-ci.md)
  - step-by-step runbook for adding mobile CI
- [`ROADMAP.md`](../../ROADMAP.md): planned work across both clients

---

*Part of the bridgelet-product-audit/ knowledge-base initiative.*
