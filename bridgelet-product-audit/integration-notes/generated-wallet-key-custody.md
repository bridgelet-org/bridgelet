# Generated Wallet — Key Custody

An open design question, recorded before the code in question acquires its first
caller.

## Current state

`generateNewWallet()` in `frontend/lib/wallet.ts` mints a fresh Stellar keypair
client-side and returns the secret in plaintext:

```ts
const { Keypair } = await import('@stellar/stellar-sdk');
const keypair = Keypair.random();
return {
  wallet: { publicKey: keypair.publicKey(), type: 'generated' },
  secretKey: keypair.secret(),
};
```

A search of `frontend/app` and `frontend/components` finds **no caller**. The only
other reference in the repo is documentation: `docs/security-model.mdx` logs it as
threat **T-15** ("Private key leak from generated wallet"), noting the secret is
returned directly to the caller, that the flow is not presented in the UI by
default, and rating it **⚠️ Partial — secret handling requires audit**.

So the function is written, typed, exported, and unused.

## What a safe design must specify first

Because the secret is returned as a plain string to browser JavaScript, whoever
writes the first caller inherits every one of these decisions:

1. **Storage.** Where does the secret live? Note that the existing persistence
   path is *not* an answer — `persistWallet()` stores only `{ publicKey, type }`
   and has no field for a secret. Anything else means a new mechanism, and
   `localStorage` is readable by any script on the origin.
2. **Transmission.** Is the secret ever sent anywhere? It must never reach the
   backend, or the "non-custodial" framing of the `generated` path collapses.
3. **Recovery.** How does the user get it back? A keypair generated in a browser
   tab and never displayed or exported is lost when that tab closes — along with
   the funds. Some deliberate export/backup step is mandatory, not optional.
4. **Lifetime in memory.** How long does the string sit in JS memory, and what
   else on the page could read it?

## Framing

This is **not currently exploitable** — no caller means no live path producing a
secret. That is exactly why it is worth writing down now: specifying custody is
cheap while the answer is still "nobody uses this", and expensive once a UI ships
that hands users keys. Treat T-15 as blocking on the first caller, not on today.
