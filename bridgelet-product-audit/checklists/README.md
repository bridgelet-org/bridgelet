# Checklists Index

This directory contains structured checklists for product audits, security reviews, and maintenance tasks. All checklists follow the literal-checkbox format (`- [ ] Item`) to maintain consistency across the repository.

## One-time (Onboarding/Readiness) Checklists
Use these during initial setup, before major releases, or when onboarding new infrastructure:

- **[LocalStorage Data Exposure Review Checklist](localstorage-data-exposure-checklist.md)** — Use this when implementing or modifying wallet persistence to ensure no sensitive data is stored in localStorage, and all client-side storage usage is accounted for and secure.
- **[Wallet Connection Review Checklist](wallet-connection-review-checklist.md)** — Use this before a major release to verify all three wallet connection types (Freighter, LOBSTR, generated) work as documented, with proper error handling and cross-consistency across the codebase.

## Recurring (Periodic Review) Checklists
Use these on a regular cadence to maintain product health and documentation accuracy:

- **[Documentation Freshness Checklist](docs-freshness-checklist.md)** — Use this bi-annually (June and December) to audit all documentation in the `docs/` directory, verify MDX/PDF file pairs are in sync, and ensure all content remains accurate and up-to-date.