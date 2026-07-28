# `test-result` vs `test-results`

Two directories exist under `frontend/` whose names differ by a single character.
They contain entirely different kinds of thing. This entry records which is which
so nobody wastes time searching the wrong one.

## `frontend/test-result/` (singular)

Contains **committed test source files** — real vitest specs that run in CI:

```
test-result/tests/app/claim-page-client.test.tsx
test-result/tests/components/send-form/steps/confirm-step.test.tsx
test-result/tests/components/send-form/steps/details-step.test.tsx
test-result/tests/create-bridgelet-client.test.ts
test-result/tests/lib/account-errors.test.ts
test-result/tests/lib/bridgelet.test.ts
```

Despite the name suggesting output, this is **input**. These specs are picked up
by `npm test` (`vitest run`) alongside the co-located `*.test.tsx` files elsewhere
in `frontend/`.

## `frontend/test-results/` (plural)

Contains **Playwright run output** — generated artifacts, not sources:

```
test-results/.last-run.json
test-results/send-flow-Send-flow-comple-73748-path-and-shows-a-claim-link-chromium/error-context.md
```

`test-results/` is Playwright's default output directory name. Note that the
Playwright e2e tests and config were removed from this repo (commit `fbec7e4`,
"chore: remove playwright e2e tests and config"), so this directory is a leftover
artifact of a test run that predates that removal — the directory name records
a failing `send-flow` spec that no longer exists.

## Why this matters

The confusion runs in the risky direction: the directory whose name reads like
*output* (`test-result`) is the one holding source you must not delete, while the
one holding genuinely disposable output is the plural. Anyone "cleaning up test
output" by pattern-matching the name could delete six live specs.

No rename is proposed here — that is a separate call with CI implications. The
fuller repository-hygiene discussion belongs in the corresponding postmortem
entry.
