# Security Model Doc Not Cross-Checked Against Sibling Repo Findings

**Issue:** [#326](https://github.com/bridgelet-org/bridgelet/issues/326)
**Category:** Open verification task (prioritized)
**Severity:** Medium — stale security claims create false confidence

## Summary

`docs/security-model.mdx` documents Bridgelet's security architecture but was not
cross-checked against the actual findings from the sibling repo audits
(`bridgelet-core-audit`, `bridgelet-sdk-audit`). This creates a risk that the
document contains stale claims or omits findings that should be reflected in the
security narrative.

## Why This Matters

Security documentation is only useful if it accurately reflects the current state
of the system. If `security-model.mdx` claims a property that the audit found to
be weakened or absent, downstream readers (integrators, auditors, contributors)
will have a false sense of assurance.

### Precedent: stale claims found in sibling repos

This is not a theoretical concern. During the three-repo audit:

- **bridgelet-core's `docs/security.md`** was found to contain claims about
  contract behavior that had drifted from the actual implementation.
- **bridgelet-sdk's inline MVP notes** contained assertions about error handling
  that the audit contradicted.

If both sibling repos had stale security documentation, it would be surprising if
this repo's `security-model.mdx` were the sole exception — but it was not
independently verified.

## What Was and Wasn't Checked

| Aspect | Status |
|--------|--------|
| `docs/security-model.mdx` exists | ✅ Confirmed |
| High-level read for obvious staleness | ✅ Done |
| Line-by-line cross-check against core audit findings | ❌ Not done |
| Line-by-line cross-check against SDK audit findings | ❌ Not done |
| Verification of claimed security properties | ❌ Not done |

## Recommended Follow-up

1. **Cross-check against bridgelet-core findings:** Compare each security
   property claimed in `security-model.mdx` against the core audit's actual
   contract behavior.
2. **Cross-check against bridgelet-sdk findings:** Verify SDK-level security
   claims (error handling, transaction signing, key custody).
3. **Mark unverified sections:** Add `<!-- UNVERIFIED -->` comments or a
   status badge to sections that haven't been independently confirmed.
4. **Schedule a periodic re-check:** Security docs should be re-verified at
   each major release, not just during audits.

## Related Documents

- [`SECURITY.md`](../../SECURITY.md) — the repo's security policy and disclosure process
- `docs/security-model.mdx` — the document in question (not yet cross-checked)
- [`postmortems/three-repo-audit-initiative-cross-links.md`](./three-repo-audit-initiative-cross-links.md) — the cross-reference pattern established for this audit
