Closes #155

### What does this PR do?
This PR introduces a robust `?demo=true` query flag that enables the reference UI to securely execute the full send and claim end-to-end flow directly against MSW (Mock Service Worker) endpoints, bypassing the need for a real SDK backend.

### Description
- **Universal MockProvider**: Re-configured `MockProvider` so it can be dynamically activated in production via the `demo=true` URL parameter, in addition to its default `development` environment behavior.
- **Dynamic Send Flow**: Refactored the `ConfirmStep` in the send flow to swap out its hardcoded `setTimeout` placeholder with a live `fetch` to the `/api/accounts` MSW handler, properly extracting the simulated claim token and claim URL. 
- **Claim Flow Client Wrapper**: Engineered a `ClaimFlow` client wrapper component for the server-rendered claim page. This delegates the "Claim now" action to actually hit the `/claims/redeem` mock endpoint, returning the mocked sweep response dynamically.
- **Link Visibility**: Showcased the dynamically generated claim link directly within the success screen for an authentic demonstrative experience when running in demo mode.
