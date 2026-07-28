# Runbook: Review the Analytics Spec Before Adding a New Event

**Issue:** [#290](https://github.com/northersubair/bridgelet/issues/290)
**Purpose:** Pre-flight checklist for adding a new analytics event. Completing
these steps before writing tracking code prevents naming drift, payload
inconsistencies, and spec/code divergence.

---

## Step 1 — Search the spec for existing similar events

Open [`docs/analytics-spec.md`](../../../docs/analytics-spec.md) and search for
events in the same domain before inventing a new one.

| What to search | Why |
|---|---|
| The noun you plan to use (e.g. `Payment`, `Claim`, `Wallet`) | An event may already exist for this object |
| The verb you plan to use (e.g. `Created`, `Failed`) | Combining an existing noun with an existing verb may be redundant |
| The journey section you expect the event to live in | Sender events are in §4, recipient events in §5, errors in §6 |

If a semantically identical event already exists, **stop** — do not add a
duplicate. If a close-but-not-identical event exists, note the distinction in
your PR description so reviewers can evaluate whether one event should be reused
or a new one is warranted.

## Step 2 — Verify the naming follows `Noun Verb` Title Case

The spec mandates a strict naming format (§2.1):

```
<Noun> <Past-Tense Verb>
```

Rules to check:

- **Title Case** — `Claim Link Shared`, not `claim_link_shared` or
  `claimLinkShared`
- **Past tense verb only** — `Payment Created`, not `Create Payment` or
  `Payment Create`
- **No abbreviations** — `Wallet Address Entered`, not `Wallet Addr Entered`
- **Error events prefix with `Error`** — `Error Displayed`, not `show_error`
- **snake_case for payload keys** — `asset_type`, not `assetType`

A quick test: does the event name read naturally as a sentence fragment?
*"Payment Created"* works. *"Send Payment"* does not (that is imperative, not
past tense).

## Step 3 — Verify the payload matches the standard structure

Every event must include the **base payload** defined in §3.1 of the spec:

```jsonc
{
  "anonymous_id": "string",
  "session_id": "string",
  "journey": "sender | recipient | shared",
  "timestamp": "ISO 8601 string",
  "platform": "web",
  "network": "testnet | mainnet",
  "user_agent": "string",
  "device_type": "mobile | tablet | desktop",
  "referrer": "string | null",
  "app_version": "string"
}
```

Then check whether your event needs any **conditional properties** from §3.2:

- `claim_id` — if the event relates to a specific claim
- `asset_type` — if the event involves a particular asset
- `amount_usd_equiv` — if the event involves a monetary amount
- `expiry_days` — if the event involves link expiry
- `error_code` / `error_type` — if the event reports an error

Do not add custom properties without first checking whether an existing
conditional property already covers the data you need. The spec is the single
source of truth for payload shape.

## Step 4 — Update the spec before implementing code

The spec is defined as a **design document, not an after-the-fact record** (§1
states: *"This document defines what to track and how to structure it. It does
not implement any tracking code."*).

Update `docs/analytics-spec.md` with your new event **before** writing the
tracking implementation. Specifically:

1. Add the event name and description to the appropriate journey section
   (§4 Sender, §5 Recipient, or §6 Error & Edge Cases).
2. Include a row in the journey's event table with the event name, trigger
   condition, and any event-specific properties.
3. If the event introduces a new conditional property, add it to the §3.2 table.

This ordering ensures the spec remains the authoritative reference. A PR that
ships tracking code without a spec update will be flagged in review.

## Step 5 — Confirm the event appears in the correct journey section

After updating the spec, verify placement:

- **Sender journey (§4):** Events triggered by Alice's actions — creating a
  payment, copying a link, connecting a wallet.
- **Recipient journey (§5):** Events triggered by Bob's actions — opening a
  claim link, submitting a claim, connecting a wallet.
- **Error & Edge Cases (§6):** Events that fire on failures or exceptional
  conditions — network errors, validation failures, timeouts.

If the event can occur in **either** journey, use `journey: "shared"` in the
payload and place it in whichever section is most natural. Note the cross-
applicability in the event description.

---

## Checklist summary

- [ ] Searched `docs/analytics-spec.md` for duplicates or near-matches
- [ ] Name follows `Noun Verb` Title Case, past tense
- [ ] Payload includes all base fields (§3.1) plus relevant conditional fields
- [ ] Spec updated with the new event before code implementation
- [ ] Event placed in the correct journey section

## Related Documents

- [`docs/analytics-spec.md`](../../../docs/analytics-spec.md) — the canonical event spec
- [`analytics-spec-overview.md`](../glossary/analytics-spec-overview.md) — glossary entry summarizing the spec structure
- [`analytics-events-vs-onchain-outcomes.md`](../integration-notes/analytics-events-vs-onchain-outcomes.md) — which events are confirmed on-chain vs optimistic
- [`investigate-analytics-event-gap.md`](investigate-analytics-event-gaps.md) — runbook for when an expected event is missing from dashboards
