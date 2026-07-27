# The check-then-call race window in `expireAccount()`

**Status:** Documented / accepted risk (low)  
**Area:** Bridgelet SDK — account expiry path  
**Pattern:** Time-of-check to time-of-use (TOCTOU)

---

## What TOCTOU is

A **time-of-check to time-of-use** (TOCTOU) bug is a race between two steps that are not atomic:

1. **Check** — read some state and decide an action is allowed.
2. **Use** — perform that action, assuming the check still holds.

Anything that can change the relevant state in the gap—another request, another worker, an on-chain transaction—can invalidate the decision the check made. Classic examples include filesystem `access()` then `open()`, or “is this coupon unused?” then “redeem it” without a lock or atomic update.

In distributed systems the gap is often unavoidable: an off-chain service checks a database or cached view, then submits a blockchain transaction that settles later. The pattern is not automatically a vulnerability; severity depends on what can happen if the world changes between check and use, and on whether the **use** step is itself safe under concurrent or repeated execution.

---

## This instance: `expireAccount()`

In the SDK expiry path, `expireAccount()` (and related helpers) typically follow a check-then-call shape:

1. **Check** — confirm the ephemeral account looks eligible to expire (status, wall-clock or ledger-derived expiry, not already claimed/expired in local state).
2. **Call** — invoke the on-chain `expire()` entrypoint so unclaimed funds (and related reserves, where implemented) move to the recovery address.

Between those steps, concurrent activity can intervene. Examples:

- A recipient claim/sweep lands and completes on-chain.
- Another expiry worker or retry submits `expire()` for the same account.
- Local DB status lags behind chain state, so the check is optimistic.

That gap is a real TOCTOU window: the check’s conclusion is not guaranteed to still be true when `expire()` executes.

---

## Why this instance is likely low-risk

On-chain `expire()` is designed to be **idempotent** (and gated by contract state): once the account is past `expiry_ledger` and still in a state that allows recovery, a successful `expire()` transitions the account into a terminal expired/recovered state. A second `expire()` after that should no-op or fail cleanly rather than move funds again. Contract-level rules also prevent treating an already-swept/claimed account as if it still held reclaimable payment funds for a second payout.

Given that:

| Concurrent event between check and call | Likely outcome |
| ---------------------------------------- | -------------- |
| Second `expire()` for the same account | Duplicate call is harmless if the first already succeeded; at worst a failed or no-op transaction and noisy logs/retries. |
| Claim/sweep completes first | `expire()` should reject or find nothing left to recover for the payment path; funds already went to the claim destination, which is the intended success path—not a double payout to recovery. |
| Stale “still unclaimed” local check | Chain is source of truth at use-time; a bad check may waste a transaction attempt, not invent a new entitlement. |

So the race tends to produce **operational friction** (failed txs, retries, temporary DB/chain skew) more than **fund-loss or double-spend** scenarios, as long as `expire()` remains the authoritative, idempotent sink for recovery.

That is **not** the same as risk-free. Residual concerns remain if, for example:

- Off-chain bookkeeping marks an account expired or recovered before the chain confirms, and later logic trusts that mark for payouts or UX.
- Callers assume “check passed ⇒ call will succeed” and skip handling already-claimed / already-expired errors.
- Contract semantics for `expire()` change (lose idempotency, broaden who can call it, or alter recovery amounts) without revisiting this path.
- Retries amplify load or confuse monitoring without careful deduplication.

Treat the window as **present but mitigated by on-chain semantics**, not as absent.

---

## Lesson: write down “probably fine because X”

Findings like this are easy to close with an unspoken assumption: “it’s fine—`expire()` is idempotent.” That reasoning is load-bearing. If someone later:

- softens on-chain checks,
- adds a new off-chain side effect between check and call (webhooks, balance credits, status flips),
- or ports expiry to a path that is **not** idempotent,

the same TOCTOU shape can become high-severity without anyone noticing the original justification disappeared.

**Practice:** when accepting a race as low-risk, record the explicit premise in the same place as the finding—for example:

> Probably fine **because** on-chain `expire()` is idempotent and is the sole authority for recovery transfers; the race should not create a second payout.

Revisit that sentence whenever `expire()`, account status transitions, or the SDK’s check-then-call sequence change. Implicit safety assumptions are the ones that rot first.
