# Postmortem: Mobile App `services/` Directory Only Contains Logger Implementation

## Factual Finding

During a repository structure audit, it was discovered that the mobile application's `mobile/services/` directory — which is architected to contain modular service modules for core application functionality — only has one populated subdirectory: **logger**. All other anticipated service modules (wallet integration, API client, blockchain interaction, authentication, etc.) are either missing entirely or exist only as empty placeholder directories.

## Context & Maturity Assessment

This observation has significant implications for the mobile app's current development maturity relative to the web frontend:

1. **Frontend has comprehensive service modularity**: The web frontend (`frontend/`) maintains a robust set of modular libaries and services for wallet connections, API interactions, state management, and blockchain operations — all properly factored into maintainable, single-responsibility modules.

2. **Mobile lacks equivalent service layer abstractions**: The absence of wallet, API-client, and other service modules in `mobile/services/` indicates the mobile app has not yet undergone the same architectural refactoring and modularization as the web frontend. Features that are properly separated in the web codebase may still be monolithically implemented in the mobile codebase, or have not been implemented at all.

3. **Logger as a starting point**: The existence of only the logger service suggests the mobile team prioritized foundational observability tooling first, but has not yet extended that modular architectural pattern to other critical domains like wallet connectivity, which would be necessary to achieve feature parity with the web app.

## Recommendation for Future Review

This structural gap should be revisited as part of the broader parity review outlined in `mobile-app-parity-checklist.md`. The review should specifically:
- Inventory which service modules are still missing from the mobile app's `services/` directory
- Create implementation milestones for bringing the mobile app's service architecture in line with the web frontend's modular pattern
- Track progress on this architectural debt as part of the mobile app's development roadmap to ensure it does not impede future feature development or maintainability.