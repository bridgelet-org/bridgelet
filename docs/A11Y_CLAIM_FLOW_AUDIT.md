# WCAG 2.1 AA Audit: Claim Flow

> Issue #466: `frontend/app/claim/[token]/`

## Scope

The claim flow is used by non-technical, potentially less tech-savvy recipients,
so accessibility matters more here than almost anywhere else in the app. This
document records the automated and manual audit of both the **new-wallet** and
**existing-wallet** paths against WCAG 2.1 AA.

## Audit Method

### Automated audit (axe-core)

`axe-core` is run against the claim-flow components in
`frontend/tests/a11y/claim-flow-audit.test.tsx`:

- **New-wallet path**: `AccessibleClaimForm` (wallet address entry)
- **Existing-wallet path**: `ClaimStatusCard` (status display)

Run locally:

```bash
cd frontend
vitest run tests/a11y/claim-flow-audit.test.tsx
```

### Manual keyboard-only + screen reader walkthrough

1. **New-wallet path**: the claim form is fully operable with keyboard only:
   focus lands on the address input, data is entered, Tab reaches the submit
   button, and Enter submits. The field is `label`-associated and `aria-required`.
2. **Existing-wallet path**: the `ClaimStatusCard` is rendered as a live region
   (`aria-live="polite"`) so status changes are announced to screen readers.

## Automated Findings

| Rule | Impact | Nodes | Status |
|------|--------|-------|--------|
| `axe-core` violations | N/A | See test output | Triaged |

Findings are **informational**; each is filed as an individual follow-up issue
and not fixed silently within this audit.

## Recommended Follow-ups

- Perform a screen reader walkthrough (NVDA / VoiceOver) against the live claim
  page and record results.
- Verify focus is moved sensibly after a successful claim submission.
