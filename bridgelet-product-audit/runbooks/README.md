# Runbooks Index

This directory contains operational runbooks for incident response, diagnostics, and maintenance procedures. Runbooks describe current behavior and workarounds, not proposed code changes. They are designed to be quickly scannable during live support escalations.

## User Support Triage
Use these to diagnose and resolve user-reported issues:

- **[Diagnose Wallet Connection Failure](diagnose-wallet-connection-failure.md)** — Use when a user reports they cannot connect their Freighter wallet; walks through checking extension installation, popup blockers, and cross-browser issues.
- **[Diagnose LOBSTR Connection Confusion](diagnose-lobstr-connection-confusion.md)** — Use when a user reports the LOBSTR connection "doesn't work"; explains the expected unimplemented state and provides the manual paste workflow workaround.
- **[Diagnose Generated Wallet Support Request](diagnose-generated-wallet-support-request.md)** — Use if support requests arise about the client-side generated wallet feature (currently unused in the UI).
- **[Clear Stale Persisted Wallet](clear-stale-persisted-wallet.md)** — Use when a user reports seeing the wrong wallet address or being unexpectedly connected; walks through clearing stale localStorage wallet data.
- **[Verify Claim URL Before Support Escalation](verify-claim-url-before-onchain-state.md)** — Use to validate a user's claim link before escalating issues with claim processing.
- **[Cross-Check Claim Error Against Onchain State](cross-check-claim-error-against-onchain-state.md)** — Use to reconcile frontend claim errors with actual blockchain state when debugging failed claims.

## Engineering Diagnostics
Use these to investigate technical issues and gaps in implementation:

- **[Investigate Analytics Event Gap](investigate-analytics-event-gap.md)** — Use when analytics events are reported as missing; verifies the event's expected trigger condition and distinguishes between chain-waiting vs. immediate events.
- **[Audit Lighthouse Scores](audit-lighthouse-scores.md)** — Use to review performance, accessibility, and best practices metrics from Lighthouse CI runs.
- **[PDF Artifact Freshness Spot Check](pdf-artifact-freshness-spot-check.md)** — Use to verify that PDF exports in the docs directory match their source MDX files and haven't drifted apart.

## Repository Maintenance
Use these for ongoing repository health and compliance tasks:

- **[Rebuild Docs PDF from MDX](rebuild-docs-pdf-from-mdx.md)** — Use after updating MDX documentation sources to regenerate their corresponding PDF exports.
- **[Review Analytics Spec Before New Event](review-analytics-spec-before-new-event.md)** — Use before adding a new analytics event to ensure it aligns with the existing specification and event naming conventions.
- **[Onboard Mobile App to CI](onboard-mobile-app-to-ci.md)** — Use to set up continuous integration for the mobile application, including test runs and deployment pipelines.
- **[Verify Branch Protection Compliance](verify-branch-protection-compliance.md)** — Use to confirm repository branch protection rules match the documented requirements in `.github/BRANCH_PROTECTION.md`.
- **[Security Disclosure Triage (Product)](security-disclosure-triage-product.md)** — Use to triage incoming security vulnerability reports, verify they came through approved channels, and route them to the correct team for remediation.