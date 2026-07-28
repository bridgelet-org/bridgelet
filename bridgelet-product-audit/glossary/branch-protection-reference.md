# Branch Protection — Quick Reference

A summary of `.github/BRANCH_PROTECTION.md`.

> **The canonical source is `.github/BRANCH_PROTECTION.md` itself.** This is a
> pointer, not a replacement. Where the two differ, that file wins.

## What it documents

**Protected branch:** `main`.

**Status checks**
- Required status checks must pass before merging — enabled.
- Branches must be up to date with `main` before merging — enabled.
- Failed CI checks block merges.

**Pull request requirements**
- A pull request is required before merging.
- At least **1 reviewer** approval.
- Self-approval disabled (recommended).
- Stale approvals dismissed when new commits are pushed.
- Conversation resolution required before merging.

**Tests and coverage**
- Tests required for merge *where tests exist*.
- Coverage thresholds **not** enforced yet.

It also lists the local commands to run before pushing, and mentions optional
Husky pre-commit hooks.

## One discrepancy worth knowing

The listed local commands include `npm run type-check`.

That name is correct for **`mobile/`**, whose `package.json` defines `type-check`.
It is **not** correct for `frontend/`, which defines `typecheck` (no hyphen).
Running `npm run type-check` from `frontend/` fails with a missing script rather
than type-checking anything.

Contributors in `frontend/` should run `npm run typecheck`. This is a
documentation inconsistency, not a CI problem — `frontend-ci.yml` detects and
calls the correct name itself.

## Read alongside

`CONTRIBUTING.md` covers process expectations — how to propose changes, branch and
open a PR. Branch protection is the *enforcement* of those expectations. Read
both: following CONTRIBUTING without meeting branch protection means an
unmergeable PR; the reverse means a mergeable PR that skipped the agreed process.
