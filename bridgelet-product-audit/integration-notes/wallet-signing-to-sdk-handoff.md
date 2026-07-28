# Wallet Signing → SDK Handoff

What happens between a wallet signing in the browser and the transaction reaching
the chain. Recorded at integration-note level; the precise division of labour
needs confirming (see the flag at the bottom).

## The shape of the handoff

As currently implemented:

1. The browser obtains **signed transaction XDR** from Freighter.
   `signFreighterTransaction()` in `frontend/lib/wallet.ts` passes unsigned XDR
   plus a `networkPassphrase` to the extension and reads back
   `{ signedTxXdr, signerAddress, networkPassphrase }`. The secret key never
   leaves the extension.
2. The frontend hands that off to the **bridgelet-sdk API**.
3. The **API layer, not the browser**, talks to Soroban/Horizon. Per
   bridgelet-sdk-audit's `horizon-vs-soroban-rpc.md`, network access lives on the
   backend side. The browser does not submit transactions directly.

Network selection is resolved browser-side from `NEXT_PUBLIC_CRYPTO_NETWORK`,
defaulting to `stellar-testnet` — meaning the passphrase the user signs against is
chosen by frontend configuration.

## The ambiguity worth resolving

`docs/sender-auth-model.md` describes step 4 of its flow as: *"the Bridgelet SDK
signs the transaction with the connected key."*

That sentence can be read two ways, and the readings have very different security
properties:

| Reading | Who holds the key | Implication |
|---|---|---|
| **A** — the SDK *triggers* signing by the connected wallet | Freighter extension | Non-custodial for this step; matches `signFreighterTransaction()` |
| **B** — the SDK itself signs with a key it holds | Backend | Custodial for this step; the "connected key" is not the signer |

Reading A is consistent with the code in `lib/wallet.ts`, which is unambiguously
extension-side signing. But the same document elsewhere leans on the SDK as an
active participant, and Bridgelet genuinely *does* hold a funding key for
ephemeral-account creation and sweeping (see the custodial model). So both
readings describe things that are true of *some* transaction in this system.

**The flag:** which party signs *which* transaction is not stated precisely
anywhere found in this review. Sender-authorised transfers and Bridgelet-initiated
funding/sweep operations plausibly have different signers, and conflating them
would misstate the trust model. This should be confirmed explicitly by someone
with knowledge of the SDK's internals rather than inferred from phrasing. See also
[`sender-auth-model-doc-accuracy.md`](./sender-auth-model-doc-accuracy.md).
