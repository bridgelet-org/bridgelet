# Postmortem: `test-result` vs `test-results` Directory Duplication

**Issue:** [#311](https://github.com/northersubair/bridgelet/issues/311)
**Severity:** Low
**Status:** Open

---

## Summary

Two directories exist under `frontend/` whose names differ by a single trailing
`s`:

```
frontend/test-result/     (singular)
frontend/test-results/    (plural)
```

They contain entirely different kinds of content. The naming inversion — the
singular name holds **source files**, the plural holds **generated output** — is
a footgun that will cause confusion and potentially destructive cleanup.

## What each directory contains

### `frontend/test-result/` (singular)

Contains **committed test source files** — Vitest specs that run in CI:

```
test-result/tests/app/claim-page-client.test.tsx
test-result/tests/components/send-form/steps/confirm-step.test.tsx
test-result/tests/components/send-form/steps/details-step.test.tsx
test-result/tests/create-bridgelet-client.test.ts
test-result/tests/lib/account-errors.test.ts
test-result/tests/lib/bridgelet.test.ts
```

Despite the name suggesting output, this is **input**. These specs are picked up
by `npm test` (`vitest run`) alongside the co-located `*.test.tsx` files
elsewhere in `frontend/`.

### `frontend/test-results/` (plural)

Contains **Playwright run output** — generated artifacts, not sources:

```
test-results/.last-run.json
test-results/send-flow-Send-flow-comple-73748-path-and-shows-a-claim-link-chromium/
```

`test-results/` is Playwright's default output directory name. The Playwright e2e
tests and config were removed from this repo (commit `fbec7e4`, *"chore: remove
playwright e2e tests and config"*), so this directory is a leftover artifact from
a test run that predates that removal.

The `.last-run.json` records:

```json
{
  "status": "failed",
  "failedTests": ["54450472bdffadeefdc0-5a0daee0bd3bb4baaa15"]
}
```

A stale failure record for a spec that no longer exists in the repo.

## Why this is dangerous

| Scenario | What happens |
|---|---|
| "Cleaning up test output" by pattern-matching `test-result*` | Could delete **six live Vitest spec files** |
| A script or CI step references `test-results/` expecting source tests | Gets Playwright artifacts instead — silent failure |
| A developer `git rm`s `test-results/` thinking it is stale output | `.gitignore` already excludes it, but the confusion wastes time |
| New contributor searches for tests by name | Finds Playwright output first, assumes tests are gone |

The confusion runs in the **wrong direction**: the name that reads like output
(`test-result`) is the one holding source you must not delete.

## Contributing factors

1. **Vitest chose a non-standard directory name.** The Vitest specs live in
   `test-result/tests/` rather than the conventional `__tests__/` or
   co-location next to source files. This makes them easy to overlook and hard
   to distinguish from output at a glance.

2. **Playwright was removed but its output directory was not cleaned up.** The
   `test-results/` directory is gitignored but the directory itself persists on
   disk, and the stale `.last-run.json` is a leftover from before commit
   `fbec7e4`.

3. **No documentation in the repo** explains which directory is which. The
   glossary entry `test-result-directories.md` exists in the audit but is not
   referenced from `README.md`, `TESTING.md`, or `CONTRIBUTING.md`.

## Recommendations

1. **Rename `frontend/test-result/`** to something unambiguous — e.g.
   `frontend/tests/` or `frontend/__tests__/`. This eliminates the singular/plural
   ambiguity and aligns with Vitest conventions.

2. **Delete `frontend/test-results/` entirely.** It is gitignored, contains only
   stale Playwright artifacts, and serves no purpose now that e2e tests have been
   removed. If Playwright is re-added later, the default output directory will be
   recreated automatically.

3. **Update `TESTING.md`** to document where test files live and what the
   directory structure looks like, so new contributors don't hit the same
   confusion.

4. **If the rename is done**, verify that `vitest.config.ts` or the `test`
   script in `package.json` still resolves the correct path after the move.

## Related Documents

- [`test-result-directories.md`](../glossary/test-result-directories.md) — glossary entry documenting the two directories
- [`docs-mdx-vs-pdf-pairs.md`](../glossary/docs-mdx-vs-pdf-pairs.md) — another example of similarly-named paired artifacts in this repo
