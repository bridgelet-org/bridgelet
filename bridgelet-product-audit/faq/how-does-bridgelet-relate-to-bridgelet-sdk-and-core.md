# FAQ: How does this repo relate to bridgelet-sdk and bridgelet-core?

**Short answer:** Bridgelet is a three-layer system across three repositories.
This repo (bridgelet) contains the client apps. It calls `bridgelet-sdk` (the
backend API), which in turn calls `bridgelet-core` (the Soroban smart
contracts on Stellar).

---

## The three-layer architecture

```
bridgelet (this repo)
  └─ frontend/  Next.js web reference UI
  └─ mobile/    Expo React Native app
       │
       │  HTTP calls to bridgelet-sdk API
       ▼
bridgelet-sdk
  └─ NestJS backend API
  └─ Orchestrates account creation, claim validation, sweep execution
       │
       │  Soroban RPC calls to bridgelet-core
       ▼
bridgelet-core
  └─ Soroban smart contracts (Rust)
  └─ On-chain enforcement of account restrictions and single-use sweep rules
```

| Layer | Repo | Technology | Responsibility |
|-------|------|------------|----------------|
| 1. Client apps | **bridgelet** (this repo) | Next.js + Expo (TypeScript) | UI, wallet connection, API calls |
| 2. Backend API | **bridgelet-sdk** | NestJS (TypeScript) | Business logic, account lifecycle, SDK consumers integrate here |
| 3. Smart contracts | **bridgelet-core** | Soroban (Rust) | On-chain restrictions, single-use enforcement, sweep authorisation |

---

## Why three separate repositories?

Each layer has a distinct deployment model and consumer:

- **bridgelet-core** is deployed to the Stellar blockchain. Organizations that
  want on-chain guarantees interact with it directly via Soroban RPC.
- **bridgelet-sdk** is a backend service. Organizations integrate it into their
  payment infrastructure (e.g. alongside the Stellar Disbursement Platform).
  It abstracts the contract complexity behind a REST API.
- **bridgelet** (this repo) is a reference UI. It demonstrates how a frontend
  or mobile app should call the SDK. Organizations can fork it or build their
  own UI against the same SDK endpoints.

---

## Practical implication: a bug could originate in any layer

When tracing a failure, say, a claim link that resolves as "already swept"
when it shouldn't, the error may live at any of the three layers:

| Stage | What could go wrong |
|-------|---------------------|
| bridgelet-core | Contract state machine has an unexpected transition |
| bridgelet-sdk | Error string matching fails to map the contract error to a structured code |
| bridgelet (this repo) | API error is not propagated to a user-visible message; fallback fires |

The general tracing approach for following an error across all three layers is
documented in
[`integration-notes/three-repo-error-surface-consistency.md`](../integration-notes/three-repo-error-surface-consistency.md).
That document walks through a concrete example (`AlreadySwept`) end-to-end and
identifies where identity can be lost.

---

## Where the knowledge bases cross-reference each other

Each repository has its own audit knowledge-base folder using the same
conventions (`postmortems/`, `runbooks/`, `glossary/`, etc.). Where an issue
spans multiple layers, the relevant document in each repo links to its
counterpart in the others. For instance:

- This repo's `integration-notes/three-repo-error-surface-consistency.md`
  references `bridgelet-sdk-audit/error-mapping-completeness-checklist.md`.
- `bridgelet-core`'s audit documents are referenced from
  `integration-notes/mobile-app-contract-awareness.md`.

---

## Related documents

- [`integration-notes/three-repo-error-surface-consistency.md`](../integration-notes/three-repo-error-surface-consistency.md)
  - tracing an error from contract through SDK to frontend UI
- [`README.md`](../../README.md): top-level overview of all three repositories
  with links to their GitHub locations
- [`docs/architecture.mdx`](../../docs/architecture.mdx): system design and
  component interaction diagrams

---

*Part of the bridgelet-product-audit/ knowledge-base initiative.*
