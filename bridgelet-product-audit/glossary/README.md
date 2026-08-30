# Glossary Index

**Important:** The canonical short-definition reference for all Bridgelet terms remains `docs/GLOSSARY.md`. This subfolder contains expanded, detailed entries that elaborate on those core definitions with implementation specifics, context, and technical deep dives.

Entries are grouped thematically for easier navigation:

## Wallet Connection Terms
Deep dives on wallet types, persistence, and connection logic:

- **[Wallet Connection Types](wallet-connection-types.md)** — Expands on the three `WalletType` values (freighter, lobstr, generated) in `frontend/lib/wallet.ts`, explaining their actual implementation differences and limitations.
- **[Connected Wallet Persistence](connected-wallet-persistence.md)** — Details how wallet data is stored in localStorage, what fields are persisted (only publicKey and type, no secret material), and how corrupted values are handled.
- **[Freighter vs LOBSTR vs Generated Tradeoffs](freighter-vs-lobstr-vs-generated-tradeoffs.md)** — Compares the security, UX, and implementation tradeoffs between the three supported wallet connection approaches.
- **[Ephemeral Account in the Product Narrative](ephemeral-account-in-the-product-narrative.md)** — Explains the role of client-side generated wallets in the product's overall account model and user journey.
- **[Custodial Model in Practice](custodial-model-in-practice.md)** — Details how Bridgelet's custody model works for each wallet type, including key responsibility and recovery implications.
- **[Sender vs Recipient Auth Models](sender-vs-recipient-auth-models.md)** — Distinguishes between the authentication requirements for senders (who connect wallets to create claims) and recipients (who claim funds).

## Claim Flow Terms
Detailed explanations of the claim lifecycle and related concepts:

- **[Claim Token and Claim URL](claim-token-and-claim-url.md)** — Expands on the core glossary definitions with implementation details: how the token is used as a route segment in Next.js, and the structure of the claim UI route.

## Repository Structure Terms
Clarifications on repository organization, tooling, and documentation standards:

- **[Docs MDX vs PDF Pairs](docs-mdx-vs-pdf-pairs.md)** — Lists which documentation files exist as editable MDX sources with PDF exports vs. PDF-only files, and explains the maintenance implications of each.
- **[Branch Protection Reference](branch-protection-reference.md)** — Summarizes the main branch protection rules from `.github/BRANCH_PROTECTION.md` for quick reference during PR reviews.
- **[Test Result Directories](test-result-directories.md)** — Clarifies the difference between the singular `frontend/test-result/` (committed test source files) and plural `frontend/test-results/` (generated Playwright output) directories.
- **[Lighthouse CI Config](lighthouse-ci-config.md)** — Explains the repository's Lighthouse CI setup and what metrics it tracks for frontend performance and accessibility.
- **[Mobile App Services Logger](mobile-app-services-logger.md)** — Details the only populated service module in the mobile app's `mobile/services/` directory, including its log level filtering and exported interface.
- **[Analytics Spec Overview](analytics-spec-overview.md)** — Expands on the analytics event specification, including how events are categorized and what each event is intended to track.
- **[FRD UI/UX Overview](frd-ui-ux-overview.md)** — References the Functional Requirements Document that outlines the original UI/UX specifications for the product.
- **[Multi-Chain Evaluation Summary](multi-chain-evaluation-summary.md)** — Summarizes past evaluations of adding support for blockchains beyond Stellar, including the findings and decisions made.
- **[Org Integration API Key Model](org-integration-api-key-model.md)** — Explains the API key authentication model for organizational integrations with the Bridgelet platform.
- **[Governance and Roadmap Cross-Reference](governance-and-roadmap-cross-reference.md)** — Details how the project's governance process interacts with product roadmap planning and prioritization.