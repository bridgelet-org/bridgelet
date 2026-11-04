---
title: Use Cases
description: Real-world Bridgelet use cases with concrete, runnable code samples
---

# Bridgelet Use Cases

**Version:** 1.1 (MVP)  
**Status:** Draft, MVP Phase
**Last Updated:** August 2026  
**Derived from:** `use-cases.pdf` (January 2025)

**Audience:** Product managers, business developers, and implementers.

## Overview

Bridgelet solves a fundamental problem: **how to send crypto payments to people
who don't have wallets yet**. A sender funds a one-time claimable payment link
backed by an ephemeral Stellar account; the recipient opens the link, connects
(or creates) a wallet, and the funds are swept to them instantly.

All successful Bridgelet use cases share these traits:

- Recipients lack crypto wallets
- Payments are one-time or infrequent
- Speed and low friction matter
- Recipients can receive simple notifications (SMS/email)
- Amounts justify the onboarding effort

This document converts the original narrative `use-cases.pdf` into Markdown and
adds **at least one runnable code sample per use case**, written against the
**current** bridgelet-sdk API (see [SDK API contract](#sdk-api-contract-used-by-these-samples)).

## Prerequisites

- A running [bridgelet-sdk](https://github.com/bridgelet-org/bridgelet-sdk) instance
  (local or hosted) and an API key.
- Node.js 18+ (for the `fetch`-based samples) or any HTTP client.
- A funded Stellar account to use as the `fundingSource` for ephemeral accounts.

All samples use plain `fetch` against the SDK's REST API so they work from any
language and do not depend on an unverified SDK wrapper. Set these environment
variables:

```bash
export BRIDGELET_API_URL="https://api.example.com"   # your bridgelet-sdk base URL
export BRIDGELET_API_KEY="your-api-key"               # Bearer token for /accounts
export APP_URL="https://claim.example.com"            # your claim page base URL
```

## SDK API contract used by these samples

The endpoints and field names below are the ones this repo verifies against a
live bridgelet-sdk instance in CI (`scripts/check-sdk-contract.mjs`), so the
samples in this document are tied to the current API rather than an aspirational
one.

| Method | Path                  | Auth            | Purpose                                  |
| ------ | --------------------- | --------------- | ---------------------------------------- |
| POST   | `/accounts`           | Bearer API key  | Create an ephemeral account + claim link |
| GET    | `/accounts/{id}`      | Bearer API key  | Read account/claim status                |
| POST   | `/claims/verify`      | none (unguarded)| Validate a claim token before redemption |
| POST   | `/claims/redeem`      | none (unguarded)| Sweep funds to a recipient wallet        |

### Shared helper

Every sample below imports this small client (save it as `bridgelet.ts`):

```ts
// bridgelet.ts: shared helpers for the samples in this document
const API_BASE = process.env.BRIDGELET_API_URL ?? 'http://localhost:4000';
const API_KEY = process.env.BRIDGELET_API_KEY ?? '';

export interface CreateAccountInput {
  /** Stellar public key (G...) that funds the ephemeral account. */
  fundingSource: string;
  /** Stellar public key funds return to if the claim expires. */
  recovery_address: string;
  /** Decimal amount as a string, e.g. '250.00'. */
  amount: string;
  /** Asset code; defaults to the network's native asset (XLM). */
  asset_code?: string;
  /** Issuer for issued assets (e.g. USDC on mainnet); omit for native. */
  asset_issuer?: string;
  /** Claim lifetime in seconds. */
  expiresIn: number;
  /** Free-form metadata, e.g. recipient name or reference id. */
  metadata?: Record<string, unknown>;
  /** Optional client-side (Freighter) signed transaction XDR. */
  signedTxXdr?: string;
  signerAddress?: string;
  networkPassphrase?: string;
  /** 'backend' (default) or 'freighter-client'. */
  signingMode?: 'backend' | 'freighter-client';
}

export interface AccountResponse {
  accountId: string;
  publicKey: string;
  claimUrl: string | null;
  txHash?: string;
  amount: string;
  asset: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} on ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/** POST /accounts: create an ephemeral account and get its claim link. */
export function createEphemeralAccount(input: CreateAccountInput): Promise<AccountResponse> {
  return request<AccountResponse>('/accounts', { method: 'POST', body: JSON.stringify(input) });
}

/** GET /accounts/{id}: poll claim status (pending_payment, pending_claim, claimed, expired, ...). */
export function getAccount(accountId: string): Promise<AccountResponse> {
  return request<AccountResponse>(`/accounts/${encodeURIComponent(accountId)}`);
}

/** POST /claims/redeem: sweep funds to a recipient's wallet. */
export function redeemClaim(claimToken: string, destinationAddress: string) {
  return request('/claims/redeem', {
    method: 'POST',
    body: JSON.stringify({ claimToken, destinationAddress }),
  });
}

/** Placeholder: deliver the claim link over your own channel (SMS/email/QR). */
export async function notifyRecipient(phoneOrEmail: string, claimUrl: string): Promise<void> {
  console.log(`Notify ${phoneOrEmail}: claim funds at ${claimUrl}`);
}
```

> **Note:** `/claims/verify` and `/claims/redeem` are unguarded on the SDK: the
> claim token is the bearer credential for that single claim. `/accounts` routes
> require the API key; in the reference UI the browser never holds that key
> (account creation is proxied server-side).

## Use Case 1: Payroll for Unbanked Workers

**Scenario:** A construction company employs day laborers, most of whom have no
bank account. Paying in cash is slow, risky, and expensive; mobile money fees
eat 2–5% of wages. With Bridgelet the employer creates one ephemeral account per
worker at the end of the month, each worker receives an SMS with a claim link,
and funds are swept to their wallet (or a newly created one) within minutes.

**Runnable sample (batch payroll):**

```ts
import { createEphemeralAccount, notifyRecipient, type CreateAccountInput } from './bridgelet';

// One row per worker: phone number, amount, optional reference.
const payroll: Array<{ phone: string; amount: string; workerId: string }> = [
  { phone: '+2348012345678', amount: '250.00', workerId: 'W-1001' },
  { phone: '+2348023456789', amount: '250.00', workerId: 'W-1002' },
  // ...500 workers
];

const FUNDING_SOURCE = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // your funding key
const RECOVERY_ADDRESS = FUNDING_SOURCE; // unclaimed wages return here after expiry
const CLAIM_TTL_SECONDS = 7 * 24 * 60 * 60; // one week to claim

async function runPayroll(): Promise<void> {
  const results = [];
  for (const worker of payroll) {
    const input: CreateAccountInput = {
      fundingSource: FUNDING_SOURCE,
      recovery_address: RECOVERY_ADDRESS,
      amount: worker.amount,
      asset_code: 'XLM',
      expiresIn: CLAIM_TTL_SECONDS,
      metadata: { workerId: worker.workerId, payrollCycle: '2026-08' },
    };
    const account = await createEphemeralAccount(input);
    // claimUrl is the relative claim path; build the absolute link for SMS.
    await notifyRecipient(worker.phone, `${process.env.APP_URL}${account.claimUrl}`);
    results.push({ workerId: worker.workerId, accountId: account.accountId, ok: true });
  }
  console.log(`Created ${results.length} ephemeral accounts for payroll.`);
}

runPayroll().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**What happens next:** each recipient taps the link, connects or creates a
wallet, and the SDK sweeps the funds. Unclaimed links expire and the funds
return to `recovery_address`, so payroll reconciles automatically.

## Use Case 2: NGO Aid Disbursements

**Scenario:** An NGO needs to distribute emergency aid to 10,000 families after
a disaster. Banking infrastructure may be destroyed, recipients are scattered,
and cash distribution is dangerous. Bridgelet lets the NGO create thousands of
ephemeral accounts in minutes, notify recipients by SMS, and publish a fully
verifiable on-chain audit trail for donors.

**Runnable sample (batch aid distribution with long expiry and reminders):**

```ts
import { createEphemeralAccount, getAccount, notifyRecipient } from './bridgelet';

const recipients: Array<{ phone: string; amount: string; familyId: string }> = [
  { phone: '+256701234567', amount: '200.00', familyId: 'F-0001' },
  // ...10,000 families
];

async function disburseAid(): Promise<void> {
  const created = [];
  for (const r of recipients) {
    const account = await createEphemeralAccount({
      fundingSource: process.env.FUNDING_SOURCE!,
      recovery_address: process.env.FUNDING_SOURCE!, // unclaimed aid returns to the NGO
      amount: r.amount,
      asset_code: 'XLM',
      expiresIn: 60 * 24 * 60 * 60, // 60-day window for disaster scenarios
      metadata: { familyId: r.familyId, program: 'emergency-aid-2026' },
    });
    await notifyRecipient(r.phone, `${process.env.APP_URL}${account.claimUrl}`);
    created.push({ familyId: r.familyId, accountId: account.accountId });
  }
  console.log(`Disbursed ${created.length} aid claims.`);
}

// Reminder pass for unclaimed aid (run weekly):
async function remindUnclaimed(accountIds: string[]): Promise<void> {
  for (const accountId of accountIds) {
    const account = await getAccount(accountId);
    if (account.status === 'pending_claim' || account.status === 'pending_payment') {
      // Re-send the link; the account metadata knows the phone number.
      console.log(`Reminder due for account ${accountId} (status ${account.status})`);
    }
  }
}

disburseAid().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Transparency:** every account creation, claim, and sweep is a transaction on
the public Stellar ledger, so donors can verify funds reached recipients without
a trusted intermediary.

## Use Case 3: Cross-Border Remittances

**Scenario:** A migrant worker sends money home monthly. Traditional remittance
channels charge 3–7% plus forex markup and can take days. With Bridgelet the
sender's app creates an ephemeral account and SMSes a claim link; the recipient
claims in minutes for a fraction of a cent in network fees.

**Runnable sample (single remittance):**

```ts
import { createEphemeralAccount, notifyRecipient } from './bridgelet';

async function sendRemittance(opts: { toPhone: string; amountUsd: string; senderRef: string }) {
  const account = await createEphemeralAccount({
    fundingSource: process.env.FUNDING_SOURCE!,       // the remitter's funded key
    recovery_address: process.env.FUNDING_SOURCE!,    // refund if never claimed
    amount: opts.amountUsd,
    asset_code: 'XLM',
    expiresIn: 48 * 60 * 60,                          // 48-hour claim window
    metadata: { senderRef: opts.senderRef, type: 'remittance' },
  });
  await notifyRecipient(opts.toPhone, `${process.env.APP_URL}${account.claimUrl}`);
  return account;
}

sendRemittance({ toPhone: '+639171234567', amountUsd: '500.00', senderRef: 'TX-8821' })
  .then((a) => console.log('Remittance ready:', a.claimUrl))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

**Recipient experience:** open the link → connect or create a wallet → confirm
the sweep. Total time is minutes, and the recipient can then cash out locally
through partner exchanges or bank deposit rails.

## Use Case 4: Airdrops to Non-Crypto Users

**Scenario:** A Web3 gaming company wants to airdrop tokens to 50,000 beta
testers, most of whom have no wallet. Traditional airdrops lose 60–80% of users
at the wallet-creation step. With Bridgelet, claim links arrive by email/SMS and
the claim flow doubles as guided wallet onboarding.

**Runnable sample (campaign airdrop with 14-day expiry):**

```ts
import { createEphemeralAccount, notifyRecipient } from './bridgelet';

const testers: Array<{ email: string; tokens: string; gamerTag: string }> = [
  { email: 'tester1@example.com', tokens: '1000.00', gamerTag: 'nova-42' },
  // ...50,000 testers
];

async function runAirdrop(): Promise<void> {
  const sent = [];
  for (const t of testers) {
    const account = await createEphemeralAccount({
      fundingSource: process.env.FUNDING_SOURCE!,
      recovery_address: process.env.FUNDING_SOURCE!,
      amount: t.tokens,
      asset_code: 'XLM',
      expiresIn: 14 * 24 * 60 * 60, // 14-day campaign window
      metadata: { gamerTag: t.gamerTag, campaign: 'beta-2026', channel: 'airdrop' },
    });
    await notifyRecipient(t.email, `${process.env.APP_URL}${account.claimUrl}`);
    sent.push(t.gamerTag);
  }
  console.log(`Airdrop links sent to ${sent.length} testers.`);
}

runAirdrop().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Sybil resistance:** because each claim requires the recipient's own wallet
signature and the campaign controls distribution, the on-chain sweep is
per-account single-use: a claimed link cannot be replayed.

## Use Case 5: E-Commerce Refunds

**Scenario:** An online marketplace wants to refund international customers
quickly. Card refunds take days, international wires are expensive, and PayPal is
not available everywhere. Bridgelet turns an approved refund into an instant
claimable payment.

**Runnable sample (refund on approval):**

```ts
import { createEphemeralAccount, notifyRecipient } from './bridgelet';

async function issueRefund(opts: { customerEmail: string; amount: string; orderId: string }) {
  const account = await createEphemeralAccount({
    fundingSource: process.env.FUNDING_SOURCE!,
    recovery_address: process.env.FUNDING_SOURCE!,
    amount: opts.amount,
    asset_code: 'XLM',
    expiresIn: 30 * 24 * 60 * 60,
    metadata: { orderId: opts.orderId, type: 'refund' },
  });
  await notifyRecipient(opts.customerEmail, `${process.env.APP_URL}${account.claimUrl}`);
  return account;
}

issueRefund({ customerEmail: 'buyer@example.com', amount: '89.99', orderId: 'ORD-2041' })
  .then((a) => console.log('Refund claim ready:', a.claimUrl))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

**Business impact:** refunds land in minutes instead of 5–10 business days,
support tickets about "where's my refund" drop, and chargeback disputes decrease.

## Use Case 6: Gig Economy Payouts

**Scenario:** A ride-sharing or delivery platform pays drivers in 20 countries,
many of whom are unbanked. Traditional weekly payout cycles have high minimums
and bank fees. Bridgelet enables daily (or even per-ride) payouts with no
minimum withdrawal.

**Runnable sample (end-of-day payout per driver):**

```ts
import { createEphemeralAccount, notifyRecipient } from './bridgelet';

// Drivers who requested a payout today: earnings and destination phone.
const payouts: Array<{ driverId: string; phone: string; earnings: string }> = [
  { driverId: 'D-101', phone: '+254712345678', earnings: '47.50' },
  // ...
];

async function payDrivers(): Promise<void> {
  for (const d of payouts) {
    const account = await createEphemeralAccount({
      fundingSource: process.env.FUNDING_SOURCE!,
      recovery_address: process.env.FUNDING_SOURCE!,
      amount: d.earnings,
      asset_code: 'XLM',
      expiresIn: 7 * 24 * 60 * 60,
      metadata: { driverId: d.driverId, payoutCycle: 'daily', type: 'gig-payout' },
    });
    await notifyRecipient(d.phone, `${process.env.APP_URL}${account.claimUrl}`);
  }
  console.log(`Paid ${payouts.length} drivers.`);
}

payDrivers().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Economics:** at ~$0.10 per payout (network fees only) and with no minimum
withdrawal, drivers access earnings the same day instead of waiting for a
weekly bank cycle.

## Webhooks: know when a claim succeeds

Instead of polling `GET /accounts/{id}`, subscribe to the SDK's webhook events
(e.g. `claim.success`) to reconcile payments, trigger follow-up emails, or mark
a payroll run as settled. Webhook payloads carry the account/claim identifiers
and the swept amount.

```ts
// Concept: exact webhook shape is defined by your bridgelet-sdk deployment.
app.post('/webhooks/claims', (req, res) => {
  const { event, accountId, claimToken, destinationAddress, amountSwept } = req.body;
  if (event === 'claim.success') {
    console.log(`Claim ${claimToken} swept ${amountSwept} to ${destinationAddress}`);
    // mark the payroll row / order / driver payout as settled
  }
  res.sendStatus(200);
});
```

## Choosing the Right Use Case

Use Bridgelet when:

| Criteria                  | Importance | Threshold                        |
| ------------------------- | ---------- | -------------------------------- |
| Recipients lack wallets   | Critical   | > 50%                            |
| Payment frequency         | Critical   | Infrequent or one-time           |
| Payment urgency           | High       | Minutes/hours matter             |
| Recipient reachability    | High       | SMS/email works                  |
| Transaction size          | Medium     | > $10                            |
| Scale                     | Medium     | 100+ recipients                  |

**Not ideal for:**

- **Frequent micro-payments to the same users**: better served by direct wallet
  payments after the first onboarding.
- **Recipients who already have wallets**: a standard Stellar transaction is simpler.
- **Amounts under ~$5**: the onboarding effort is not justified.
- **No way to reach recipients**: a claim link is useless without SMS, email, or
  an in-app notification channel.

## Appendix: Implementation Checklist

**Planning**

- [ ] Identify the target use case
- [ ] Assess recipient demographics and connectivity
- [ ] Choose notification channels (SMS/email)
- [ ] Calculate cost/benefit vs. the current payout method
- [ ] Review regulatory requirements (KYC/AML where applicable)

**Technical**

- [ ] Point `BRIDGELET_API_URL` / `BRIDGELET_API_KEY` at a bridgelet-sdk instance
- [ ] Configure the funding account and `recovery_address` policy
- [ ] Set claim expiry per use case
- [ ] Implement webhook handling (or poll `GET /accounts/{id}`)
- [ ] Implement the notification system

**Testing**

- [ ] Run a pilot with 10–50 recipients (testnet first)
- [ ] Test the claim flow end-to-end
- [ ] Verify webhook delivery and expiration handling
- [ ] Gather recipient feedback and iterate

## References

| Document | Notes |
|----------|-------|
| `docs/use-cases.pdf` | Original narrative source document (January 2025) |
| `docs/integration-guide.mdx` | SDK installation, claim links, webhooks |
| `scripts/check-sdk-contract.mjs` | CI-verified SDK contract this guide's samples follow |
| `docs/security-model.mdx` | Trust boundaries, claim token security, threat model |
