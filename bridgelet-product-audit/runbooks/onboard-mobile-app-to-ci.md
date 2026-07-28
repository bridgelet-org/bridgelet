# Runbook: Onboard the Mobile App to CI

Steps for giving `mobile/` the lint / type-check / test coverage `frontend/`
already has via `frontend-ci.yml`.

> This runbook describes the steps. It does **not** create the workflow file.

## 1. Confirm what mobile can actually run

Check `mobile/package.json` before writing anything. As of this writing:

| Script | Command | Notes |
|---|---|---|
| `lint` | `eslint . --ext .ts,.tsx` | ✅ ready |
| `type-check` | `tsc --noEmit` | ⚠️ **note the hyphen** |
| `test` | `jest` | ✅ via `jest-expo` / `ts-jest` |
| `build` | — | ❌ **does not exist** |

Two traps here:

- **There is no `build` script.** `frontend-ci.yml` runs `npm run build`
  unconditionally, so copying that step verbatim fails immediately. Mobile is
  Expo-based (`expo start`), with no direct web-build equivalent — either omit the
  step or decide deliberately what "build" means for mobile.
- **The type-check script is named differently.** Frontend has `typecheck`; mobile
  has `type-check`. `frontend-ci.yml` detects scripts by exact name
  (`"typecheck" in s`), so a copied detection block reports `has_typecheck=false`
  and **silently skips type-checking** — a green run that checked nothing.

## 2. Scope the workflow to `mobile/`

Follow the existing pattern rather than inventing one:

```yaml
defaults:
  run:
    working-directory: mobile
```

and point the Node cache at `cache-dependency-path: mobile/package-lock.json` —
that lockfile exists, so `npm ci` will work. Also decide whether to path-filter
the job to `mobile/**` so it skips docs-only changes; `lighthouse-ci.yml` shows
the pattern already in use here.

## 3. Verify before merging

Run each command locally from `mobile/` first (`npm ci`, then `lint`,
`type-check`, `test`). Then confirm on a throwaway PR that the job actually
**executes** the steps rather than skipping them — check the log for the
type-check step specifically, given the naming trap above.
