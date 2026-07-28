# Runbook: PDF Artifact Freshness Spot Check

Periodic manual verification that committed `.pdf` exports in `docs/` still match their `.mdx` sources, to catch silent content drift before it impacts users.

## Recommended Cadence: Quarterly

This check should run **once per calendar quarter** (Q1: Jan, Q2: Apr, Q3: Jul, Q4: Oct). This frequency balances:
- The low risk of frequent uncoordinated edits to these foundational documentation files
- The lack of automated regeneration in the current toolchain
- The need to catch drift before stale PDF content becomes the default reference for users

## Prerequisites

Before starting, confirm you have access to:
1. The repository's `docs/` directory with all paired files
2. A PDF viewer to inspect the committed PDF exports
3. A text editor or markdown viewer to compare with the `.mdx` sources
4. The postmortem template (create this if it doesn't exist yet) for flagging any drift found

## Step 1 — Select a paired file at random

From the list of verified paired files (per [`docs-mdx-vs-pdf-pairs.md`](../glossary/docs-mdx-vs-pdf-pairs.md)), choose **one file at random** for this spot check:
- `architecture.mdx` ↔ `architecture.pdf`
- `security-model.mdx` ↔ `security-model.pdf`
- `integration-guide.mdx` ↔ `integration-guide.pdf`

Example: Random selection might pick `security-model.mdx` and its matching `security-model.pdf`.

## Step 2 — High-level content comparison

Open both the `.mdx` source and the `.pdf` export side-by-side. Perform a spot check across these key areas, not a line-by-line diff (that's what regeneration is for):

### A. Verify all major sections exist in both
- Confirm the table of contents (if present in the PDF) matches the `.mdx` heading hierarchy
- Check that every top-level heading in the `.mdx` has a corresponding section in the PDF
- Verify no new sections were added to the `.mdx` that are missing from the PDF

### B. Spot-check critical content passages
Pick 3-5 high-risk sections to compare in detail:
- Any section that has been edited in the last 6 months (check `git log -- docs/<file>.mdx`)
- Tables, lists, or code blocks (these are common casualties of failed regeneration)
- Risk/security-related content that could have compliance implications if stale
- Dates, version numbers, or contact information that might become outdated

### C. Confirm structural elements match
- Verify diagrams or images in the `.mdx` render correctly in the PDF
- Check that internal links between documents work in the PDF if they're implemented
- Confirm page numbering or section numbering is consistent between versions

## Step 3 — What to do if you find drift

If you identify **any discrepancy** between the `.mdx` source and its `.pdf` export:

### A. Document everything immediately
- Record the exact sections that differ with line numbers in the `.mdx` and page numbers in the PDF
- Capture screenshots of both the source and export showing the drift
- Note when the `.mdx` was last updated vs. when the PDF was last committed (using `git log`)

### B. Create a postmortem entry
Flag the drift using the standard postmortem template. **Do not fix it silently as part of this spot check** — the postmortem process ensures:
- The drift is visible to the entire team
- Root cause analysis can identify why the PDF wasn't regenerated when the source was updated
- Preventative measures can be added to avoid recurrence
- The fix is properly reviewed rather than rushed through

The postmortem must include:
- Which paired file had drift
- What specific content diverged
- Timeline of the last edits to both files
- Impact assessment of the stale PDF
- Remediation steps to regenerate the PDF (link to [`rebuild-docs-pdf-from-mdx.md`](./rebuild-docs-pdf-from-mdx.md))
- Preventative actions to add automated checks

### C. Escalate to the documentation owner
Add the postmortem to the team's tracking board and assign it to the current documentation owner to coordinate the fix.

## Step 4 — Complete the check if no drift is found

If your spot check finds no discrepancies:
1. Log the completion date and which file you checked in the team's audit log
2. Schedule the next quarterly check
3. No further action is needed until the next cycle

## Related Resources
- [`docs-mdx-vs-pdf-pairs.md`](../glossary/docs-mdx-vs-pdf-pairs.md) — List of all paired PDF/mdx files
- [`rebuild-docs-pdf-from-mdx.md`](./rebuild-docs-pdf-from-mdx.md) — Runbook for regenerating PDFs after source changes