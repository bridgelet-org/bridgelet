# Runbook: Verify Branch Protection Compliance

For confirming a pull request satisfies all branch protection rules before merging.
Run this when a PR appears mergeable but the merge button is greyed out, or when
auditing whether the protection configuration in
[`.github/BRANCH_PROTECTION.md`](../../.github/BRANCH_PROTECTION.md) is actually
enforced.

## Step 1 — Confirm the target branch is `main`

Branch protection is only enabled for `main`. PRs targeting any other branch
(e.g. `develop`, a feature branch) have **no protection at all** — approvals and
checks are advisory, not blocking.

1. Open the PR on GitHub.
2. Under the title, read the base branch indicator: it should say **base: main**.
3. If it targets something else, either retarget to `main` or acknowledge that
   protection rules do not apply.

> Retargeting mid-PR can invalidate existing approvals (see Step 5). Confirm with
> the reviewer before changing the base.

## Step 2 — Verify `Frontend CI` is the required status check

The single required check is **`Frontend CI`**, defined in
`.github/workflows/frontend-ci.yml`.

1. On the PR's **Checks** tab, look for a check named `Frontend CI`.
2. Confirm it is listed under **Required** — not just present but *required*.
   GitHub shows this in the merge-box summary.
3. If the check name differs (e.g. a renamed workflow or a composite name), it
   will **not** satisfy the rule. The protection config matches by exact name.

**If `Frontend CI` is missing entirely**, the workflow file may not be triggered
by the PR's branch pattern. Check the workflow's `on.pull_request` config.

## Step 3 — Confirm at least 1 approval (no self-approval)

Protection requires **at least 1 approving review** and **disallows self-approval**.

1. On the PR's **Files changed** tab, open the **Reviews** section.
2. Look for at least one entry with state **Approved**.
3. Verify the approver is **not the PR author**. GitHub will show the author as
   `(Author)` next to their name — an approval from that user does not count.

**Self-approval is disabled by configuration.** If you see the author's own
approval listed, it was granted before the rule was enabled or on a different
branch. It does not unblock the merge.

## Step 4 — Verify stale approvals are dismissed

Protection is configured to **dismiss stale pull request approvals when new commits
are pushed**. This means any approval is invalidated when the PR author pushes
additional commits.

1. In the **Reviews** section, look for entries with state **Dismissed**.
2. A dismissed review is expected — it means new code was pushed after approval.
   This is not an error; the reviewer must re-approve.
3. Confirm there is at least one **current** (non-dismissed) approval from a
   non-author.

**Quick check:** if the merge box says "Review required" despite an old
approval, this is the most common cause — the approval was dismissed by a
subsequent push.

## Step 5 — Confirm conversation is resolved

Protection requires **conversation resolution** before merging. Every review
comment thread must be marked resolved.

1. On the PR's **Conversation** tab, look for unresolved threads. GitHub highlights
   these with an orange dot or shows "N conversations not resolved" near the merge
   box.
2. Click each thread and confirm it is either:
   - Marked **Resolved** by the commenter, or
   - Outdated (superseded by new code) — click **Resolve conversation** manually.
3. **File-review comments** count. Inline suggestions, request-for-changes, and
   general comments all create threads that must be resolved.

> A PR can have zero comments and still fail this check if a prior review left
> threads that were never resolved. Check the full conversation history, not just
> the most recent review.

## Step 6 — Confirm CI passes (lint, type-check, test, build)

`Frontend CI` runs four stages. All must pass. The workflow executes, in order:

1. **Lint** — `npm run lint` (ESLint). Failures here block the workflow.
2. **Type-check** — `npm run type-check` (TypeScript, `tsc --noEmit`). Failures
   block the workflow.
3. **Test** — `npm test` (run if the `test` script exists in `package.json`).
   Failures block the workflow.
4. **Build** — `npm run build` (Next.js production build). Failures block the
   workflow.

**If CI is failing locally but passing in GitHub**, check that your local branch
is up to date — the protection rule also requires **branches to be up to date
before merging**. Run:

```bash
git fetch origin main && git rebase origin/main
```

Then push and confirm CI re-runs on the updated branch.

**If CI passes but the merge button stays disabled**, re-check Steps 3–5. A
hidden dismissed approval or unresolved thread is the usual culprit.

## Related Documents

- [`.github/BRANCH_PROTECTION.md`](../../.github/BRANCH_PROTECTION.md) — the source of truth for protection rules
- [`diagnose-wallet-connection-failure.md`](./diagnose-wallet-connection-failure.md) — if the PR is blocked by a wallet-related test failure
- [`onboard-mobile-app-to-ci.md`](./onboard-mobile-app-to-ci.md) — adding new CI checks to the required set
