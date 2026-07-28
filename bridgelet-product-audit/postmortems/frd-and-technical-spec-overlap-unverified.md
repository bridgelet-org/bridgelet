# Issue #321: Potential Overlap Between Bridgelet FRD UI/UX and Frontend Technical Spec Unverified

**Status:** Open
**Severity:** Medium
**Author:** temiport25
**Date:** 2026-07-28

## Summary

During the bridgelet product audit, two documents were identified by name as potentially covering overlapping scope for the bridgelet frontend:

1. `bridgelet-frd-ui-ux.md` — appears to be a functional requirements document (FRD) focused on UI/UX.
2. `FRONTEND_TECHNICAL_SPEC.md` — appears to be a technical specification for the frontend.

These documents were **not compared or cross-referenced** during the audit. Their relationship, scope boundaries, and degree of overlap remain unverified. This postmortem records the finding as an open question for follow-up.

## Why This Matters

When two documents appear to address the same subsystem (bridgelet frontend), several risks emerge:

- **Drift:** Without a clear ownership boundary, each document can evolve independently and contradict the other. A developer reading only one may implement features that conflict with the other's requirements.
- **Ambiguity for new contributors:** Onboarding engineers will not know which document is authoritative for a given frontend behavior.
- **Audit gap:** The product audit did not confirm whether these documents are complementary (one high-level, one detailed), redundant (saying the same thing), or contradictory (saying different things).
- **Maintenance overhead:** Two documents covering the same surface area means twice the update burden when requirements change.

## What Was Not Verified

The following questions remain open:

1. Do `bridgelet-frd-ui-ux.md` and `FRONTEND_TECHNICAL_SPEC.md` cover the same features, or does each own a distinct subset?
2. Is one intended as a superset of the other?
3. Which document is considered the source of truth when they conflict?
4. Are there sections in one document that have no counterpart in the other?
5. Has either document been updated recently to incorporate the other's content?
6. Do either document reference the other explicitly, or are they completely unaware of each other?
7. Have changes been made in one document that were not reflected in the other?
8. Is there a versioning or last-updated timestamp on either document that indicates recency?

## Possible Relationships

Based on naming conventions alone, several structural relationships are possible:

- **FRD is a superset of the technical spec.** The FRD covers all product requirements including non-frontend concerns, while the technical spec narrows to frontend implementation details.
- **Technical spec is a superset of the FRD.** The technical spec includes both product requirements and implementation guidance, making the FRD redundant.
- **Complementary non-overlapping documents.** The FRD covers what the frontend should do (user stories, acceptance criteria), while the technical spec covers how it should be built (architecture, component structure, state management).
- **Divergent duplicates.** Both documents describe the same scope but were written by different authors at different times, leading to contradictions.

Each scenario demands a different remediation. Without reading both documents, the audit cannot determine which scenario applies.

## Evidence from the Audit

The audit identified these documents through filename pattern matching during the documentation inventory phase. The following observations were made:

- Both files exist in the repository tree and are not symlinks or aliases.
- Neither file appears to import, include, or link to the other based on filename analysis alone.
- The audit did not open either file to verify contents, making this a pure identification finding rather than a content analysis finding.
- No issue or PR was found that tracks the relationship between these two documents.

This finding is recorded as an open question to be resolved in a follow-up pass.

## Risk Assessment

| Factor | Detail |
|---|---|
| Likelihood of drift | High — two living documents with no enforced synchronization |
| Impact of drift | Medium — frontend devs may implement against stale or conflicting specs |
| Detection difficulty | Low — a side-by-side comparison would surface issues quickly |
| Remediation effort | Low — a single reconciliation pass, then establishing ownership rules |

## Recommended Actions

1. **Side-by-side comparison.** Read both documents in full and map section-by-section which topics each covers. Identify overlaps, gaps, and contradictions. Produce a matrix showing which topics appear in which document.
2. **Designate an authority.** Decide which document is the canonical source for frontend requirements and which, if any, is a derived or supplementary view.
3. **Add cross-references.** If both documents are kept, each should contain explicit pointers to the other explaining the relationship (e.g., "This FRD covers product requirements; see `FRONTEND_TECHNICAL_SPEC.md` for implementation details").
4. **Stale-document policy.** If one document is found to be outdated, either archive it or bring it up to date and add a maintenance cadence. Consider adding a `last-reviewed` field to both documents.
5. **Update the audit checklist.** Future audits should explicitly verify whether overlapping documents have been reconciled before marking the documentation domain as complete.

## Code / File References

- `bridgelet-frd-ui-ux.md` — FRD for bridgelet UI/UX (location: unconfirmed, likely under `docs/` or `bridgelet/docs/`).
- `FRONTEND_TECHNICAL_SPEC.md` — Frontend technical spec (location: unconfirmed).
- No commit hashes or line-level references available since document contents were not read during the audit.
- The audit tooling did not flag these two documents as duplicates or related; the identification was manual based on filename heuristics.
- If these documents live in different directories or repos, the risk of drift increases further since there is no single directory listing that surfaces both.

## Related Documents

- `bridgelet-product-audit/postmortems/custodial-model-terminology-scope.md` — Another instance where cross-document terminology needs reconciliation.
- `bridgelet-product-audit/postmortems/org-integration-auth-doc-gap.md` — A case where a documented need for a separate guide was never fulfilled, illustrating the broader pattern of documentation gaps.
- `bridgelet-product-audit/postmortems/claim-error-message-specificity-unverified.md` — A related case where cross-repo consistency was not verified end-to-end.
