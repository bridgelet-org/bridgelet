# Postmortem: PDF/MDX Drift Risk in `docs/`

**Issue:** [#315](https://github.com/amberly-d/bridgelet/issues/315)
**Severity:** Medium (documentation accuracy, especially security docs)
**Status:** Open

## Summary

The `docs/` directory contains six PDF files. Three have corresponding `.mdx`
sources; three exist only as PDFs. There is no automated step to regenerate the
PDFs from their sources, so any drift between `.mdx` and `.pdf` is silent and
undetectable in code review.

## Evidence

**Paired files (`.mdx` source + `.pdf` export):**

| Source | PDF |
|---|---|
| `docs/architecture.mdx` | `docs/architecture.pdf` |
| `docs/security-model.mdx` | `docs/security-model.pdf` |
| `docs/integration-guide.mdx` | `docs/integration-guide.pdf` |

**PDF-only files (no source):**

| PDF | Has `.mdx`? |
|---|---|
| `docs/getting-started.pdf` | No |
| `docs/mvp-specification.pdf` | No |
| `docs/use-cases.pdf` | No |

The root `package.json` has no `docs:pdf` script. No CI step was found that
regenerates PDFs from `.mdx`. The existing runbook
(`runbooks/rebuild-docs-pdf-from-mdx.md`) documents the manual procedure and
notes that the toolchain is undocumented — the team must ask `git log` who last
touched a PDF to figure out what produced it.

## Why This Matters

### Paired files — silent drift

A contributor edits `security-model.mdx`, commits it, and opens a PR. The
reviewer sees the markdown diff and approves. But `security-model.pdf` is never
regenerated, so anyone who opens the PDF gets the **old** security guidance with
no indicator it is stale. The security documentation specifically carries this
risk — see
[`glossary/docs-mdx-vs-pdf-pairs.md`](../glossary/docs-mdx-vs-pdf-pairs.md).

- PDFs are binary blobs in git diffs — changes are invisible to reviewers.
- PDFs are not greppable — terminology updates can miss them entirely.
- Nothing fails when the two diverge.

### PDF-only files — no source at all

`getting-started.pdf`, `mvp-specification.pdf`, and `use-cases.pdf` have no
editable source. Updating them requires reproducing the document from scratch in
whatever tool originally created it, matching styling by eye. This is effectively
a manual-only process with no audit trail.

## Recommended Fix

### For paired files (priority: high)

1. **Add a CI step** that regenerates the PDFs from `.mdx` on every push to
   `docs/**`, or at minimum validates that the checked-in PDF matches the source.
2. **Alternatively, remove the PDFs** and serve the `.mdx` files through a docs
   site (e.g. Docusaurus, Mintlify) where a single source of truth is always
   current.
3. Until automation is in place, **enforce in PR review** that any PR touching a
   `.mdx` file also regenerates its paired PDF.

### For PDF-only files (priority: medium)

1. **Recover or recreate the source** — identify the original authoring tool,
   extract or rewrite the content into `.mdx`, and add it to the repo.
2. **Remove the orphan PDFs** once authoritative sources exist.
3. If the content is genuinely archived (not meant to be maintained), move the
   PDFs out of `docs/` into an `archive/` directory with a README explaining
   their status.

## Related Documents

- [`glossary/docs-mdx-vs-pdf-pairs.md`](../glossary/docs-mdx-vs-pdf-pairs.md) —
  canonical inventory of paired and orphan PDFs
- [`runbooks/rebuild-docs-pdf-from-mdx.md`](../runbooks/rebuild-docs-pdf-from-mdx.md) —
  the manual regeneration procedure
- `docs/architecture.mdx`, `docs/security-model.mdx`, `docs/integration-guide.mdx` —
  the three authoritative sources
