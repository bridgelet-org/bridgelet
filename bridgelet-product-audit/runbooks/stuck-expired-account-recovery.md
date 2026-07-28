# Operational Runbook: Stuck / Expired Account Fund Recovery

**Path:** `bridgelet-audit/runbooks/stuck-expired-account-recovery.md`  
**Target Repository:** `bridgelet-org/bridgelet-core`  
**Audience:** Protocol Operators, Incident Responders  

---

## 🎯 Purpose

This runbook details the step-by-step procedures required for an operator to identify, verify, and safely recover funds from ephemeral accounts that have passed their designated expiry ledger without automatically sweeping.

---

## 🛠️ Diagnostics & Verification

Before executing state-changing transactions, operators **must** verify the target ephemeral account's actual on-chain state to confirm it is eligible for expiration/recovery.

### Step 1: Query Account Status & Expiry State

Using the Soroban CLI or contract read queries, inspect `is_expired()` and `get_status()`:

```bash
# 1. Check if the current ledger sequence has passed the account's expiry ledger
soroban contract invoke \
  --id <EPHEMERAL_ACCOUNT_CONTRACT_ID> \
  --source-account <OPERATOR_KEYS> \
  --network <NETWORK> \
  -- \
  is_expired \
  --account_id <TARGET_ACCOUNT_ADDRESS>

# 2. Query the current explicit status of the account
soroban contract invoke \
  --id <EPHEMERAL_ACCOUNT_CONTRACT_ID> \
  --source-account <OPERATOR_KEYS> \
  --network <NETWORK> \
  -- \
  get_status \
  --account_id <TARGET_ACCOUNT_ADDRESS>