## Summary

Briefly describe the change and why it is needed.

## Testing

Describe how this was tested (commands run, manual checks). If tests were not run, say so explicitly.

## Checklist

- [ ] I have read and followed the contribution and branch-protection guidance in this repository.
- [ ] I have added or updated tests where they exist, or explained why not.
- [ ] **Analytics spec:** if this PR adds, renames, or changes a tracking call or event payload, I have read `docs/analytics-spec.md` and, where needed, updated it in this same PR.
- [ ] If I added a new tracking call, I followed the pre-flight runbook `runbooks/review-analytics-spec-before-new-event.md` (in the `bridgelet-product-audit` runbooks) before adding it, so the spec is updated before the code.
- [ ] I have kept event names in sync with `packages/analytics/src/index.ts` (`ANALYTICS_EVENT_NAMES`) so the analytics-spec drift check continues to pass.
- [ ] "Successful payment" means `Payment Created` for the `claim_id` — never `Payment Confirmed`, which is intent only (spec §7.4).
