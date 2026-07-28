# Issue #322: What "Custodial Model" Means Across Three Repos

**Status:** Open
**Severity:** High
**Author:** temiport25
**Date:** 2026-07-28

## Summary

The term **"Custodial Model"** is defined in `docs/GLOSSARY.md` and is used across three repositories — `bridgelet-core`, `bridgelet-sdk`, and `bridgelet` — but each repo implements or refers to it differently. The product audit identified this divergence but was not able to fully reconcile the three implementations into a single coherent definition.

## Why This Matters

A shared glossary term that means different things in different codebases creates:

- **Semantic confusion:** When `bridgelet-core` says "custodial model," developers in `bridgelet-sdk` may interpret it to mean something different. This leads to integration bugs that are hard to diagnose because both sides believe they agree on the term.
- **Incorrect documentation:** End-user guides that reference "the custodial model" may describe behavior that matches one repo's implementation but not another's.
- **Onboarding friction:** New contributors reading the glossary first will form an expectation that is violated when they read the actual code.
- **Audit blind spots:** As this audit demonstrated, term-level divergence can go undetected until cross-repo integration testing surfaces it.

## The Three Implementations

### GLOSSARY.md (Canonical Definition)

`docs/GLOSSARY.md` provides the project-wide definition of "Custodial Model." This is intended to be the single source of truth for the term's meaning. However, the glossary definition is high-level and leaves implementation details to each repo.

### bridgelet-core

`bridgelet-core` implements the custodial model at the protocol level. Key characteristics include:

- Key management and signing logic for custodial wallets.
- On-chain transaction construction and submission.
- Account state tracking.

The core implementation may enforce constraints (e.g., key rotation policies, transaction limits) that are considered part of the custodial model but are not reflected in the other repos.

### bridgelet-sdk

`bridgelet-sdk` exposes the custodial model as a developer-facing API. The SDK abstracts away core-level details and presents a simplified interface. This abstraction may:

- Hide certain custodial behaviors (e.g., key rotation) behind convenience methods.
- Use different terminology for the same operations (e.g., "sign" vs. "authorize").
- Impose additional constraints or validations not present in core.

### bridgelet (Application Layer)

The `bridgelet` repo is the end-user-facing application. It consumes `bridgelet-sdk` and presents custodial model features through UI and API endpoints. The application layer may:

- Bundle multiple custodial operations into single user-facing actions.
- Add application-specific business rules on top of the SDK.
- Use UI labels that do not map one-to-one to SDK or core concepts.

## Risk Assessment

| Factor | Detail |
|---|---|
| Likelihood of divergence | Confirmed — the audit found differences across all three repos |
| Impact of divergence | High — incorrect assumptions about custodial behavior can lead to security-relevant bugs |
| Detection difficulty | Medium — requires cross-repo code review and integration testing |
| Remediation effort | Medium — requires a reconciliation workshop and glossary update |

## Recommended Actions

1. **Reconciliation session.** Bring together maintainers from `bridgelet-core`, `bridgelet-sdk`, and `bridgelet` to align on a single, precise definition of "Custodial Model" that covers all three layers.
2. **Layered glossary.** Extend `docs/GLOSSARY.md` to include per-layer descriptions:
   - Protocol-level (core): what the custodial model means for on-chain operations.
   - API-level (SDK): what the custodial model exposes to developers.
   - Application-level (bridgelet): what the custodial model means to end users.
3. **Cross-reference from each repo.** Each repo's README or local glossary should reference the canonical definition and explicitly state how its implementation relates to it.
4. **Integration tests.** Add tests that verify custodial model behavior is consistent across all three layers (e.g., a key rotation initiated via the SDK is correctly reflected in core and visible in the application).
5. **Audit checklist update.** Future audits should verify that glossary terms have consistent implementations across all repos.

## Code / File References

- `docs/GLOSSARY.md` — Canonical definition of "Custodial Model" (first 60 lines reviewed during audit).
- `bridgelet-core/src/` — Core implementation of custodial model (specific files not enumerated in this audit).
- `bridgelet-sdk/src/` — SDK abstraction of custodial model.
- `bridgelet/src/` — Application-layer implementation.
- `bridgelet-product-audit/glossary/custodial-model-in-practice.md` — Detailed notes on how the custodial model is implemented across repos (see Related Documents below).

## Related Documents

- `bridgelet-product-audit/glossary/custodial-model-in-practice.md` — Companion document with a detailed breakdown of custodial model implementation differences across the three repos. This postmortem summarizes the findings; the glossary document provides the full analysis.
- `bridgelet-product-audit/postmortems/frd-and-technical-spec-overlap-unverified.md` — Another instance of cross-document consistency issues within the bridgelet project.
- `bridgelet-product-audit/postmortems/org-integration-auth-doc-gap.md` — Illustrates the broader pattern of documentation gaps in the project.
- `bridgelet-product-audit/postmortems/claim-error-message-specificity-unverified.md` — Cross-repo consistency concern in error handling.
