# Postmortem: `lighthouserc.js` Exists But Is Not Invoked in Frontend CI

**Issue:** [#316](https://github.com/amberly-d/bridgelet/issues/316)
**Severity:** Medium (false confidence in quality gates)
**Status:** Open

## Summary

A Lighthouse CI configuration exists at `frontend/lighthouserc.js` with
performance, accessibility, and best-practices thresholds set to `error` level.
However, the primary CI workflow (`frontend-ci.yml`) does not invoke Lighthouse.
The config exists but is not wired into the merge gate that contributors
actually rely on.

## Evidence

### The config — `frontend/lighthouserc.js`

```js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/send',
        'http://localhost:3000/claim/abc123',
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo': ['off'],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

Three thresholds are set to `error` — meaning they **should** block a merge
when violated. Accessibility is held to the strictest bar (0.95).

### The CI gap — `frontend-ci.yml`

The frontend CI workflow runs:

- `lint`
- `type-check`
- `test`
- `build`

It does **not** run `npm run lhci` or reference `lighthouserc.js` in any way.

A separate `lighthouse-ci.yml` workflow exists (referenced in
[`glossary/lighthouse-ci-config.md`](../glossary/lighthouse-ci-config.md)),
but it is:

- **Path-filtered** to `frontend/**`, `docs/**`, and its own workflow file — so
  changes elsewhere skip it entirely.
- **Dependent on `LHCI_GITHUB_APP_TOKEN`** from repository secrets, which is
  typically unavailable to pull requests from forks.

## Risk

- **False confidence.** The thresholds read as enforced quality gates. A
  contributor or reviewer might assume accessibility regressions will be caught.
  They will not — unless the separate `lighthouse-ci.yml` happens to run and
  has token access.
- **Fork PRs escape entirely.** External contributors' PRs will never trigger
  Lighthouse because they lack the app token. A significant accessibility
  regression could merge without any Lighthouse signal.
- **Config drift.** An unused config can drift from reality — the URLs it
  audits (`/send`, `/claim/abc123`) may change without anyone noticing because
  the gate is not actually enforced.

## Recommended Fix

### Option A — Add Lighthouse to `frontend-ci.yml` (preferred)

Add a step after `build`:

```yaml
- name: Lighthouse CI
  working-directory: frontend
  run: npx lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

If the token is unavailable for fork PRs, make the step non-blocking (`continue-on-error: true`)
with a clear comment explaining why, so the gap is visible rather than implicit.

### Option B — Remove the config

If Lighthouse is not intended to be a merge gate, delete
`frontend/lighthouserc.js` and remove the `@lhci/cli` dependency. A config that
exists but is not enforced is worse than no config — it creates the illusion of
a safety net.

### Either way

Update
[`glossary/lighthouse-ci-config.md`](../glossary/lighthouse-ci-config.md) to
reflect the actual state after the fix.

## Related Documents

- [`frontend/lighthouserc.js`](../../frontend/lighthouserc.js) — the unused config
- [`glossary/lighthouse-ci-config.md`](../glossary/lighthouse-ci-config.md) —
  glossary entry describing the Lighthouse setup
- `frontend-ci.yml` — the CI workflow that should invoke (or explicitly skip)
  Lighthouse
