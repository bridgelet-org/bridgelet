# Runbook: Audit Lighthouse Scores

For investigating a performance or accessibility regression flagged in a PR, issue,
or manual review. This runbook walks through whether Lighthouse CI is actually
running, how to reproduce scores locally, and how to identify the source of a
regression.

## Step 1 — Check if Lighthouse CI is actually invoked

The repo ships a `frontend/lighthouserc.js` config, but **the config existing
does not mean it runs**. Lighthouse CI only fires if a workflow step calls it
(e.g. `npx lhci autorun`).

1. Search CI workflow files for `lhci` or `lighthouse`:
   ```bash
   grep -r "lhci\|lighthouse" .github/workflows/
   ```
2. If there are **no hits**, Lighthouse CI is configured but never executed.
   Scores from CI are not available — any score history is from manual runs only.
3. If there **is** a step, confirm it uses the config:
   ```bash
   grep -A2 "lhci" .github/workflows/*.yml
   ```
   The step should invoke `npx lhci autorun` or reference `lighthouserc.js`
   explicitly. Without this, the config's thresholds are not enforced.

> **This is the most common finding.** The config defines thresholds
> (performance ≥ 0.85, accessibility ≥ 0.95, best-practices ≥ 0.90) but they only
> matter if the CI step exists and runs.

## Step 2 — Run Lighthouse manually against a local build

To get a reproducible score, run Lighthouse against a production-like build:

```bash
cd frontend
npm run build
npx lhci autorun --config=lighthouserc.js
```

This starts the app (`npm run start`), hits the three URLs in the config, and
runs three passes per URL for statistical stability.

**If `lhci` is not installed**, add it temporarily:

```bash
npm install --save-dev @lhci/cli
```

**Timeouts on CI:** if running in a resource-constrained environment, increase the
timeout. The config's `startServerReadyPattern` is `Ready` — confirm your dev
server actually prints that exact string before Lighthouse proceeds.

## Step 3 — Compare scores against thresholds

The thresholds from `frontend/lighthouserc.js` are:

| Category          | Min Score | Assertion Level |
| ----------------- | --------- | --------------- |
| Performance       | ≥ 0.85    | `error`         |
| Accessibility     | ≥ 0.95    | `error`         |
| Best Practices    | ≥ 0.90    | `error`         |
| SEO               | —         | `off`           |

An assertion level of `error` means the run **fails** if the score drops below
the threshold. A score of exactly 0.85 passes; 0.84 does not.

**Compare your local run against the failing CI run (or prior baseline).** Focus
on whichever category regressed. A 0.02 drop in performance is noise; a 0.10 drop
points to a real change.

## Step 4 — Identify the regression source

Once you know which category regressed and by how much, bisect the cause:

**Performance regressions:**

1. Check the Lighthouse **Performance** panel for the specific metric that moved
   (LCP, FCP, TBT, CLS).
2. Run `npx lhci autorun` against the **previous good commit** to establish a
   baseline:
   ```bash
   git checkout <last-good-sha>
   cd frontend && npm run build && npx lhci autorun --config=lighthouserc.js
   ```
3. Diff the two commits. Common culprits:
   - New large dependencies (check `package.json` changes)
   - Removed or misconfigured dynamic imports
   - Images without `next/image` optimization
   - Third-party scripts loaded synchronously

**Accessibility regressions:**

1. Run Lighthouse with `--only-categories=accessibility` to focus output.
2. Check the **Accessibility** audit details for the specific failed audits
   (e.g. missing `alt` text, low contrast ratios, missing ARIA labels).
3. The thresholds are strict (≥ 0.95) — a single missing label can drop the
   score below threshold.

## Step 5 — Document findings

Record the results for future reference and to close the loop on the issue:

1. **Capture scores.** Paste the Lighthouse JSON or summary table into the issue
   or PR comment.
2. **Note the config version.** If `lighthouserc.js` was modified recently, link
   the change — threshold changes can cause "regressions" that are actually
   tightened expectations.
3. **Link to the Lighthouse report.** The config uploads to `temporary-public-storage`
   by default. The upload URL is printed at the end of the `lhci autorun` output.
4. **State the action taken.** Either fix the regression, adjust the threshold
   (with justification), or document why the score change is acceptable.

> If Lighthouse CI is not wired into the workflow (Step 1), this is also the time
> to file that as a follow-up — the thresholds are meaningless without enforcement.

## Related Documents

- [`frontend/lighthouserc.js`](../../../frontend/lighthouserc.js) — Lighthouse CI configuration and thresholds
- [`.github/BRANCH_PROTECTION.md`](../../.github/BRANCH_PROTECTION.md) — CI checks that gate merges (Lighthouse is not currently required)
- [`onboard-mobile-app-to-ci.md`](./onboard-mobile-app-to-ci.md) — adding Lighthouse as a required CI check
