# Experiment: Freighter Sender Signing for Account Creation

## Goal

Evaluate a client-side sender-signing path where the browser asks Freighter to
sign an unsigned account-creation transaction XDR, instead of relying only on
backend signing keys.

## Implemented Flow

1. Sender connects Freighter in the send flow.
2. On Confirm, frontend orchestration (`lib/freighter-sender-signing.ts`) checks
   the experiment feature flag and Freighter signing availability.
3. Frontend calls `POST /api/accounts/prepare` (Next.js proxy to
   `BRIDGELET_SDK_URL/accounts/prepare`) with the account payload.
4. If `unsignedTxXdr` is returned, frontend signs via Freighter `signTransaction`.
5. Frontend verifies the Freighter signer address matches `fundingSource`.
6. Frontend submits `POST /api/accounts` with:
   - the original account-creation payload
   - `signedTxXdr`
   - `signerAddress`
   - `networkPassphrase`
   - `signingMode: "freighter-client"`
7. If prepare/sign is unavailable, frontend falls back to the existing backend
   signing path.

## Feature Flag

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_ENABLE_FREIGHTER_SENDER_SIGNING` | enabled | Set to `false` / `0` / `off` to force backend signing only |

## Why Fallback Exists

This is intentionally experimental. Some environments may not yet implement the
`prepare` endpoint or may not expose transaction signing capabilities. Fallback
keeps the sender flow operational while the experiment rolls out.

Fallback is **not** used when:

- the user rejects the Freighter signing prompt
- Freighter returns a signer address that does not match the funding wallet
- Freighter returns an empty/invalid signed XDR

## Security Tradeoffs

Pros:

- Reduces backend custody over sender signing for account creation.
- Sender private key remains in wallet extension; browser receives only signed XDR.
- Improves non-custodial posture for funding authorization.
- Signer/funding-source equality check reduces accidental cross-account signing.

Cons / Risks:

- Browser-side signing adds wallet/API dependency and extension UX failure modes.
- Unsigned XDR still originates from backend; integrity checks are required
  server-side (signature verification, amount/destination binding).
- Fallback path can hide rollout gaps unless monitored (log `signingMode` and
  fallback reason).
- Prepare proxy still trusts `BRIDGELET_SDK_TOKEN` server-side; keep that secret
  out of the browser bundle.

## Files

| Path | Role |
| --- | --- |
| `frontend/app/api/accounts/prepare/route.ts` | Proxy prepare endpoint |
| `frontend/lib/freighter-sender-signing.ts` | Experiment orchestration |
| `frontend/lib/wallet.ts` | Freighter connect + `signTransaction` helpers |
| `frontend/components/send-form/steps/confirm-step.tsx` | Send confirm UX |

## Validation Checklist

- Frontend typecheck passes.
- Frontend tests pass, including wallet signing helper tests and Freighter
  confirm-step coverage.
- Manual send flow test:
  - Freighter installed path attempts prepare/sign/submit.
  - User rejection shows an error (no silent backend fallback).
  - Missing-prepare path falls back and still returns claim URL.
