# Cross-Repo Compatibility Matrix

Bridgelet is split across three independently versioned and independently
released repositories:

| Repo | Role |
|---|---|
| [`bridgelet-core`](https://github.com/bridgelet-org/bridgelet-core) | Soroban smart contracts (on-chain account restrictions) |
| [`bridgelet-sdk`](https://github.com/bridgelet-org/bridgelet-sdk) | Backend API (NestJS) that the frontend talks to and that calls `bridgelet-core` |
| `bridgelet` (this repo) | Reference Next.js frontend + docs |

Because each repo ships on its own cadence, a given frontend release only
behaves correctly against specific `bridgelet-sdk` (and, transitively,
`bridgelet-core`) versions: a newer or older SDK can rename a response
field, change an endpoint, or expect a contract ID the frontend doesn't
know about. This table is the record of which combinations have actually
been exercised together, so nobody has to guess or find out in production.

## Matrix

| `bridgelet` (this repo) | `bridgelet-sdk` | `bridgelet-core` | Status | Verified |
|---|---|---|---|---|
| `main` (unreleased, root `package.json` `1.0.0`) | `main` @ [`42e3cde`](https://github.com/bridgelet-org/bridgelet-sdk/commit/42e3cdef4b2edca4134e4a7f9f977749c53a54db) (`0.0.1`) | `main` @ [`47bb675`](https://github.com/bridgelet-org/bridgelet-core/commit/47bb6751b0e989bbcdf3cb6efda92679b7b6d983) | 🟡 Pinned, not yet CI-verified | N/A |

**Status legend**

| Status | Meaning |
|---|---|
| 🟢 Verified | The pinned combination has a passing run of `.github/workflows/compatibility.yml`: see the linked run in the *Verified* column. |
| 🟡 Pinned | The combination is what CI is configured to check next, but no run has passed yet. |
| 🔴 Broken | A CI run against this pin failed. Do not deploy this frontend version against this SDK version. |

Neither `bridgelet-sdk` nor `bridgelet-core` has cut a tagged release yet,
so the current row pins to a commit SHA on `main` rather than a semver
tag. Once either repo starts tagging releases, new rows should pin to
tags (e.g. `v0.2.0`) instead of raw commits.

## Machine-readable source of truth

The row above is generated from [`compatibility.json`](../compatibility.json)
at the repo root, which is what both CI and the release process actually
read:

- [`.github/workflows/compatibility.yml`](../.github/workflows/compatibility.yml)
  checks out `bridgelet-sdk` at `verified.bridgeletSdk.commit`, boots it, and
  runs [`scripts/check-sdk-contract.mjs`](../scripts/check-sdk-contract.mjs)
  against its live OpenAPI spec (`GET /api/docs-json`): the job fails if an
  endpoint or field that
  [`frontend/lib/create-bridgelet-client.ts`](../frontend/lib/create-bridgelet-client.ts)
  depends on is missing, which is exactly the "frontend assumes a response
  shape/endpoint a different SDK version doesn't provide" failure mode this
  doc exists to catch. (It checks field-name presence, not full type or enum
  equivalence: see the script's header comment for what it does and does
  not catch.) When `BRIDGELET_SDK_*` secrets are configured (see below) the
  job additionally runs the frontend's e2e suite (`e2e/`) in "SDK
  integration" mode (see
  [`e2e/README.md`](../e2e/README.md#running-against-a-real-bridgelet-sdk-instance))
  as a best-effort secondary check: the workflow's own comments note which
  flows that suite doesn't yet exercise end-to-end.
- [`scripts/check-compatibility-doc.mjs`](../scripts/check-compatibility-doc.mjs)
  is run by `release-it` (via `.release-it.json`'s `before:git:release`
  hook) and blocks tagging a new release until this file and
  `compatibility.json` have been updated to match the version being
  released.

## Updating the matrix

Do this whenever `bridgelet-sdk` or `bridgelet-core` cuts a release you
want the frontend verified against, and always as part of cutting a new
`bridgelet` release:

1. Update `compatibility.json`:
   - Bump `frontend.version` to the version about to be released (must
     match the root [`package.json`](../package.json) `version`).
   - Update `verified.bridgeletSdk` / `verified.bridgeletCore` to the
     `ref`/`commit`/`version` you want CI to check.
   - Set `status` back to `"pinned"` and update `pinnedOn`: CI flips it
     to `verified` conceptually once the workflow run below is green (add
     the run URL to this file's matrix row manually).
2. Push the change (or open the PR containing it), `.github/workflows/compatibility.yml`
   runs on PRs that touch `compatibility.json` and on its daily schedule.
3. Once the workflow passes, add a row to the **Matrix** table above with
   the verified versions, the ✅ status, and a link to the passing run.
4. `npm run release` (or however `release-it` is invoked) will refuse to
   tag if step 1 wasn't done for the version being released; see
   [`scripts/check-compatibility-doc.mjs`](../scripts/check-compatibility-doc.mjs).

## Required CI secrets

The live-network portion of `.github/workflows/compatibility.yml` starts a
real `bridgelet-sdk` instance against Stellar **testnet**, which needs a
funded testnet account and deployed `bridgelet-core` contract IDs. These
are organization secrets, not something a contributor's PR can supply:

| Secret | Used for |
|---|---|
| `BRIDGELET_SDK_FUNDING_ACCOUNT_SECRET` | `bridgelet-sdk`'s `FUNDING_ACCOUNT_SECRET`: the testnet keypair that funds ephemeral accounts |
| `BRIDGELET_SDK_RECOVERY_ACCOUNT_PUBLIC` | `bridgelet-sdk`'s `RECOVERY_ACCOUNT_PUBLIC` |
| `BRIDGELET_SDK_EPHEMERAL_ACCOUNT_CONTRACT_ID` | Deployed `bridgelet-core` `EphemeralAccount` contract ID on testnet |
| `BRIDGELET_SDK_SWEEP_CONTROLLER_CONTRACT_ID` | Deployed `bridgelet-core` `SweepController` contract ID on testnet |

If these secrets aren't set (e.g. in a fork), the job's pass/fail result is
unaffected: the OpenAPI contract check above installs, builds, migrates,
and boots the pinned `bridgelet-sdk` using an unfunded, freshly generated
throwaway keypair, then checks its live spec: none of that requires real
funds. Only the secondary, best-effort browser e2e run is skipped, and the
job summary says so explicitly rather than reporting a false pass. See the
workflow file for exactly which steps are gated.

## Known gap this check does not close

While building this check we found that `frontend`'s `AccountStatus` type
(`pending | claimed | expired`) does not match `bridgelet-sdk`'s actual
`AccountStatus` enum (`pending_payment | pending_claim | claimed | expired
| failed`). `scripts/check-sdk-contract.mjs` deliberately checks field
*names*, not enum values, so it does not fail on this: seeded here as a
known, pre-existing drift for whoever picks it up next, not something
introduced or fixed by this change.
