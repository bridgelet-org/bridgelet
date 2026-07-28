# Postmortem: Mobile App Has Zero CI Coverage

**Issue:** [#310](https://github.com/northersubair/bridgelet/issues/310)
**Severity:** Medium
**Status:** Open

---

## Summary

The `mobile/` directory is a standalone Expo application with its own
`package.json` and `package-lock.json`, yet it receives **no CI coverage**.
Only `frontend/` is tested, linted, and type-checked in the existing GitHub
Actions workflows.

## What exists today

The `.github/workflows/` directory contains two workflow files:

| Workflow | What it covers | Scoped to |
|---|---|---|
| `frontend-ci.yml` | Lint, type-check, unit tests, build, Playwright e2e | `frontend/` via `working-directory` |
| `lighthouse-ci.yml` | Lighthouse performance audit | `frontend/` |

Neither workflow references `mobile/` in any way. There is no
`mobile-ci.yml` or equivalent.

## The gap

`mobile/` is an independent Expo project. It has:

```
mobile/
  package.json          # own scripts: lint, type-check, test
  package-lock.json     # own dependency tree
  ...                   # source files, config, etc.
```

This means:

- **Lint regressions** in mobile TypeScript/TSX code merge uncaught.
- **Type errors** ship to `main` without being flagged — mobile uses
  `tsc --noEmit` (note: the script is named `type-check`, not `typecheck`).
- **Unit test failures** in mobile tests are invisible to CI.
- **Dependency vulnerabilities** specific to `mobile/package-lock.json` are not
  scanned in any automated gate.

## Risk assessment

| Risk | Impact | Likelihood |
|---|---|---|
| Broken mobile build merges to `main` | Users on mobile get a broken release | Medium — no guard rails exist |
| Type errors accumulate silently | Refactors become increasingly dangerous in `mobile/` | High — no type-check CI means drift compounds |
| Lint rules diverge between `frontend/` and `mobile/` | Inconsistent code style across the two apps | High — each enforces its own ESLint config independently |
| A PR touching both `mobile/` and `frontend/` passes CI only on the frontend side | Reviewers may assume full coverage based on green CI | High — the workflow names suggest broader coverage than they provide |

## Contributing factors

1. **Workflow scoping is invisible.** `frontend-ci.yml` has no path filter — it
   runs on every push to `main` and every PR. A contributor unfamiliar with the
   `working-directory: frontend` default might reasonably assume it covers the
   whole repo.

2. **No `build` script in mobile.** The Expo app uses `expo start` rather than
   a discrete build step, so the pattern from `frontend-ci.yml` (which
   unconditionally runs `npm run build`) cannot be copied verbatim.

3. **Script name mismatch.** Mobile's type-check script is `type-check` (with a
   hyphen), while `frontend-ci.yml` detects `"typecheck"` (no hyphen). Copying
   the detection block without adjustment silently skips type-checking.

## Recommendations

1. **Create `.github/workflows/mobile-ci.yml`** scoped to `mobile/` via
   `working-directory: mobile`. Mirror the structure of `frontend-ci.yml` but
   adapt for mobile's actual scripts:
   - `npm run lint`
   - `npm run type-check` (note the hyphen)
   - `npm run test`
   - No build step unless a build equivalent is defined

2. **Add path filters** so mobile CI only runs when `mobile/**` files change,
   and frontend CI only runs when `frontend/**` files change. This makes the
   coverage boundary explicit in the workflow itself.

3. **Document the gap** in `CONTRIBUTING.md` or `TESTING.md` so contributors
   know what CI does and does not cover.

## Related Documents

- [`onboard-mobile-app-to-ci.md`](../runbooks/onboard-mobile-app-to-ci.md) — runbook for implementing the fix
- [`mobile-app-services-logger.md`](../glossary/mobile-app-services-logger.md) — context on mobile app internals
- [`mobile-app-contract-awareness.md`](../integration-notes/mobile-app-contract-awareness.md) — mobile app's awareness of the contract layer
