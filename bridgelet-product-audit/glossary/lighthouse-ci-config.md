# Lighthouse CI Configuration

## What Lighthouse CI measures

Lighthouse audits a running page and scores it in categories — performance,
accessibility, best practices, SEO. Lighthouse **CI** runs those audits
automatically against a built app and can fail the build when a score drops below
a configured floor, turning page quality into a merge gate rather than a
spot check.

## Where the config actually lives

Note a correction worth recording: this file is **not** root-level. It sits at
`frontend/lighthouserc.js`, alongside the app it audits. There is no
`lighthouserc.js` at the repository root.

## What it currently checks

The config starts the production server (`npm run start`, awaiting the `Ready`
pattern) and audits three URLs, **3 runs each**:

- `http://localhost:3000/` — home
- `http://localhost:3000/send` — sender flow
- `http://localhost:3000/claim/abc123` — claim flow, via a dummy token

Assertions:

| Category | Threshold | Level |
|---|---|---|
| Performance | ≥ 0.85 | `error` |
| Accessibility | ≥ 0.95 | `error` |
| Best practices | ≥ 0.90 | `error` |
| SEO | — | `off` |

All three active thresholds are `error`, so falling below any of them fails the
run. Accessibility is held to the strictest bar. Reports upload to
`temporary-public-storage`.

## Is it actually invoked?

Yes — but not by the workflow you might expect. **`frontend-ci.yml` does not
reference it.** A *separate* workflow, `lighthouse-ci.yml`, runs `npm run lhci`
(i.e. `lhci autorun`) from `frontend/`. Two consequences:

- It is **path-filtered** to `frontend/**`, `docs/**` and its own workflow file. A
  change touching none of those — a docs-only addition to a new top-level folder,
  say — will not run Lighthouse at all.
- It passes `LHCI_GITHUB_APP_TOKEN` from repository secrets, typically unavailable to pull requests from forks.

See the checklist entry on CI-coverage gaps.
