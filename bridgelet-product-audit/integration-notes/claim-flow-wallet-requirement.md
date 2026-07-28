# Claim Flow — Is a Wallet Required?

What the frontend actually requires from a recipient today.

## What the code does

The claim route is `frontend/app/claim/[token]/`, with the work done in
`claim-page-client.tsx`. The claim itself is a single call:

```ts
async function handleClaim(destinationAddress: string) {
  const result = await client.redeemClaim(token, destinationAddress);
  ...
}
```

The two inputs are the **claim token** (from the URL path) and a **destination
address string**. That is all.

Searching `claim-page-client.tsx` for wallet-connection references returns
**nothing** — no `ConnectedWallet`, no `connectFreighter()`, no import from
`lib/wallet.ts`. None of the three `WalletType` paths is invoked on the claim side.

**So no, a recipient does not connect a wallet to claim.** They supply an address,
validated by format only — `accessible-claim-form.tsx` enforces `^G[A-Z2-7]{55}$`,
the Stellar public-key shape — which is not ownership proof. This is coherent with
the product's premise: the recipient is assumed *not* to have a wallet, so
requiring one would defeat the purpose.

## Which on-chain path this maps to

bridgelet-audit documents two shapes for `bridgelet-core`:
`sweep-controller-claim-flow.md` and `sweep-controller-signature-flow.md`. The
frontend's behaviour — token plus destination address, no recipient signature —
points at the **claim flow**, not the signature flow. Bridgelet's own authority
sweeps to the supplied address; the recipient never signs.

## Mismatch worth flagging

The gap is **not** UI-implies-more-than-needed. It runs the other way. A UI that
asks only for an address may under-signal how consequential that address is. With
no ownership proof and no connected wallet to source it from, a mistyped-but-valid
`G...` address is a plausible way to send funds somewhere unrecoverable. The
`^G[A-Z2-7]{55}$` check catches malformed input, not *wrong* input — and the sweep
is irreversible once confirmed.

Whether the intended design is "any valid address, recipient's responsibility" or
"eventually require a connected wallet" is worth confirming against
`docs/bridgelet-frd-ui-ux.md`. See also
[`../glossary/sender-vs-recipient-auth-models.md`](../glossary/sender-vs-recipient-auth-models.md).
