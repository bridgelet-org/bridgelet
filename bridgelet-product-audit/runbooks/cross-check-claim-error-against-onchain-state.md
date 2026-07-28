# Runbook: Cross-Check Claim Error Against On-Chain State

For verifying whether the error message shown to a user matches the actual on-chain
failure reason. This is the product-side counterpart to bridgelet-sdk-audit's
`error-mapping-completeness-checklist.md` — it confirms that error identity
survives the three-repo chain from contract to UI.

See [`three-repo-error-surface-consistency.md`](../integration-notes/three-repo-error-surface-consistency.md)
for background on where error identity is lost.

## Step 1 — Note the exact error message shown to the user

Capture the **exact text** the user sees. Do not paraphrase. The distinction
between a specific error and a generic one is the entire point:

- **Specific:** "This claim has already been swept" — the user should stop trying.
- **Generic:** "Claim could not be completed. Please try again." — ambiguous; the
  user retries something that may be irreversible.

Ask the user for:

1. The **full error text** (screenshot or copy-paste).
2. The **claim URL** they used (`/claim/<token>`).
3. The **destination address** they pasted (the `G...` address).
4. **When** they attempted the claim (timestamp helps correlate with chain state).

> The claim URL is a bearer credential. Handle it in a private channel, not a
> public ticket body.

## Step 2 — Use bridgelet-sdk's API to check on-chain account state

The SDK exposes account state that mirrors what the contract holds. Use it to
establish ground truth independent of what the frontend displays:

**Option A — SDK method (if you have SDK access):**

```ts
import { BridgeletClient } from 'bridgelet-sdk';

const client = new BridgeletClient({ network: 'testnet' });
const info = await client.getAccountInfo(destinationAddress);
console.log(JSON.stringify(info, null, 2));
```

**Option B — Horizon / Stellar Explorer:**

1. Look up the destination address on
   [Stellar Expert](https://stellar.expert) or the Horizon API.
2. Check the account's **claimable balances** and **signers**.
3. If the account has been swept, the balance will be zero and the claimable
   balance will no longer exist.

**What to look for:**

| On-chain state        | Expected error (specific)   | Generic "try again" is wrong? |
| --------------------- | --------------------------- | ----------------------------- |
| Account exists, funds present | "Invalid token" or "Wrong address" | Yes — user likely mistyped  |
| Account exists, already swept | "Already swept"              | **Yes — critical mismatch**   |
| Account expired, reclaimed    | "Claim expired"             | **Yes — user can't retry**    |
| Account not found             | "Invalid claim URL"         | Depends on context            |

## Step 3 — Compare displayed error against actual failure reason

Map what the user sees (Step 1) against what the chain says (Step 2):

1. **Is the error specific?** If the user sees "Already swept" and the chain
   confirms the account is swept — the error is accurate. No action needed.
2. **Is the error generic?** If the user sees "Claim could not be completed.
   Please try again." but the chain shows the account was already swept — this
   is a **mismatch**. The user is being told to retry something that cannot
   succeed.
3. **Is the error missing entirely?** If the page shows no error but the
   transaction failed — check the browser console for thrown errors that were
   not rendered to the UI.

**The critical case** (per `three-repo-error-surface-consistency.md`): a genuine
`AlreadySwept` contract error that degrades to a generic "please try again"
message. This is the most user-harmful mismatch because it actively encourages
retrying an irreversible state.

## Step 4 — Check if the `??` fallback collapsed a specific error

The claim path in the frontend throws:

```ts
throw new Error(result.error ?? 'Claim could not be completed. Please try again.');
```

The `??` (nullish coalescing) operator falls back to the generic message when
`result.error` is `null` or `undefined`. This means:

- **If `result.error` is populated:** the specific error reaches the user. The
  `??` does not fire.
- **If `result.error` is `null`/`undefined`:** the generic message fires, and the
  specific reason is lost.

**Where to check:**

1. Open the browser DevTools **Network** tab.
2. Find the failed request to the claim endpoint (likely a POST).
3. Inspect the **response body**. Look for an `error` field:
   - If `error` is present and non-empty → the SDK did propagate the error;
     check why the frontend isn't showing it.
   - If `error` is `null` or missing → the SDK did not propagate the error; this
     is a backend-side issue (see bridgelet-sdk-audit's
     `error-mapping-completeness-checklist.md`).

**Also check the SDK layer.** The SDK identifies contract errors by **string
matching** (per `error-string-matching.md` in bridgelet-sdk-audit). If the
contract error text was reworded, the match silently stops firing and the error
degrades to an unrecognised variant — nothing fails loudly.

## Step 5 — Document the discrepancy if found

If you confirmed a mismatch between on-chain state and the displayed error:

1. **Write up the finding** with:
   - The exact error text shown to the user
   - The actual on-chain state (from Step 2)
   - The response body from the API (from Step 4)
   - Which layer dropped the error identity (contract → SDK, SDK → API response,
     or frontend fallback)
2. **Classify the severity:**
   - **High** if the error encourages retrying an irreversible action (e.g.
     `AlreadySwept` → "try again")
   - **Medium** if the error is wrong but not harmful (e.g. shows "expired" when
     the real reason is "wrong address")
   - **Low** if the error is generic but the user isn't misled
3. **File in the correct repo.** If the error was lost in the SDK layer, file
   against `bridgelet-sdk`. If the `??` fallback is the cause, file against the
   frontend repo. If the contract text changed, file against `bridgelet-core`.

> This finding should also be added to bridgelet-sdk-audit's
> `error-mapping-completeness-checklist.md` as a concrete case to verify in the
> SDK's string-matching layer.

## Related Documents

- [`three-repo-error-surface-consistency.md`](../integration-notes/three-repo-error-surface-consistency.md) — the full chain from contract error to UI message
- [`verify-claim-url-before-support-escalation.md`](./verify-claim-url-before-support-escalation.md) — first-line triage for claim failures
- [`diagnose-lobstr-connection-confusion.md`](./diagnose-lobstr-connection-confusion.md) — LOBSTR-specific claim issues (paste flow)
- [`security-disclosure-triage-product.md`](./security-disclosure-triage-product.md) — if the discrepancy has security implications
