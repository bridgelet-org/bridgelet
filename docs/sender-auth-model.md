# Sender Auth Model for `/send`

## Decision

**Option B: Wallet-based auth via Freighter** is the chosen approach for the `/send` page.

## Options Evaluated

| Option | Description | Verdict |
|--------|-------------|---------|
| A: API key in env | Caller includes a static `X-API-Key` header from `.env`. Suits backend org integrations. | ❌ Rejected for browser UI: key would leak in the JS bundle. |
| B: Wallet-based auth (Freighter) | Sender connects Freighter browser extension. The public key identifies them; transaction signing is the implicit proof of auth. | ✅ **Chosen.** Native to Stellar, non-custodial, already supported by `lib/wallet.ts`. |
| C: No auth (open send) | `/send` is fully open with no identity check. | ❌ Rejected for MVP: unmitigated spam/abuse risk without rate-limiting. |

## How It Works

1. The `/send` page renders a `WalletConnect` component (`frontend/components/wallet-connect.tsx`).
2. The user clicks **Connect Freighter Wallet**: this opens the Freighter extension popup.
3. On approval, the sender's Stellar public key is returned.
4. When the sender creates a payment intent, the Bridgelet SDK signs the transaction with the connected key, which serves as the auth proof; no JWT is issued or stored.

## Security Notes

- No session token or JWT is created. Wallet ownership is proven at transaction-signing time.
- LOBSTR (mobile wallet) is supported via a paste-your-public-key fallback already wired in `lib/wallet.ts`.
- For server-side / org integrations that call the Bridgelet API from a backend, an env-level API key (Option A) remains viable. That flow should be documented separately in an integration guide.

## Files Changed

| File | Change |
|------|--------|
| `frontend/components/wallet-connect.tsx` | New: Freighter connect button with connected/error states |
| `frontend/app/send/page.tsx` | Updated: renders `WalletConnect` before the API config display |

## References

- `frontend/lib/wallet.ts`: `connectFreighter()` and wallet persistence helpers
- [Freighter browser extension](https://freighter.app)
- [Freighter JS API docs](https://docs.freighter.app)
