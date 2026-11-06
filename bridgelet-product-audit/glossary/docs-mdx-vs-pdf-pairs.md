# `docs/`: `.mdx` Sources and `.pdf` Exports

Some documents in `docs/` exist as an editable `.mdx` source with a matching
`.pdf`; others exist **only** as a PDF. The distinction matters the moment
something needs updating.

## Paired: `.mdx` source with a `.pdf` export

| Source | Export |
|---|---|
| `integration-guide.mdx` | `integration-guide.pdf` |

For this pair, the `.mdx` is authoritative. Edit it, then regenerate the PDF.

`architecture.pdf`, `security-model.pdf`, and `use-cases.pdf` were retired during
docs cleanup. Their maintained replacements are `architecture.mdx`,
`security-model.mdx`, and `use-cases.md`.

## PDF-only: no `.mdx` source

- `getting-started.pdf`
- `mvp-specification.pdf`

These have no source file in the repository.

## Practical implication

**A PDF without a source can only be manually re-created.** There is nothing to
edit and re-render: changing `getting-started.pdf` means reproducing the whole
document in whatever tool made it, matching its styling by eye, and hoping the
result doesn't look like a different document.

Three further consequences worth naming:

- **They are opaque to review.** A PDF in a diff shows as a binary blob. A
  reviewer cannot see what changed, so content changes arrive effectively
  unreviewed.
- **They are not greppable.** Searching the repo for a term will find it in the
  Markdown/MDX sources and miss it in the PDF-only files entirely, so these
  documents are easy to forget when updating terminology.
- **Drift is silent even for paired files.** Nothing enforces that a `.pdf` was
  regenerated after its `.mdx` changed. A stale export can sit alongside an
  updated source indefinitely, and readers who open the PDF get the old answer
  with no indication it is out of date.

`integration-guide.pdf` is now the only remaining paired export, so it is the
only file exposed to this drift risk.

**Related:**
[`../runbooks/rebuild-docs-pdf-from-mdx.md`](../runbooks/rebuild-docs-pdf-from-mdx.md),
the regeneration procedure, and the postmortem entry on regeneration risk.
