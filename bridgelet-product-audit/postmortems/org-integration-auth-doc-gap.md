# Issue #323: Option A (API Key) Auth Path Lacking Its Own Integration Guide

**Status:** Open
**Severity:** Medium
**Author:** temiport25
**Date:** 2026-07-28

## Summary

The `docs/sender-auth-model.md` document explicitly describes two authentication paths — Option A (API key based) and Option B (OAuth / token based) — and states that Option A should be "documented separately in an integration guide." As of this audit, **that integration guide does not exist.** The auth model document itself is the only authoritative source for Option A, and it was written as a design document, not a step-by-step integration guide.

## Why This Matters

An authentication path without its own integration guide creates several problems:

- **Developer friction:** Integrators choosing the API key path have no dedicated walkthrough. They must reverse-engineer the expected behavior from `sender-auth-model.md`, which was written for internal design discussion, not external consumption.
- **Inconsistent implementations:** Without a guide specifying exact header formats, error codes, rate limits, and retry behavior, each integration team will make different assumptions.
- **Security risk:** API key authentication has specific security requirements (key rotation, scoping, secure storage). A missing guide means these requirements are not surfaced to integrators at the point of need.
- **Broken promise in documentation:** The auth model document promises a separate guide. When integrators follow the reference and find nothing, it undermines trust in the rest of the documentation.

## Current State

### What `sender-auth-model.md` Covers

The auth model document describes:

- The two authentication options (A and B) and when each applies.
- The general flow for API key authentication under Option A.
- The note that Option A requires a separate integration guide.

### What Is Missing

The following content would be expected in an Option A integration guide but does not exist anywhere:

| Topic | Status |
|---|---|
| Step-by-step setup instructions | Missing |
| API key format and header specification | Partially covered in auth model, not in guide form |
| Key rotation procedure | Not documented |
| Rate limiting behavior for API key requests | Not documented |
| Error codes and troubleshooting | Not documented |
| Scoping and permissions model | Not documented |
- Example request/response pairs | Not documented |
| Testing and sandbox instructions | Not documented |

## Risk Assessment

| Factor | Detail |
|---|---|
| Likelihood of impact | High — any integrator choosing Option A will hit this gap |
| Impact of gap | Medium — developers can still reverse-engineer from source, but at significant cost |
| Detection difficulty | Low — the auth model document explicitly calls out the gap |
| Remediation effort | Medium — requires authoring a standalone guide from existing code and design docs |

## Downstream Impact

The missing guide does not exist in a vacuum. Its absence ripples into several areas:

- **Partner integrations:** Third-party teams building integrations against the API key path have no reference. They must either ask the bridgelet team directly or reverse-engineer the auth flow from source code.
- **SDK consumers:** Developers using `bridgelet-sdk` may encounter API key auth as a configuration option but have no documentation on how to set it up correctly.
- **Internal consistency:** The `sender-auth-model.md` file is referenced by multiple internal documents. Those references assume the guide exists, creating a chain of broken dependencies.
- **Compliance and security reviews:** Auditors reviewing the auth model will flag the missing guide as a documentation control gap, especially for API key rotation and scoping.

## Recommended Actions

1. **Create the guide.** Author `docs/integration-guide-api-key-auth.md` (or similar) covering all topics listed in the table above. The auth model document itself provides the design rationale; the new guide should provide the operational details.
2. **Cross-reference bidirectionally.** Update `sender-auth-model.md` to link to the new guide where it currently says "documented separately." The new guide should also link back to the auth model for design context.
3. **Review with a sample integration.** Before publishing, walk through the guide with a real or simulated integration to verify completeness and accuracy.
4. **Add to audit scope.** Future audits should verify that referenced-but-not-yet-created documents have been delivered.
5. **Consider Option B parity.** Check whether Option B (OAuth / token) also has a standalone guide. If not, the same gap applies and should be addressed in the same effort.
6. **Establish a document-tracker convention.** Any future design document that promises a follow-up guide should create a tracking issue or placeholder file so that the gap is visible to project management.

## Code / File References

- `docs/sender-auth-model.md` — The auth model document that defines both Option A and Option B, and that explicitly calls for a separate Option A guide.
- `bridgelet/src/auth/` or `bridgelet-core/src/auth/` — Likely location of the API key authentication implementation (exact path not confirmed during audit).
- `bridgelet-product-audit/glossary/org-integration-api-key-model.md` — Detailed notes on the API key authentication model (see Related Documents below).

## Related Documents

- `bridgelet-product-audit/glossary/org-integration-api-key-model.md` — Companion document analyzing the API key authentication model in detail. This postmortem summarizes the documentation gap; the glossary document provides the full technical analysis.
- `bridgelet-product-audit/postmortems/frd-and-technical-spec-overlap-unverified.md` — Another documentation consistency issue identified in the same audit.
- `bridgelet-product-audit/postmortems/custodial-model-terminology-scope.md` — A cross-repo terminology gap that, like this issue, stems from documentation not keeping pace with implementation.
- `bridgelet-product-audit/postmortems/claim-error-message-specificity-unverified.md` — A cross-repo consistency issue that, like this one, was identified but not fully resolved during the audit.
