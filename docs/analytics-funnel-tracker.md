# Analytics Funnel Tracker

> Companion to `analytics-spec.md` §7 (Conversion Funnel Definitions).
> This document is the *blocking-epic tracker* for the two product funnels.
> **Do not build a funnel dashboard until every stage below reports real
> data.** Any dashboard built before that would show zeros or stale data,
> which is worse than none (`analytics-spec.md` §7.2 issue #617).

## Rule

Each funnel stage names the event that must fire for that stage to count.
A stage is only "implemented" when:

1. the event fires from production app code (not a console mock), and
2. it carries the §3.1 base payload fields required for attribution.

Until **every** stage of a funnel is marked implemented (✔), the funnel
itself must be treated as a blocking dependency and no derived funnel view
may be shipped.

---

## §7.1 Sender Activation Funnel

`Page Viewed → Send Form Started → Send Form Completed → Wallet Connected → Payment Confirmed → Payment Created → Claim Link Shared`

| # | Stage event | Spec | Feeder issue | Status |
|---|-------------|------|--------------|--------|
| 1 | `Page Viewed` (homepage) | §4.1 | #558 | ⬜ open |
| 2 | `Send Form Started` | §4.2 | #560 | ⬜ open |
| 3 | `Send Form Completed` | §4.2 | #562 | ⬜ open |
| 4 | `Wallet Connected` | §4.3 | #564 | ⬜ open |
| 5 | `Payment Confirmed` | §4.3 | #566 | ⬜ open |
| 6 | `Payment Created` | §4.3 | #567 | ⬜ open |
| 7 | `Claim Link Shared` | §4.4 | #571 | ⬜ open |

**Blocked until:** #558, #560, #562, #564, #566, #567, #571 all merge.

## §7.2 Recipient Claim Funnel

`Claim Page Opened → Claim Verified → Claim CTA Clicked → Wallet Address Entered → Claim Submitted → Claim Succeeded`

| # | Stage event | Spec | Feeder issue | Status |
|---|-------------|------|--------------|--------|
| 1 | `Claim Page Opened` | §5.1 | #577 | ⬜ open |
| 2 | `Claim Verified` | §5.1 | (constituent issues closed by #713) | ✔ implemented (PR #713) |
| 3 | `Claim CTA Clicked` | §5.1 | (constituent issues closed by #713) | ✔ implemented (PR #713) |
| 4 | `Wallet Address Entered` | §5.2 | — no open per-event issue | ⬜ blocked (needs tracking issue) |
| 5 | `Claim Submitted` | §5.3 | #584 | ⬜ open |
| 6 | `Claim Succeeded` | §5.3 | #585 | ⬜ open |

**Blocked until:** #577, #584, #585 merge **and** a per-event tracking issue
for `Wallet Address Entered` is opened and merged.

## Notes

- The full end-to-end funnel (§7.3) derives from these two funnels plus
  `Payment Created` (#567); it inherits both blockers and must not be
  measured before they clear.
- `Error Displayed` instrumentation (§6, `error_type` taxonomy) is required
  to break down Claim Failure Rate by cause; those surfaces are wired in
  parallel per-error-type contributions.