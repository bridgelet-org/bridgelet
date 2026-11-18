# WCAG 2.1 AA Audit: Send Flow

> Issue #465: `frontend/app/send/`

## Scope

The send flow is a core, transaction-critical path. This document records the
accessibility audit performed against it, in line with WCAG 2.1 AA.

## Audit Method

### Automated audit (axe-core)

`axe-core` is run against the renderable send-flow components in
`frontend/tests/a11y/send-flow-audit.test.tsx`:

- `SendPageClient`: the single/batch mode toggle wrapper
- `BatchSendForm`: the batch recipient entry form

Run locally:

```bash
cd frontend
vitest run tests/a11y/send-flow-audit.test.tsx
```

### Manual keyboard-only navigation

The send flow must be completable using the keyboard alone (Tab, Enter, Space,
arrow keys). Verified interactions:

1. **Mode toggle**: both `Single recipient` and `Batch recipients` buttons are
   reachable by Tab and activable with Enter/Space. `aria-pressed` reflects the
   active mode.
2. **Form controls**: all inputs and submit buttons in the send form have
   labels and are reachable in logical DOM order.

## Automated Findings

| Rule | Impact | Nodes | Status |
|------|--------|-------|--------|
| `axe-core` violations | N/A | See test output | Triaged |

Findings are **informational**; each is filed as an individual follow-up issue
and not fixed silently within this audit.

## Recommended Follow-ups

- Ensure the batch recipient table rows expose proper row/column semantics to
  screen readers.
- Confirm error messages are announced via `aria-live` or `role="alert"`.
