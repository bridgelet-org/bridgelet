# Runbook: Security Disclosure Triage (Product)

For triaging security reports that land in the product team's inbox — typically
from external researchers or internal QA. This runbook determines whether a report
falls within the frontend/mobile scope, distinguishes it from SDK or core issues,
and routes it to the right channel.

**Do not investigate the vulnerability yourself.** Triage means classify and
route, not reproduce or fix.

## Step 1 — Cross-reference SECURITY.md for the documented disclosure process

Before anything else, confirm the report arrived through an approved channel.
[SECURITY.md](../../SECURITY.md) defines:

- **Private disclosure email:** aminubabafatima8@gmail.com
- **Do not open public GitHub issues** for security vulnerabilities
- **Do not exploit** beyond what is necessary to demonstrate the issue

If the report arrived as a public GitHub issue, a Twitter thread, or a Discord
message:

1. **Do not discuss details publicly.**
2. Ask the reporter to resend via the private email.
3. If the issue is already public, treat it as an **active disclosure** and
   escalate immediately to the security lead — the coordinated disclosure
   timeline in SECURITY.md is already breached.

Check the **response timeline** commitments:

| Timeframe         | Action                                    |
| ----------------- | ----------------------------------------- |
| 24–48 hours       | Initial acknowledgment                    |
| 3–5 business days | Preliminary assessment and severity class |
| 7–14 days         | Status update on investigation            |
| 30–90 days        | Target resolution                         |

If the initial acknowledgment window has passed without a response, flag this to
the security lead.

## Step 2 — Distinguish frontend-only vs SDK/core issues

The Bridgelet ecosystem spans three repos with different security profiles:

| Repo            | Scope                                  | Triage owner     |
| --------------- | -------------------------------------- | ---------------- |
| `bridgelet`     | Frontend UI, wallet display, claim UX  | Product team     |
| `bridgelet-sdk` | Backend SDK, API, key management       | SDK team         |
| `bridgelet-core`| Smart contracts, fund sweep, auth      | Core/protocol    |

**Frontend-only signals** (your scope):

- The issue is reproducible in the browser with no server-side component
- It involves rendering, DOM manipulation, or client-side state
- The reporter mentions React, Next.js, or browser DevTools

**SDK/core signals** (route out):

- The issue involves API key handling, private key exposure, or signing
- It references smart contract behavior, authorization bypass, or fund sweep
- The reporter mentions Rust, Soroban, or on-chain transactions

**If unclear**, ask the reporter which component they believe is affected and
note the answer — do not assume.

## Step 3 — Check if the issue is client-side

For issues within frontend scope, classify the attack surface:

**XSS (Cross-Site Scripting):**

- Can the attacker inject script via a Stellar address, claim token, or error
  message?
- Does the claim URL path (`/claim/<token>`) pass user input into the DOM
  unsanitized?
- Check if `dangerouslySetInnerHTML` or raw `href` attributes handle attacker
  input.

**Data exposure:**

- Does the UI display information that should be hidden (e.g. other users'
  addresses, internal error details)?
- Check `localStorage` usage — `bridgelet_wallet` stores `{ publicKey, type }`
  but no secrets. If the reporter claims secret material is stored, verify
  against `frontend/lib/wallet.ts`.

**Wallet handling:**

- Does the issue involve connecting, signing, or submitting transactions?
- Is the reporter's secret key ever requested or displayed? If so, this is
  critical — Bridgelet should never handle secret keys.
- Check the wallet connection flow in `frontend/lib/wallet.ts` for any path
  that touches secret material.

> Per SECURITY.md's security model, Bridgelet implements "No Seed Phrase
> Exposure" as a core feature. Any report suggesting otherwise is high-severity
> until proven otherwise.

## Step 4 — Assess impact scope

Determine whether the issue affects all users or a subset:

| Scope                         | Severity signal | Example                                    |
| ----------------------------- | --------------- | ------------------------------------------ |
| All users, any wallet         | Critical/High   | XSS on claim page via crafted token        |
| All users, specific wallet    | High            | Freighter connection leak in all browsers   |
| Specific user, specific chain | Medium          | Display glitch for one LOBSTR address       |
| Requires physical device      | Low             | Local-only dev tools exposure               |

**Claim page issues are high-scope by default.** The claim URL is a bearer
credential — anyone with the link can reach the page. If an attacker can craft
a URL that triggers XSS on the claim page, every recipient who clicks the link
is affected.

**Check network scope.** The config may behave differently on Testnet vs
Mainnet. Ask the reporter which network they tested on — Testnet-only issues
are lower severity but still in scope if the same code path exists on Mainnet.

## Step 5 — Escalate to the appropriate channel

Based on the triage above, route the report:

| Classification           | Route to                  | Channel               |
| ------------------------ | ------------------------- | --------------------- |
| Frontend XSS             | Security lead + frontend  | Private email + Slack |
| Frontend data exposure   | Security lead             | Private email         |
| Wallet handling flaw     | Security lead + SDK team  | Private email + Slack |
| SDK/backend issue        | SDK team lead             | Private email         |
| Smart contract issue     | Core/protocol team lead   | Private email         |
| Unclear / cross-cutting  | Security lead             | Private email         |

**For all escalations, include:**

1. Reporter name and contact (unless anonymous)
2. Affected component (frontend, SDK, core)
3. Severity assessment from Step 4
4. Network (Testnet or Mainnet)
5. Whether the issue is publicly disclosed

**Do not include** reproduction steps or proof-of-concept details in public
channels. Attach those as private files or link to a private document.

## Related Documents

- [SECURITY.md](../../SECURITY.md) — full security policy, disclosure process, and response timelines
- [`.github/BRANCH_PROTECTION.md`](../../.github/BRANCH_PROTECTION.md) — CI gates that prevent merging vulnerable code
- [`verify-claim-url-before-support-escalation.md`](./verify-claim-url-before-support-escalation.md) — if the security report is claim-URL-related
- [`three-repo-error-surface-consistency.md`](../integration-notes/three-repo-error-surface-consistency.md) — understanding which repo owns which error path
