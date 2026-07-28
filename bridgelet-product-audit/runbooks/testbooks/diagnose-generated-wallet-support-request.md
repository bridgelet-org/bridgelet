# Diagnose: Generated Wallet Support Request

> **Status:** Placeholder — not yet actionable
> **Created:** 2026-07-27
> **Part of:** bridgelet-product-audit knowledge-base initiative

## Summary

This runbook covers diagnosis and response for a future support request related to the `generated` wallet type — a Stellar keypair created client-side by `generateNewWallet()` in `frontend/lib/wallet.ts`.

## Current State

`generateNewWallet()` is **currently unused in the UI**. It exists in the codebase as an exported utility but is not wired into any user-facing flow. Therefore, **no real incidents of this type have occurred**, and this runbook has no real incidents to describe at this time.

## Open Questions

The following questions must be answered before this runbook can be meaningfully completed:

| # | Question | Why it matters |
|---|----------|----------------|
| 1 | **Storage location** — If `generateNewWallet()` is wired into the UI, where will the generated secret key be stored (if at all)? Browser memory? `localStorage`? Encrypted export? | Determines the attack surface and recovery path. |
| 2 | **Recovery mechanism** — If the user loses access to the generated key (tab closed, device lost), is there any recovery path? Is the key backed up server-side? | Without recovery, support requests will require fund return or re-issuance. |
| 3 | **Transmission** — Is the secret key ever transmitted off-device? If so, over what channel and with what protections? | Directly impacts whether a leaked key is a user-side or system-side incident. |
| 4 | **User communication** — How is the user instructed to handle the secret key? Is there an onboarding step, a warning, a copy-to-clipboard flow? | Determines whether a support request is likely user error or a product gap. |

## Recommended Next Steps

1. **Revisit this runbook** as a required step when wiring `generateNewWallet()` into the UI for the first time.
2. Complete the open questions table above during the design phase of that work.
3. Add incident response steps (triage, containment, user communication) once the flow is live.

## References

- `frontend/lib/wallet.ts` — `generateNewWallet()` implementation (T-15 in security model)
- `docs/security-model.mdx` — Threat T-15: "Private key leak from generated wallet"
