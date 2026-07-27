# Org Integration API Key Model (Option A)

## The deferral

`docs/sender-auth-model.md` evaluates three sender-auth options and picks Option B
(wallet-based). Option A — a static API key supplied via an `X-API-Key` header
from the environment — is **rejected for the browser UI**, on the grounds that any
key shipped to a browser would leak in the JS bundle.

But the same document does not discard Option A entirely. Its Security Notes
state that for server-side and org integrations calling the Bridgelet API from a
backend, an env-level API key remains viable, and that **this flow "should be
documented separately in an integration guide."**

This entry exists to track whether that separate documentation now exists.

## Does the integration guide cover it?

`docs/integration-guide.mdx` (with a paired `integration-guide.pdf`) does exist,
and it **does** reference an API key — it shows SDK construction as
`new BridgeletSDK({ apiKey: process.env.BRIDGELET_API_KEY })` and lists
`BRIDGELET_API_KEY` in its environment-variable table.

So the *mechanical* usage is documented: an integrator knows the variable name
and how to pass it to the SDK.

## The gap, stated plainly

What the integration guide does **not** appear to cover is the *auth model*
itself, which is what `sender-auth-model.md` deferred. Specifically, nothing found
during this review documents:

- How an org **obtains** an API key, or who issues it.
- Key **rotation** or revocation.
- What **scope or authority** a key carries — can it create payment intents on
  behalf of arbitrary senders?
- How the key-based path relates to the wallet-signature proof that Option B
  relies on, given the two establish authority very differently.

This is recorded as a gap, not filled in here. Answering these speculatively
would risk documenting an auth model that was never designed. The open question
belongs back with `sender-auth-model.md`'s authors.

## Related

- [`sender-vs-recipient-auth-models.md`](./sender-vs-recipient-auth-models.md)
