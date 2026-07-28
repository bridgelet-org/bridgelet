# `docs/` — `.mdx` Sources and `.pdf` Exports

Some documents in `docs/` exist as an editable `.mdx` source with a matching
`.pdf`; others exist **only** as a PDF. The distinction matters the moment
something needs updating.

## Paired — `.mdx` source with a `.pdf` export

| Source | Export |
|---|---|
| `architecture.mdx` | `architecture.pdf` |
| `security-model.mdx` | `security-model.pdf` |
| `integration-guide.mdx` | `integration-guide.pdf` |

For these, the `.mdx` is authoritative. Edit it, then regenerate the PDF.

## PDF-only — no `.mdx` source

- `getting-started.pdf`
- `mvp-specification.pdf`
- `use-cases.pdf`

These have no source file in the repository.

## Practical implication

**A PDF without a source can only be manually re-created.** There is nothing to
edit and re-render — changing `use-cases.pdf` means reproducing the whole document
in whatever tool made it, matching its styling by eye, and hoping the result
doesn't look like a different document.

Three further consequences worth naming:

- **They are opaque to review.** A PDF in a diff shows as a binary blob. A
  reviewer cannot see what changed, so content changes arrive effectively
  unreviewed.
- **They are not greppable.** Searching the repo for a term will find it in the
  three `.mdx` sources and miss it in the PDF-only trio entirely — so these
  documents are easy to forget when updating terminology.
- **Drift is silent even for paired files.** Nothing enforces that a `.pdf` was
  regenerated after its `.mdx` changed. A stale export can sit alongside an
  updated source indefinitely, and readers who open the PDF get the old answer
  with no indication it is out of date.

Note that `security-model.pdf` is among the paired files — the security
documentation specifically is exposed to this drift risk.

**Related:**
[`../runbooks/rebuild-docs-pdf-from-mdx.md`](../runbooks/rebuild-docs-pdf-from-mdx.md)
— the regeneration procedure — and the postmortem entry on regeneration risk.
