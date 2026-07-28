# Issue #324: Whether Claim-Flow Error Messages Preserve Specific On-Chain Failure Reasons

**Status:** Open
**Severity:** Medium
**Author:** temiport25
**Date:** 2026-07-28

## Summary

The `integration-notes/three-repo-error-surface-consistency.md` document reveals that the claim flow across `bridgelet-core`, `bridgelet-sdk`, and `bridgelet` uses a `??` (nullish coalescing) fallback pattern when propagating error messages. This pattern can collapse specific on-chain failure reasons into generic messages by the time they reach the end user. **This behavior was not verified end-to-end** during the product audit.

## Why This Matters

When a claim transaction fails on-chain, the failure reason is often highly specific — insufficient funds, contract revert with a reason string, nonce collision, slippage exceeded, etc. These specific reasons are critical for:

- **User debugging:** End users need to know *why* their claim failed so they can take corrective action (e.g., add funds, retry later, adjust parameters).
- **Support triage:** Support teams rely on error message specificity to diagnose issues without requiring users to provide transaction hashes and chain-level traces.
- **Developer debugging:** Integration developers using the SDK need granular errors to build resilient retry and fallback logic.
- **Monitoring and alerting:** Specific error strings enable meaningful alerting rules (e.g., alert on "nonce collision" but not on "transaction failed").

If the `??` fallback replaces specific messages with generic ones (e.g., "Claim failed" instead of "Claim failed: insufficient balance for protocol fee"), the entire error signaling chain is degraded.

## The `??` Fallback Pattern

The three-repo error surface consistency document identifies a pattern where each layer in the call chain uses nullish coalescing to provide a default error message:

```
// Hypothetical representation of the pattern at each layer
const message = error?.reason ?? error?.message ?? "Claim failed";
```

This means:

1. **bridgelet-core** produces a specific error (e.g., `{ reason: "InsufficientBalance", detail: "protocol fee requires 0.5 XLM, account has 0.1 XLM" }`).
2. **bridgelet-sdk** receives the error but accesses only `error.message`, which may be undefined for structured errors, and falls back to a generic string.
3. **bridgelet** (application) receives the SDK error and applies another `??` fallback, further degrading specificity.

Each layer's fallback is individually reasonable (it prevents `undefined` from reaching the user), but the cumulative effect is that specificity is lost at every boundary crossing.

## What Was Not Verified

The audit identified the pattern but did not perform the following:

1. **End-to-end tracing:** No test was run that produced a specific on-chain failure and traced the error message through all three layers to confirm whether specificity was preserved.
2. **Fallback inventory:** No comprehensive list was made of all places in the codebase where `??` is used for error propagation.
3. **Structured error contract:** No verification that the three repos agree on a structured error type (with `reason`, `detail`, `code`, etc.) versus relying on plain strings.
4. **User-facing message audit:** No review of the actual messages displayed to end users in the bridgelet UI for claim failures.

## Risk Assessment

| Factor | Detail |
|---|---|
| Likelihood of specificity loss | High — the `??` pattern guarantees fallback when upstream does not set `.message` |
| Impact on users | Medium — users see generic errors and cannot self-service |
| Impact on support | Medium — support tickets increase because users cannot diagnose issues |
| Detection difficulty | Low — an end-to-end test with a deliberate failure would confirm or deny |
| Remediation effort | Medium — requires establishing a structured error contract and updating each layer |

## Recommended Actions

1. **End-to-end error tracing test.** Write a test that triggers a known on-chain failure (e.g., insufficient balance) and asserts that the specific reason string is visible in the application-layer response or UI.
2. **Structured error contract.** Define a shared error type across all three repos (e.g., `BridgeletError { code: string; reason: string; detail: string; }`) and require that each layer propagates the full structure, not just a string.
3. **Audit all `??` fallback sites.** Grep the three repos for `??` patterns in error-handling paths and evaluate each one: does the fallback obscure useful information?
4. **Layered error messages.** Implement a convention where each layer *wraps* the upstream error rather than replacing it:
   ```typescript
   throw new BridgeletError({
     code: "CLAIM_FAILED",
     upstream: error,  // preserve the original
     message: `Claim failed: ${error.reason}`
   });
   ```
5. **User-facing message review.** Audit the bridgelet UI to confirm that claim failure messages shown to users include actionable details.
6. **Add to CI.** Add a CI check that flags new `??` usage in error-handling code paths for manual review.

## Code / File References

- `bridgelet-product-audit/integration-notes/three-repo-error-surface-consistency.md` — The document that identified the `??` fallback pattern and its impact on error message specificity.
- `bridgelet-core/src/` — Core claim logic that produces initial error objects.
- `bridgelet-sdk/src/` — SDK layer that receives and propagates (or degrades) errors.
- `bridgelet/src/` — Application layer that renders error messages to end users.
- Specific line numbers and file paths were not captured during the audit; a follow-up grep for `??` in error paths is recommended.

## Related Documents

- `bridgelet-product-audit/integration-notes/three-repo-error-surface-consistency.md` — The source document for this finding. It contains the detailed analysis of how errors flow across the three repos. This postmortem summarizes the finding and adds recommended actions.
- `bridgelet-product-audit/postmortems/custodial-model-terminology-scope.md` — Another cross-repo consistency issue, focused on terminology rather than error handling.
- `bridgelet-product-audit/postmortems/org-integration-auth-doc-gap.md` — A documentation gap issue that, like this one, was identified during the same audit cycle.
- `bridgelet-product-audit/postmortems/frd-and-technical-spec-overlap-unverified.md` — A documentation overlap issue from the same audit.
