# Full Demo Mode

Bridgelet provides a comprehensive "Demo Mode" built entirely on top of MSW (Mock Service Worker). This mode intercepts all backend SDK API calls (`/send`, `/claim/:token`, `/claim/:token/redeem`) directly in the browser and returns mocked responses.

## Why use Demo Mode?
- **Conferences & Demos:** Confidently demo the entire send and claim flows without needing a live backend, database, or risking network timeouts.
- **Onboarding:** Allows new front-end contributors to run and test the UI immediately after cloning the repository without setting up the entire backend stack.
- **UI/UX Testing:** Instantly generate mock claims to test different edge cases in the UI.

## How to use it
To trigger demo mode, simply append the `?demo=true` query parameter to the URL in your browser:

```
http://localhost:3000/send?demo=true
```

1. Navigate to the Send page with the flag.
2. Fill out the mock payment details and confirm.
3. The mock API will intercept the `createPaymentIntent` request and return a mock `claimUrl` that persists the `?demo=true` flag.
4. Clicking or navigating to the mock claim URL will intercept the `getClaimDetails` and `redeemClaim` requests, simulating a successful claim flow!

## Limitations
- **Ephemeral State:** Because the "database" is just the MSW worker running in memory, refreshing the page after creating a claim will lose that claim's state.
- **No Real Transactions:** The mock redeemer returns a hardcoded fake transaction hash (`mock-tx-hash-0987654321`) which will 404 if you attempt to view it on the Stellar Explorer.
