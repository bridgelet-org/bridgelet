# Analytics ↔ Webhook Signal Consistency: Resolution Tracker

> **Purpose.** Resolve the backend/frontend question recorded in
> `docs/analytics-spec.md` §9.2 (*Confirmation signal consistency*): do the
> analytics events and the bridgelet-sdk webhooks describe the same completed
> backend outcome for a claim? This document is the tracked resolution and the
> cross-repo follow-up checklist. It is documentation only — no event is renamed
> and no runtime behaviour changes here.
>
> Companion docs in this repo: `docs/analytics-spec.md` (§4.3, §5.3, §7.4, §9.2),
> `docs/analytics-kpi-readiness-audit.md`, `docs/analytics-server-vs-client-decision.md`,
> `docs/analytics-kpi-definitions.md`.
>
> Cross-repo companion: `bridgelet-sdk`'s
> `webhook-delivery-vs-chain-event-consistency.md` (in the
> `bridgelet-org/bridgelet-sdk` repository). That document is the source of
> truth for webhook delivery semantics; this one is the analytics-side
> counterpart. Refer to it by name here because it is not part of this repo.

## 1. Resolution summary

The signals are consistent only if both surfaces define "confirmed" the same
way: **the on-chain outcome has been observed and the backend state has been
persisted.** Delivery of an HTTP request or webhook, and the sender's signature
or submission, are *intent* signals and are never success on either surface.

| Concept | Analytics event | Backend webhook | Shared meaning of "confirmed" |
|---------|-----------------|-----------------|--------------------------------|
| Payment exists / funded | `Payment Created` | `account.created` | Funding transaction confirmed on-chain, claim ID returned, funded account initialized **and persisted**. A signed transaction or accepted create request is not enough. |
| Claim redeemed / swept | `Claim Succeeded` | `sweep.completed` | Redemption sweep succeeded and is confirmed on-chain. A submitted claim, authorization, or partial sweep is not success. |

The mapping is the one already recorded in `docs/analytics-spec.md` §9.2; this
document makes it a tracked, owned resolution rather than a table with no
follow-up.

## 2. The shared meaning of "confirmed"

Both surfaces must agree on these three points, so they can never disagree about
whether the same payment is confirmed:

1. **On-chain confirmation is required.** "Confirmed" means the Stellar ledger
   has recorded the funded account (`account.created` / `Payment Created`) or
   the completed sweep (`sweep.completed` / `Claim Succeeded`). A request being
   accepted, signed, or submitted is not confirmation.
2. **Persistence is part of the boundary.** The backend emits the webhook only
   after the state change is persisted, and `Payment Created` is defined the
   same way (§4.3 of the spec). A confirmed transaction that has not been
   persisted is still in-flight, not success.
3. **Correlate on stable identity.** Use the claim/account `claim_id` to join the
   analytics event to the webhook record. For `sweep.completed`, retain the
   webhook's transaction hash for reconciliation. Never join on a user identity
   or on an unvalidated URL token.

### Intent signals are never success

| Intent signal | Surface | Why it is not success |
|---------------|---------|-----------------------|
| `Payment Confirmed` | Analytics | Fires when the sender signs, *before* blockchain confirmation (spec §4.3). A signed transaction can still fail; use `Payment Created` for success and `Payment Creation Failed` for the failure bucket (spec §7.4). |
| `Claim Submitted` | Analytics | Fires before the sweep is executed (spec §5.3). Use `Claim Succeeded` for success. |
| Webhook delivery attempts / retries | bridgelet-sdk | Delivery is transport-level: a retry or an HTTP success response does not change the on-chain outcome. Only the event payload's meaning (`account.created`, `sweep.completed`) carries success semantics. |
| `sweep.partial` / `sweep.failed` webhooks | bridgelet-sdk | Explicitly not success; they must not produce `Claim Succeeded` (spec §9.2). |

**Dashboard rule (spec §7.4, binding):** a payment is successful only when
`Payment Created` is present for the `claim_id`. `Payment Confirmed` alone is
intent and must not be counted; signed-then-failed payments must not inflate
success metrics. This rule applies identically to webhook-derived dashboards.

## 3. Cross-repo follow-up: owner and checklist

**Resolution owner:** Analytics & Backend (joint). The analytics-side owner
maintains this document; the bridgelet-sdk side maintains
`webhook-delivery-vs-chain-event-consistency.md`. Changes to the shared meaning
of "confirmed" require an update to both documents in the same change.

**Checklist (tracked here until each item is closed in its own repo):**

- [ ] **SDK doc alignment** — confirm `bridgelet-sdk`'s
      `webhook-delivery-vs-chain-event-consistency.md` states the same two
      mappings: `account.created` ⇒ funded/persisted, `sweep.completed` ⇒
      redeemed/confirmed; and that `sweep.partial` / `sweep.failed` are not
      success. *(Owner: backend.)*
- [ ] **Delivery ≠ outcome** — confirm SDK webhook delivery attempts/retries are
      documented as transport-level and never treated as success signals.
      *(Owner: backend.)*
- [ ] **Spec cross-reference** — keep `docs/analytics-spec.md` §9.2 pointing at
      this document and at the two event↔webhook rows in sync with both repos.
      *(Owner: analytics.)*
- [ ] **Identity/reconciliation** — confirm both surfaces retain the stable
      claim/account id (and the `sweep.completed` transaction hash) so a single
      payment can be reconciled across the two records (spec §9.2, §9.4).
      *(Owner: backend + analytics.)*
- [ ] **Dashboard acceptance** — verify dashboard/BI success filters use
      `Payment Created` only, deduplicate on `claim_id`, and never count
      `Payment Confirmed` or webhook delivery attempts as success (spec §7.4).
      *(Owner: analytics.)*
- [ ] **Drift check** — event names stay in `packages/analytics/src/index.ts`
      (`ANALYTICS_EVENT_NAMES`); do not rename events to resolve a semantic
      mismatch. The `.github/workflows/analytics-spec-diff.yml` drift check must
      continue to pass. *(Owner: analytics.)*

## 4. Status

This is a documentation resolution. No query has been executed, no event export
was checked, and nothing was built, linted, or tested for this document (see the
honesty gate in `docs/analytics-kpi-readiness-audit.md` §1). The checklist above
is the follow-up work that remains to verify the resolution against both repos
and a live event export.
