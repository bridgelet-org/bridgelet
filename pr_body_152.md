Closes #152

### What does this PR do?
This PR introduces placeholder UI stubs for future multi-chain network support (Base, Polygon, Solana) within the application's send and claim flows.

### Description
- **Send Form (`details-step.tsx`)**: Added a visual `Network` selector field at the top of the form. It cleanly highlights `Stellar` as the active choice while correctly stubbing out `Base`, `Polygon`, and `Solana` as disabled options with prominent `COMING SOON` badges.
- **Claim Form (`accessible-claim-form.tsx`)**: Similarly implemented the disabled multi-chain selector into the claim payment form with equivalent WCAG-compliant styling, ensuring the future roadmap is visibly communicated to end-users without interfering with the current Stellar-only UX flow.
