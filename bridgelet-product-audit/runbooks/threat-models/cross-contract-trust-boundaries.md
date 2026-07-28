# Threat Model: Cross-Contract Trust Boundaries

**Path:** `bridgelet-audit/threat-models/cross-contract-trust-boundaries.md`  
**Target Repository:** `bridgelet-org/bridgelet-core`  
**Audience:** Security Auditors, Smart Contract Engineers  

---

## 🎯 Purpose

This document maps every cross-contract call made within the `bridgelet-core` workspace. It analyzes the trust assumptions made by callers regarding callees, evaluates whether those assumptions are validated on-chain, and highlights potential failure modes or attack vectors arising from boundary mismatches.

---

## 🗺️ Overall Contract Interaction Graph

```mermaid
graph TD
    User([External Invoker / Operator]) -->|Deploy / Initialize| AccountFactory
    User -->|Trigger Batch Sweep| SweepController

    AccountFactory -->|Deploys WASM Instance| EphemeralAccount
    AccountFactory -->|Registers Deployment Metadata| EphemeralAccount

    SweepController -->|1. Query is_expired / status| EphemeralAccount
    SweepController -->|2. Invoke expire / sweep| EphemeralAccount

    EphemeralAccount -->|Transfer Funds| TokenContract[Soroban Asset Contract]