# Postmortem: Stray `pr_body.md` at Repository Root

**Issue:** [#314](https://github.com/amberly-d/bridgelet/issues/314)
**Severity:** Low (repo hygiene)
**Status:** Open

## Summary

A file named `pr_body.md` exists at the repository root. It contains a
PR description draft for the NFC feature (Closes #98), describing a Web NFC
hook, send-flow integration, and evaluation document — work that was completed
and merged under a separate PR.

## Evidence

The file is 15 lines long, lives at the repo root, and opens with:

```markdown
Closes #98

### What does this PR do?
This PR introduces an experimental feature using the Web NFC API to allow
users to write a Bridgelet claim URL directly to a physical NFC tag.
```

It references specific source files (`frontend/hooks/use-nfc.ts`,
`frontend/components/send-form/steps/confirm-step.tsx`,
`docs/experiments/nfc-experiment.md`) and includes acceptance-criteria
checkboxes. This is clearly a working draft for a PR body, not a maintained
document.

### What the file contains

The full content describes:

- **Web NFC Hook:** A `useNfc` React hook for writing URL records to NFC tags
- **Send Flow Integration:** A "Write to NFC Tag" button in the confirm step
- **NFC Evaluation Document:** An experiment writeup at `docs/experiments/nfc-experiment.md`
- **Latent Type Fixes:** MSW module imports and Freighter API updates

All acceptance criteria are checked off — this is post-merge debris.

## Risk

- **Scratch files accumulate.** If this file was not cleaned up after the PR
  merged, other working notes may follow the same pattern — `.env.draft`,
  `notes.md`, temporary screenshots, etc. Each one is a small hygiene failure
  that compounds over time.
- **No pre-commit or gitignore guard.** Its presence at root suggests no
  `.gitignore` or pre-commit hook prevents temporary files from being committed.
  There is no systematic defense against the next stray file.
- **Confusion for new contributors.** A file named `pr_body.md` at root with
  no explanation looks like either active work or forgotten debris. Either
  reading wastes attention and creates ambiguity about what is authoritative.
- **Closed issue reference.** `Closes #98` references a completed PR. The file
  serves no ongoing purpose and the PR's own GitHub page is the canonical
  record of what was merged.
- **Search noise.** Anyone grepping the repo for NFC-related content will find
  this stale draft alongside the actual implementation, potentially leading to
  confusion about which description is current.

## Recommended Fix

1. **Delete `pr_body.md`.** The PR it describes is merged; the content lives in
   the PR's own history on GitHub.
2. **Add a `.gitignore` entry** (or enforce one) for common scratch patterns:
   `pr_body.md`, `*.draft.md`, `.env.local`, etc.
3. **Document the expectation** that working notes and draft PR descriptions
   should not be committed to the repository — add a note to `CONTRIBUTING.md`
   or the repo README.
4. **Audit for other stray files.** Check for any other working drafts that may
   have been committed by the same author or via the same workflow. Look for
   patterns like `tmp_*`, `notes.md`, `TODO.md`, or screenshot files.

## Why this pattern recurs

PR description drafts are often written in a local file before being pasted into
the GitHub PR form. If the contributor is working inside the repo directory, the
draft file is right there — and `git add .` or a pre-commit workflow can easily
sweep it up. The fix is both cultural (document the expectation) and mechanical
(gitignore the patterns).

## Related Documents

- [`pr_body.md`](../../pr_body.md) — the stray file itself
- [`glossary/governance-and-roadmap-cross-reference.md`](../glossary/governance-and-roadmap-cross-reference.md)
