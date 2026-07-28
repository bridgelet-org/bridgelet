# Whether ROADMAP.md and GOVERNANCE.md Still Reflect Current Project Reality

**Issue:** [#327](https://github.com/bridgelet-org/bridgelet/issues/327)
**Category:** Open verification task
**Severity:** Low-Medium — planning documents that may mislead contributors

## Summary

`ROADMAP.md` and `GOVERNANCE.md` both exist at the repo root and were reviewed
only at a high level during this initiative. It was not verified whether their
content still accurately reflects the current state of the project, its
priorities, or its governance model.

## Why This Matters

Planning documents serve as the primary orientation point for new contributors,
potential integrators, and community members. If they are stale:

- **Contributors** may work on features the project has already deprioritized
  or abandoned.
- **Integrators** may plan around capabilities that don't yet exist or have
  been redesignated.
- **Community members** may expect governance processes that have quietly
  changed.

### Specific observations

**ROADMAP.md** describes a quarterly timeline (Q1–Q4 2026) with checkboxes for
completed and pending items. Several observations:

- The document describes the project as in "MVP Implementation" phase, but
  the codebase has grown beyond basic ephemeral account creation.
- Community request examples reference placeholder issue numbers (`#12`, `#45`)
  that may not correspond to real issues.
- The long-term vision section may not align with current architectural
  decisions (e.g., three-wallet-type support, LOBSTR paste flow).

**GOVERNANCE.md** was not examined in detail but is assumed to describe the
contribution and decision-making model. If governance practices have evolved
informally (e.g., how PRs are reviewed, who has merge rights), the document
may be misleading.

## What Was and Wasn't Checked

| Aspect | Status |
|--------|--------|
| Both documents exist | ✅ Confirmed |
| High-level skim for obvious staleness | ✅ Done |
| Checkbox accuracy against git history | ❌ Not done |
| Governance practices vs documented process | ❌ Not done |
| Community request issue numbers verified | ❌ Not done |

## Recommended Follow-up

1. **Audit ROADMAP.md checkboxes:** Compare each checked/unchecked item against
   the actual codebase state. Mark items that have been redesignated or removed.
2. **Verify community request links:** Confirm that referenced issue numbers
   exist and are still open/planned as described.
3. **Review GOVERNANCE.md against practice:** Compare the documented governance
   model against how decisions are actually made (e.g., who merges PRs, how
   design decisions are communicated).
4. **Add last-verified timestamps:** Mark each section with the date it was
   last confirmed accurate.

## Related Documents

- [`ROADMAP.md`](../../ROADMAP.md) — the development roadmap
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — contribution guidelines
- [`GOVERNANCE.md`](../../GOVERNANCE.md) — governance model (if exists)
