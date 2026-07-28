# Root package.json Not Being an npm Workspace Root

**Issue:** [#329](https://github.com/bridgelet-org/bridgelet/issues/329)
**Category:** Structural finding
**Severity:** Low — affects developer experience and dependency management

## Summary

The root `package.json` does not define an `npm workspaces` configuration. The
`frontend/` and `mobile/` directories are independent npm projects with their own
`package.json` files and lockfiles, not linked via npm's workspace mechanism.

## The factual record

The root `package.json`:

```json
{
  "name": "bridgelet",
  "version": "1.0.0",
  "scripts": {
    "build": "npm --prefix frontend run build",
    "test": "echo \"Run npm test inside frontend/ for app tests\" && exit 0"
  }
}
```

There is no `"workspaces"` field. The `build` script manually delegates to
`frontend/` via `npm --prefix`. Each sub-project manages its own dependencies
independently.

```
bridgelet/
├── package.json          (root — no workspaces)
├── package-lock.json     (root lockfile, minimal deps)
├── frontend/
│   ├── package.json      (independent)
│   └── package-lock.json (independent)
└── mobile/
    ├── package.json      (independent)
    └── package-lock.json (independent)
```

## Why This Matters

### No shared dependency hoisting

npm workspaces hoist shared dependencies to the root `node_modules/`, reducing
disk usage and ensuring consistent versions across sub-projects. Without it,
each sub-project maintains its own complete `node_modules/` tree. If both
`frontend/` and `mobile/` depend on the same package (e.g., `@stellar/stellar-sdk`),
they may resolve to different versions without either project noticing.

### Duplicate packages

Common utilities, React, TypeScript, and testing libraries likely exist in both
`frontend/node_modules/` and `mobile/node_modules/`. This doubles the install
time and disk usage for developers working on both.

### Inconsistent dependency versions

Without workspace-level resolution, there's no mechanism to ensure that shared
dependencies stay in sync. A developer might update a package in `frontend/` while
`mobile/` silently remains on an older, potentially incompatible version.

### No unified test or lint commands

Running `npm test` from the root prints a redirect message. There's no way to
run all tests across both sub-projects with a single command. Workspaces provide
`npm run test --workspaces` for exactly this.

## What This Is and Isn't

| This IS | This IS NOT |
|---------|-------------|
| A developer-experience limitation | A security vulnerability |
| A source of potential version drift | A blocker for the current MVP |
| A maintenance burden at scale | Something that needs immediate action |

## Recommended Follow-up

1. **If the projects remain independent:** Document this as a deliberate choice
   and add root scripts that delegate to both sub-projects (e.g.,
   `npm run test:all`).
2. **If convergence is planned:** Consider migrating to npm workspaces when
   `mobile/` reaches feature parity, to enable shared dependencies and unified
   scripts.
3. **At minimum:** Add a note to the root `package.json` or `CONTRIBUTING.md`
   explaining that the two sub-projects are intentionally independent.

## Related Documents

- [`package.json`](../../package.json) — the root package file
- `frontend/package.json` — frontend's independent dependency tree
- `mobile/package.json` — mobile's independent dependency tree
- [`postmortems/mobile-app-zero-ci-coverage.md`](./mobile-app-zero-ci-coverage.md) — related mobile CI gap
