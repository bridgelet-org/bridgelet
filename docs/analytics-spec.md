# Bridgelet Analytics & Product Event Tracking Specification

**Version:** 1.0
**Status:** Draft
**Created:** March 2026
**Based On:** `bridgelet-frd-ui-ux.md`, `ROADMAP.md`, `FRONTEND_TECHNICAL_SPEC.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Event Naming Conventions](#2-event-naming-conventions)
3. [Standard Payload Structure](#3-standard-payload-structure)
4. [Sender Journey Events](#4-sender-journey-events)
5. [Recipient Journey Events](#5-recipient-journey-events)
6. [Error & Edge Case Events](#6-error--edge-case-events)
7. [Conversion Funnel Definitions](#7-conversion-funnel-definitions)
8. [Business Metrics & KPI Definitions](#8-business-metrics--kpi-definitions)
9. [Implementation Notes](#9-implementation-notes)

---

## 1. Overview

This document defines the analytics and product event tracking specification for Bridgelet — a crypto onboarding solution that allows senders to create claimable crypto links for recipients who do not yet have wallets.

The purpose of this spec is to:
- Define every trackable user interaction across both journeys
- Establish a consistent naming and payload convention
- Provide funnel definitions for measuring conversion
- Define business KPIs and how they are derived

> **Scope:** This document defines *what* to track and *how to structure it*. It does not implement any tracking code.

### Two Core User Journeys

| Journey | Actor | Goal |
|---------|-------|------|
| **Sender Journey** | Alice (crypto-literate) | Create a claimable payment link |
| **Recipient Journey** | Bob (crypto-novice) | Claim crypto sent to them |

---

## 2. Event Naming Conventions

### 2.1 Format

Events use the **`Noun Verb`** pattern in **Title Case**, where:
- **Noun** = the object being acted on (e.g., `Payment`, `Claim`, `Wallet`)
- **Verb** = past tense of the action (e.g., `Created`, `Opened`, `Failed`)

```
<Noun> <Past-Tense Verb>
```

**Examples:**
```
Payment Created
Claim Link Copied
Wallet Connected
Claim Succeeded
```

### 2.2 Rules

| Rule | Good | Bad |
|------|------|-----|
| Title Case for event names | `Claim Link Shared` | `claim_link_shared`, `claimLinkShared` |
| Past tense verbs only | `Payment Created` | `Create Payment`, `Payment Create` |
| snake_case for all property keys | `asset_type` | `assetType`, `AssetType` |
| No abbreviations in event names | `Wallet Address Entered` | `Wallet Addr Entered` |
| Prefix error events with `Error` noun | `Error Displayed` | `show_error`, `ErrorShown` |

### 2.3 Namespacing by Journey

While event names do not require journey prefixes, the `journey` property in every payload identifies which flow the event belongs to. This keeps event names readable while preserving filterability.

| `journey` value | Description |
|-----------------|-------------|
| `sender` | Events from the sender (Alice) flow |
| `recipient` | Events from the recipient (Bob) flow |
| `shared` | Events that can occur in either flow |

---

## 3. Standard Payload Structure

Every event includes a **base payload** of common properties. Event-specific properties are added on top.

### 3.1 Base Payload

```jsonc
{
  // Identity
  "anonymous_id": "string",         // Client-generated UUID, persisted in localStorage
  "session_id": "string",           // UUID, reset per browser session

  // Context
  "journey": "sender | recipient | shared",
  "timestamp": "ISO 8601 string",   // e.g. "2026-03-15T10:23:45.123Z"
  "platform": "web",
  "network": "testnet | mainnet",

  // Device & Environment
  "user_agent": "string",
  "device_type": "mobile | tablet | desktop",
  "referrer": "string | null",      // URL of the referring page or null

  // App version
  "app_version": "string"           // e.g. "1.0.0"
}
```

> **Privacy note:** No PII (name, email, phone) should ever appear in an analytics payload. Wallet addresses are pseudonymous — include them only where explicitly specified below. Recipient wallet addresses must never be logged in sender-journey events.

### 3.2 Conditional Properties

These properties are included only where relevant and marked `(if available)` in event tables:

| Property | Type | Description |
|----------|------|-------------|
| `claim_id` | string | Unique ID for the claim/payment |
| `asset_type` | string | `"XLM"`, `"USDC"`, etc. |
| `amount_usd_equiv` | number | USD equivalent at time of event |
| `expiry_days` | number | `1`, `7`, `30`, `90`, or `null` (never) |
| `error_code` | string | Machine-readable error identifier |
| `error_type` | string | Category of error (see §6) |

---

## 4. Sender Journey Events

Events are listed in chronological order through the sender flow.

### 4.1 Homepage / Entry

---

#### `Page Viewed`

Fired when the Bridgelet homepage loads.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `page` | string | `"homepage"` |
| `entry_source` | string | `"direct"`, `"referral"`, `"shared_link"`, `"unknown"` |

---

### 4.2 Create Claim Form

---

#### `Send Form Viewed`

Fired when the Create Claim form is rendered.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |

---

#### `Send Form Started`

Fired on the sender's first interaction with any field in the Create Claim form.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `first_field` | string | The field first interacted with: `"amount"`, `"asset"`, `"recipient_name"`, `"message"`, `"expiration"` |

---

#### `Send Form Field Changed`

Fired when the sender changes a field value and moves focus away (blur). Not fired on every keystroke.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `field_name` | string | `"amount"`, `"asset"`, `"expiration"`, `"recipient_name"`, `"message"` |
| `asset_type` | string | Current asset selection at time of change (if field is `"asset"`) |
| `expiry_days` | number \| null | Set value (if field is `"expiration"`) |

---

#### `Send Form Completed`

Fired when the sender clicks "Continue" and the form passes client-side validation.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `asset_type` | string | Selected asset |
| `expiry_days` | number \| null | Selected expiration |
| `has_recipient_name` | boolean | Whether the optional recipient name was provided |
| `has_message` | boolean | Whether the optional message was provided |

---

### 4.3 Payment Confirmation

---

#### `Payment Confirmation Viewed`

Fired when the Confirm Payment screen is rendered.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `asset_type` | string | Asset to be sent |
| `expiry_days` | number \| null | |

---

#### `Wallet Connected`

Fired when the sender successfully connects their wallet.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `wallet_type` | string | Name of the wallet provider (e.g., `"Freighter"`, `"Albedo"`, `"xBull"`) |

---

#### `Wallet Connection Failed`

Fired when wallet connection is attempted but fails.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `wallet_type` | string | Attempted wallet provider |
| `error_code` | string | Provider error code or `"unknown"` |

---

#### `Payment Confirmed`

Fired when the sender clicks "Confirm & Pay" and signs the transaction. This indicates user intent; it fires *before* blockchain confirmation.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `asset_type` | string | |
| `expiry_days` | number \| null | |
| `wallet_type` | string | |

---

#### `Payment Created`

Fired when the blockchain confirms the funding transaction and a claim ID is returned. This is the definitive "payment exists" event.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `claim_id` | string | Unique identifier for this payment |
| `asset_type` | string | |
| `expiry_days` | number \| null | |
| `confirmation_time_ms` | number | Time in milliseconds from `Payment Confirmed` to `Payment Created` |

---

#### `Payment Creation Failed`

Fired when the blockchain transaction fails after the sender signed.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `asset_type` | string | |
| `error_code` | string | Stellar error code or `"unknown"` |

---

### 4.4 Payment Success & Sharing

---

#### `Payment Success Viewed`

Fired when the success screen (with claim link) is rendered.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `claim_id` | string | |
| `asset_type` | string | |

---

#### `Claim Link Copied`

Fired when the sender copies the claim link to clipboard.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `claim_id` | string | |
| `copy_location` | string | `"success_screen"`, `"dashboard_detail"` |

---

#### `Claim Link Shared`

Fired when the sender uses a share button (SMS, Email, WhatsApp, QR).

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `claim_id` | string | |
| `share_method` | string | `"sms"`, `"email"`, `"whatsapp"`, `"qr_code"` |

---

### 4.5 Sender Dashboard

---

#### `Dashboard Viewed`

Fired when the sender's payment dashboard is loaded.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `total_payments` | number | Total number of payments visible to the sender |
| `active_filter` | string | `"all"`, `"unclaimed"`, `"claimed"`, `"expired"` |

---

#### `Dashboard Filter Applied`

Fired when the sender changes the status filter on the dashboard.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `filter` | string | `"all"`, `"unclaimed"`, `"claimed"`, `"expired"` |

---

#### `Payment Details Viewed`

Fired when the sender opens the detail view for a specific payment.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `claim_id` | string | |
| `claim_status` | string | `"unclaimed"`, `"claimed"`, `"expired"` |

---

#### `Payment Cancelled`

Fired when the sender cancels an unclaimed payment.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `claim_id` | string | |
| `asset_type` | string | |
| `time_since_creation_hours` | number | Hours elapsed since the payment was created |

---

#### `Funds Reclaimed`

Fired when the sender successfully reclaims expired funds.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` |
| `claim_id` | string | |
| `asset_type` | string | |
| `days_expired` | number | Days the claim was expired before reclaim |

---

## 5. Recipient Journey Events

Events are listed in chronological order through the recipient claim flow.

### 5.1 Claim Landing Page

---

#### `Claim Page Opened`

Fired immediately when a recipient opens a claim link. Fires before token verification.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"recipient"` |
| `claim_id` | string | Extracted from URL token |
| `entry_channel` | string | Best-guess referral channel: `"sms"`, `"email"`, `"whatsapp"`, `"direct"`, `"unknown"` |

---

#### `Claim Verified`

Fired when the backend confirms the claim token is valid and the funds are available.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"recipient"` |
| `claim_id` | string | |
| `asset_type` | string | |
| `expiry_days_remaining` | number | Days until expiration at time of opening |
| `verification_time_ms` | number | Time taken for backend verification |

---

#### `Claim CTA Clicked`

Fired when the recipient clicks "Claim Your Funds" on the landing page.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"recipient"` |
| `claim_id` | string | |
| `asset_type` | string | |

---

### 5.2 Wallet Address Entry

---

#### `Wallet Address Screen Viewed`

Fired when the wallet address input screen is rendered.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"recipient"` |
| `claim_id` | string | |
| `has_previous_address` | boolean | Whether a previously-used address was offered as a suggestion |

---

#### `Wallet Address Entered`

Fired when the recipient submits a wallet address and it passes client-side validation (length, prefix check).

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"recipient"` |
| `claim_id` | string | |
| `used_previous_address` | boolean | Whether the recipient reused a previously suggested address |

> **Privacy:** The wallet address itself must NOT be included in this payload.

---

#### `Wallet Address Validation Failed`

Fired when the recipient submits an address that fails client-side validation.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"recipient"` |
| `claim_id` | string | |
| `validation_error` | string | `"invalid_prefix"`, `"invalid_length"`, `"invalid_checksum"` |
| `attempt_number` | number | How many failed attempts on this screen |

---

### 5.3 Claim Confirmation & Processing

---

#### `Claim Confirmation Viewed`

Fired when the review/confirm claim screen is shown.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"recipient"` |
| `claim_id` | string | |
| `asset_type` | string | |

---

#### `Claim Submitted`

Fired when the recipient clicks "Claim Now". Fires before the sweep is executed.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"recipient"` |
| `claim_id` | string | |
| `asset_type` | string | |

---

#### `Claim Succeeded`

Fired when the sweep transaction is confirmed on-chain. This is the primary conversion event for the recipient journey.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"recipient"` |
| `claim_id` | string | |
| `asset_type` | string | |
| `time_to_claim_hours` | number | Hours between `Payment Created` (sender) and `Claim Succeeded` (recipient) |
| `sweep_duration_ms` | number | Time in ms from `Claim Submitted` to on-chain confirmation |
| `entry_channel` | string | Same value recorded at `Claim Page Opened` |

---

#### `Claim Failed`

Fired when the sweep fails after the recipient confirmed.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"recipient"` |
| `claim_id` | string | |
| `asset_type` | string | |
| `error_code` | string | Stellar error code or `"unknown"` |
| `error_type` | string | `"network_error"`, `"token_expired"`, `"already_claimed"`, `"transaction_failed"`, `"unknown"` |
| `attempt_number` | number | How many times the recipient has tried on this claim |

---

### 5.4 Post-Claim

---

#### `Claim Success Viewed`

Fired when the success screen is displayed after a successful sweep.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"recipient"` |
| `claim_id` | string | |
| `asset_type` | string | |

---

#### `Sender Signup CTA Clicked`

Fired when a recipient clicks "Create your account →" on the success screen. Measures viral growth potential.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"recipient"` |
| `claim_id` | string | |
| `source` | string | `"claim_success_screen"` |

---

#### `Explorer Link Clicked`

Fired when a user (sender or recipient) clicks a Stellar Explorer transaction link.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` or `"recipient"` |
| `claim_id` | string | |
| `source_screen` | string | `"claim_success"`, `"payment_details"` |

---

## 6. Error & Edge Case Events

These events cover error states and special scenarios from the FRD.

---

#### `Error Displayed`

Fired whenever an error state screen or inline error is shown to the user.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` or `"recipient"` |
| `claim_id` | string \| null | If available |
| `error_type` | string | See table below |
| `error_code` | string | Machine-readable code or `"unknown"` |
| `source_screen` | string | Screen where the error appeared |

**Standard `error_type` values:**

| `error_type` | Trigger |
|---|---|
| `invalid_token` | Claim link is malformed or has no matching record |
| `expired_token` | Claim token is past its expiration date |
| `already_claimed` | Token is valid but funds were already swept |
| `invalid_wallet_address` | Wallet address fails validation |
| `transaction_failed` | Stellar transaction rejected |
| `network_unavailable` | Cannot reach Stellar network or Bridgelet API |
| `wallet_connection_failed` | Sender's wallet refused connection |
| `unknown` | Unclassified error |

---

#### `Retry Clicked`

Fired when a user clicks a "Try Again" or "Retry" button on an error screen.

| Property | Type | Value / Description |
|----------|------|---------------------|
| `journey` | string | `"sender"` or `"recipient"` |
| `claim_id` | string \| null | |
| `error_type` | string | Error type that triggered the retry prompt |
| `attempt_number` | number | Which retry attempt this is |

---

## 7. Conversion Funnel Definitions

### 7.1 Sender Activation Funnel

Measures how effectively the product converts a homepage visitor into a sender who creates a payment.

```
Page Viewed (homepage)
    ↓
Send Form Started
    ↓
Send Form Completed
    ↓
Wallet Connected
    ↓
Payment Confirmed        ← intent committed
    ↓
Payment Created          ← conversion complete
    ↓
Claim Link Shared        ← activation milestone
```

| Stage | Event | Drop-off Metric |
|-------|-------|----------------|
| 1 | `Page Viewed` | Baseline |
| 2 | `Send Form Started` | % of visitors who start the form |
| 3 | `Send Form Completed` | % of form starters who complete it |
| 4 | `Wallet Connected` | % who connect wallet on confirm screen |
| 5 | `Payment Confirmed` | % who sign the transaction |
| 6 | `Payment Created` | % confirmed → on-chain success |
| 7 | `Claim Link Shared` | % who actively share (vs. just copy) |

---

### 7.2 Recipient Claim Funnel

Measures how effectively a claim link converts a recipient into a successful claimer.

```
Claim Page Opened
    ↓
Claim Verified           ← link is valid
    ↓
Claim CTA Clicked
    ↓
Wallet Address Entered
    ↓
Claim Submitted          ← intent committed
    ↓
Claim Succeeded          ← conversion complete
```

| Stage | Event | Drop-off Metric |
|-------|-------|----------------|
| 1 | `Claim Page Opened` | Baseline (all link opens) |
| 2 | `Claim Verified` | % of opens with valid, unexpired tokens |
| 3 | `Claim CTA Clicked` | % of verified claims where recipient clicks CTA |
| 4 | `Wallet Address Entered` | % who successfully enter a valid wallet address |
| 5 | `Claim Submitted` | % who reach final confirmation and submit |
| 6 | `Claim Succeeded` | % of submissions that result in a successful sweep |

---

### 7.3 Full End-to-End Funnel

The combined funnel for measuring the complete value chain.

```
Page Viewed (sender)
    ↓
Payment Created          (Sender Activation Funnel)
    ↓
Claim Page Opened        (Recipient receives link)
    ↓
Claim Succeeded          (Recipient Claim Funnel)
```

**End-to-end conversion rate** = `Claim Succeeded` ÷ `Page Viewed (homepage)`

---

## 8. Business Metrics & KPI Definitions

### 8.1 Core KPIs

> **Query definitions:** executable query shapes for each KPI below,
> their join keys, and per-KPI readiness status are maintained in
> `docs/analytics-kpi-definitions.md`.

---

#### Claim Conversion Rate (CCR)

The percentage of opened, valid claim links that result in a successful claim.

```
CCR = (Claim Succeeded events) / (Claim Verified events) × 100
```

**Target baseline (MVP):** Establish benchmark.
**Signals a problem when:** CCR drops significantly, indicating friction in the recipient flow.

---

#### Time to Claim (TTC)

The median time elapsed between a payment being created and it being successfully claimed.

```
TTC = median(Claim Succeeded.timestamp − Payment Created.timestamp)
      for all matched claim_id pairs
```

**Reported as:** Hours or days.
**Signals a problem when:** Median TTC increases, suggesting recipients are failing to complete the flow on first visit.

---

#### Expiry Rate

The percentage of created payments that expire without being claimed.

```
Expiry Rate = (payments with status "expired" and no Claim Succeeded)
              / (total Payment Created events)
              × 100
```

**Signals a problem when:** Expiry rate is high, suggesting the claim link is not reaching recipients effectively, or the recipient experience is too difficult.

---

#### Reclaim Rate

The percentage of expired payments where the sender actively reclaims funds.

```
Reclaim Rate = (Funds Reclaimed events)
               / (payments with "expired" status)
               × 100
```

**Signals a problem when:** Very low reclaim rates may indicate senders are unaware of expired claims or the reclaim UX is poor.

---

#### Sender Activation Rate

The percentage of homepage visitors who complete at least one payment.

```
Sender Activation Rate = (unique anonymous_ids with ≥1 Payment Created)
                         / (unique anonymous_ids with Page Viewed homepage)
                         × 100
```

---

### 8.2 Engagement Metrics

---

#### Share Method Distribution

Breakdown of how senders share claim links.

```
For each share_method in {sms, email, whatsapp, qr_code, copy_only}:
  % = (Claim Link Shared events with share_method)
      / (total sharing actions per claim)
      × 100
```

**Use:** Informs which sharing channels to prioritize in the UI and for integrations.

---

#### Recipient Entry Channel Distribution

Breakdown of channels through which recipients open claim links.

```
For each entry_channel in {sms, email, whatsapp, direct, unknown}:
  % = (Claim Page Opened events with entry_channel)
      / (total Claim Page Opened events)
      × 100
```

**Use:** Cross-referenced against Claim Conversion Rate per channel to identify best-performing share channels.

---

#### Asset Distribution

Breakdown of assets used in payment creation.

```
For each asset in {XLM, USDC, ...}:
  % = (Payment Created events with asset_type)
      / (total Payment Created events)
      × 100
```

---

#### Claim Failure Rate

Percentage of claim submissions that result in failure.

```
Claim Failure Rate = (Claim Failed events)
                     / (Claim Submitted events)
                     × 100
```

Broken down further by `error_type` to diagnose the leading causes.

---

#### Wallet Address Validation Failure Rate

Percentage of wallet address submissions that fail client-side validation.

```
Validation Failure Rate = (Wallet Address Validation Failed events)
                          / (Wallet Address Screen Viewed events)
                          × 100
```

**Signals a problem when:** High, indicating recipient confusion about Stellar address format.

---

#### Viral K-Factor (Recipient → Sender)

Measures the product's viral loop: how often a recipient becomes a sender.

```
K-Factor = (Sender Signup CTA Clicked events)
           / (Claim Succeeded events)
```

> **Note:** `Sender Signup CTA Clicked` measures intent only. True K-factor requires tracking
> whether the recipient later creates a payment (linkable via `anonymous_id` if the same browser is used).

---

### 8.3 Operational Metrics

These are lower-level metrics derived from event data to monitor system health alongside product health.

| Metric | Derived From | Purpose |
|--------|-------------|---------|
| Median payment confirmation time | `confirmation_time_ms` in `Payment Created` | Monitor Stellar network performance |
| Median sweep duration | `sweep_duration_ms` in `Claim Succeeded` | Monitor backend sweep service |
| Wallet connection failure rate | `Wallet Connection Failed` / `Wallet Connected` + `Wallet Connection Failed` | Monitor wallet provider compatibility |
| Error rate by type | `Error Displayed` grouped by `error_type` | Detect spikes in specific failure modes |
| Network unavailability incidents | `Error Displayed` where `error_type = network_unavailable` | Proxy for Stellar network outages affecting users |

---

## 9. Implementation Notes

> This section is guidance for the engineering team when the time comes to implement tracking. It does not constitute part of the spec definition.

### 9.1 Recommended Analytics Platforms

This spec is platform-agnostic and compatible with:
- **[Segment](https://segment.com)** — recommended as a routing layer to downstream tools
- **[PostHog](https://posthog.com)** — open-source; suitable for self-hosted analytics
- **[Mixpanel](https://mixpanel.com)** — strong funnel analysis
- **[Amplitude](https://amplitude.com)** — strong for product metrics

### 9.2 Client-Side vs. Server-Side

| Event | Recommended Source | Reason |
|-------|--------------------|--------|
| `Page Viewed`, UI interactions | Client-side | UI state is only known client-side |
| `Payment Created` | **Server-side preferred** | Authoritative confirmation from blockchain |
| `Claim Verified` | **Server-side preferred** | Authoritative token validation |
| `Claim Succeeded` | **Server-side preferred** | Authoritative sweep confirmation |
| `Claim Failed` | **Server-side preferred** | Authoritative error source |

Where server-side events are used, they should be enriched with client context (session ID, device type) passed from the frontend.

### 9.3 Anonymous Identity & Session

- `anonymous_id`: Generate a UUID on first page load and persist to `localStorage`. Use this as the primary identifier across sessions. Do not use cookies for this if avoidable.
- `session_id`: Generate a new UUID when a browser session starts (first page load, or after 30 minutes of inactivity). Store in `sessionStorage`.
- Match sender and recipient sides of the same claim via `claim_id`, not via user identity.

### 9.4 Event Deduplication

- `Payment Created` and `Claim Succeeded` must be idempotent at the analytics layer. If a server-side retry sends the same event twice (same `claim_id`), the analytics pipeline must deduplicate on `claim_id` for these events.
- Use a `message_id` or `event_id` UUID on every event payload to support deduplication.

### 9.5 Do Not Track

Respect browser-level `DNT` headers. If `DNT: 1`, suppress all analytics events. This is especially important for the recipient flow, where the user may not have any prior relationship with Bridgelet.

---

*Document version 1.0 — Analytics & Product Event Tracking Specification for Bridgelet*
*Author: See git history*
