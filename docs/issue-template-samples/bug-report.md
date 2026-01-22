# Sample Bug Report

Summary: Sweep fails when claim happens after expiration window

Steps to Reproduce:
1. Create an ephemeral account with a 10-minute expiration.
2. Wait 12 minutes.
3. Attempt to claim via the standard claim flow.

Expected Behavior:
Claim returns a clear "expired" error and recovery flow triggers.

Actual Behavior:
Claim returns a generic 500 error and no recovery is triggered.

Environment:
- OS: macOS 15
- Node.js: 20.11.0
- SDK/Package version: 0.1.0
- Network: testnet

Acceptance Criteria:
- Claim returns a deterministic expired error.
- Recovery flow is triggered or documented.
