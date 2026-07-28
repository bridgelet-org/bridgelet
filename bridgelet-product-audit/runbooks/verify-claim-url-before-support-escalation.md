# Runbook: Verify a Claim URL Before Escalating

First-line triage for "I can't claim my funds." Work these steps before involving
engineering — most reports resolve here.

## Step 1 — Check the URL survived transmission

Claim URLs carry the token as a **path segment** (`/claim/<token>`), so truncation
silently changes *which* claim is requested rather than producing an obviously
broken link. Ask the user to paste the full link back and check:

- Is there a `/claim/` segment followed by a non-empty token?
- Does it end mid-token or with an ellipsis (`…`)? Messaging apps shorten long
  links for display, and users copy the *displayed* text.
- Did a link preview or tracking wrapper rewrite it?

Have them copy from the **original message** — not the browser bar after a failed
attempt, and not a forwarded copy. Expected shape:
[`claim-url-security-properties.md`](../integration-notes/claim-url-security-properties.md).

> The token is a **bearer credential** — anyone holding it can claim. Don't paste
> claim URLs into shared channels or ticket bodies.

## Step 2 — Check for a terminal on-chain state

If the URL is intact, ask whether the claim is already over. Per bridgelet-audit's
`account-status-state-machine.md`, an account can reach a state no claim can
succeed from:

- **Already swept** — someone completed the claim. A user who succeeded on their
  phone and is retrying on a laptop lands here.
- **Expired** — the window closed and funds were reclaimed.

Neither is a bug; neither is fixed by retrying.

## Step 3 — Frontend issue or terminal state?

| Signal | Likely cause | Action |
|---|---|---|
| Claim rejected with a specific reason | Terminal on-chain state | Explain; don't escalate |
| Generic "please try again" | **Ambiguous** | Escalate with details |
| Page won't load / blank | Frontend | Escalate |
| Address rejected as invalid | User input | Re-check the `G...` address |

The ambiguous row matters: a generic message may be a *specific* error that lost
its identity in transit — see
[`three-repo-error-surface-consistency.md`](../integration-notes/three-repo-error-surface-consistency.md).
Never conclude "already swept" from generic text; confirm actual status first.

**When escalating,** include the full claim URL (secure channel), destination address, exact on-screen message, timestamp and browser.
