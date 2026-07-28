# Runbook: Regenerate a `docs/*.pdf` After Its `.mdx` Changes

## Step 1 — Confirm the file actually has a source

**Only three docs are paired.** Per
[`docs-mdx-vs-pdf-pairs.md`](../glossary/docs-mdx-vs-pdf-pairs.md):

| PDF | Has `.mdx` source? |
|---|---|
| `architecture.pdf` | ✅ |
| `security-model.pdf` | ✅ |
| `integration-guide.pdf` | ✅ |
| `getting-started.pdf` | ❌ none |
| `mvp-specification.pdf` | ❌ none |
| `use-cases.pdf` | ❌ none |

**This runbook applies only to the first three.** If asked to regenerate one of
the bottom three, stop — there is no source to regenerate *from*. Escalate rather
than improvising, since a hand-rebuilt PDF would silently diverge from whatever
the original said.

## Step 2 — Establish the toolchain first

This repo does **not** document a PDF build step, and no `docs:pdf` script exists
in `package.json`. Do not assume a tool.

- Ask whoever last touched it (`git log -- docs/<name>.pdf`) what produced it.
- Check whether a docs site or external service renders these.

If nobody can say, that is itself the finding — record it and escalate rather than
introducing a toolchain unilaterally. A PDF built by a different tool than its
predecessors differs in fonts, pagination and styling, which reads as corruption
even when the content is right.

## Step 3 — Regenerate

Render the `.mdx` with that tool, writing to the same filename in `docs/`. Change
nothing else — a regeneration commit should touch the `.mdx` and its paired `.pdf`
only.

## Step 4 — Verify before committing

- **Find the actual edited passage in the PDF.** Don't infer it from a successful
  build.
- Confirm headings, tables and code blocks still render — tables and code are the
  usual casualties of a toolchain change.
- Check page count and styling are in the same ballpark as the previous version.

Commit the `.mdx` and `.pdf` **together**. Splitting them across commits is what
creates the drift this runbook exists to fix.
