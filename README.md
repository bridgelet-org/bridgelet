# Bridgelet

[![Frontend CI](https://github.com/bridgelet-org/bridgelet/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/bridgelet-org/bridgelet/actions/workflows/frontend-ci.yml)

**Ephemeral accounts for onboarding non-crypto users into Stellar**

## Overview

Bridgelet is an open-source infrastructure SDK that enables organizations to send payments to recipients who don't have crypto wallets yet. It creates secure, single-use Stellar accounts that automatically bridge recipients into permanent wallets when they claim funds.

Bridgelet reduces wallet friction in mass payment scenarios such as payro;;, aid disbursements, airdrops, and remittances without erequiring recipients to understand seed phrases or Steller concepts upfront.

Bridgelet is designed as infrastructure, not an end-user wallet or disbursement platform. It can operate as a standalone or integrated with systems like the Stellar Disbursement Platform (SDP)

**The problem:** Mass payments (payroll, aid, airdrops) fail when recipients don't have wallets or understand seed phrases.

**The solution:** Create temporary accounts that recipients can claim without crypto knowledge, then auto-sweep funds to permanent wallets.

## Key Features

- ✅ Single-use ephemeral Stellar accounts
- ✅ No seed phrase management for recipients
- ✅ Automatic sweep to permanent wallets
- ✅ Time-based expiration with fund recovery
- ✅ Composable with existing payment platforms

## Architecture

* **[bridgelet-core](https://github.com/bridgelet-org/bridgelet-core)**: Soroban smart contracts for on-chain restrictions
* **[bridgelet-sdk](https://github.com/bridgelet-org/bridgelet-sdk)**: Backend SDK and API (NestJS + TypeScript)
* **bridgelet-ui**: Reference UI demonstrating SDK integration (Next.js 16+, TypeScript, Tailwind CSS)
  └─ Located in `frontend/` within this repository
* **bridgelet-mobile**: Native cross-platform mobile client (React Native, Expo, TypeScript)
  └─ Located in `mobile/` within this repository (Active/In-Progress roadmap component)

## Repository Structure

This is a monorepo containing the docs, frontend reference implementation, and mobile application:

```text
bridgelet/
├── frontend/         # Next.js Reference UI
│   ├── app/          # App router pages (/, /send, /claim/[token])
│   ├── components/   # Reusable UI components
│   ├── lib/          # Utilities and SDK wrappers
│   └── ...
├── mobile/           # React Native / Expo Mobile Application
│   ├── app/          # Expo router screens
│   ├── services/     # Logger & storage services
│   └── README.md     # Mobile app documentation
└── docs/             # Technical specifications and guides
```

## 📚 Documentation

Comprehensive documentation is available in the [`/docs`](./docs) directory:

| Document                                                                                               | Description                                      |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| [📐 Architecture Overview](https://github.com/bridgelet-org/bridgelet/raw/main/docs/architecture.pdf)  | System design and component interactions         |
| [🔒 Security Model](https://github.com/bridgelet-org/bridgelet/raw/main/docs/security-model.pdf)       | Security considerations and threat model         |
| [🚀 Getting Started](https://github.com/bridgelet-org/bridgelet/raw/main/docs/getting-started.pdf)     | Quick start guide for developers                 |
| [🔧 Integration Guide](https://github.com/bridgelet-org/bridgelet/raw/main/docs/integration-guide.pdf) | Step-by-step integration instructions            |
| [💡 Use Cases & Examples](./docs/use-cases.md)                                                         | Real-world use cases with runnable code samples |
| [📋 MVP Specification](https://github.com/bridgelet-org/bridgelet/raw/main/docs/mvp-specification.pdf) | Minimum viable product requirements              |
| [🧪 Testing Guide](./TESTING.md)                                                                       | Testing strategy, Lighthouse CI, and guidelines  |
| [🔗 Compatibility Matrix](./docs/compatibility.md)                                                     | Which frontend releases are verified against which bridgelet-sdk / bridgelet-core versions |
| [🔐 Freighter Sender Signing Experiment](./docs/experiments/freighter-sender-signing.md)               | Client-side Freighter signing for account creation |

> **📌 Note:** If PDFs don't render in your browser, click the links above to download them directly, or see the [docs directory](./docs) for more information.

This documentation is actively maintained and will evolve as the project progresses.

## Quick Start

### Frontend Setup

The reference UI is built with **Next.js 16+**, **TypeScript 5+** (Strict Mode), and **Tailwind CSS**.

To run the frontend locally:

```bash
# Navigate to the frontend directory
cd frontend

# Set up environment variables
cp .env.example .env.local

# Install dependencies
npm install

# Run the development server
npm run dev
```

The application will be available at `http://localhost:3000`. 

#### Core Pages:
- `/` — Homepage & animated How It Works explainer
- `/send` — Sender Flow (Create ephemeral account)
- `/claim/[token]` — Recipient Flow (Direct claim redemption)

### SDK & Core Setup

For backend or smart contract development, please refer to the specific repositories:
- [bridgelet-sdk](https://github.com/bridgelet-org/bridgelet-sdk) setup instructions
- [bridgelet-core](https://github.com/bridgelet-org/bridgelet-core) setup instructions

## Repositories

- **[bridgelet-sdk](https://github.com/bridgelet-org/bridgelet-sdk)** - Backend SDK (NestJS + TypeScript)
- **[bridgelet-core](https://github.com/bridgelet-org/bridgelet-core)** - Smart contracts (Soroban + Rust)
- **bridgelet** - Reference UI implementation and documentation (This repository)

Each repo is versioned and released independently — see the
[Compatibility Matrix](./docs/compatibility.md) for which combinations of
frontend / `bridgelet-sdk` / `bridgelet-core` versions are known to work
together, and [`.github/workflows/compatibility.yml`](./.github/workflows/compatibility.yml)
for the CI job that verifies it.

## MVP Scope (v0.1)

- Create single-use Stellar accounts programmatically
- Accept one inbound payment per account
- Lock outbound transfers to one destination
- Auto-sweep on claim
- Expire unclaimed accounts after time window

See [MVP Specification](https://github.com/bridgelet-org/bridgelet/raw/main/docs/mvp-specification.pdf) for complete details.

## Status

🚧 **Early Development** - Building core primitives

**Current phase:** MVP implementation (Q1 2026)

See our [Public Roadmap](./ROADMAP.md) for future plans and milestones.

## Security

Security is critical for financial infrastructure. If you discover a vulnerability, please review our [Security Policy](./SECURITY.md) for responsible disclosure guidelines.

**Security Contact:** aminubabafatima8@gmail.com

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Please also review our [Code of Conduct](./CODE_OF_CONDUCT.md) and [Support Guide](./SUPPORT.md) before engaging.

Areas of interest:

- Soroban smart contract development
- Financial infrastructure for emerging markets
- Developer experience and SDK design

## License

MIT License - see [LICENSE](./LICENSE)

## Contact

- **Issues:** [GitHub Issues](https://github.com/bridgelet-org/bridgelet/issues)
- **Discussions:** [GitHub Discussions](https://github.com/bridgelet-org/bridgelet/discussions)
- - Support Overview: [SUPPORT.md](./SUPPORT.md)
  <!-- - Stellar Discord: [#bridgelet](https://discord.gg/stellardev) -->

---

**Built for the Stellar ecosystem 🌟**
## Deploying the Frontend

### Required Environment Variables

| Variable | Scope | Description | Default Local Example |
| :--- | :--- | :--- | :--- |
| NEXT_PUBLIC_APP_URL | Client & Server | Canonical public origin for frontend | http://localhost:3000 |
| NEXT_PUBLIC_API_BASE_URL | Client (Browser) | Public SDK URL for /claims/* endpoints | http://localhost:3001 |
| NEXT_PUBLIC_CRYPTO_NETWORK | Client (Browser) | Target Stellar network | stellar-testnet |
| BRIDGELET_SDK_URL | Server-only | Private or public SDK URL for backend route handlers | http://localhost:3001 |
| BRIDGELET_SDK_TOKEN | Server-only | JWT signed with SDK JWT_SECRET (single line) | *(minted from SDK)* |

### Production Configuration Checklist
1. **Minting SDK Token**: Mint a JWT signed with the SDK's JWT_SECRET containing sender authorization. Paste as a single unbroken string in BRIDGELET_SDK_TOKEN.
2. **CORS & Claim Base URL**: Set SDK CLAIM_BASE_URL to match the frontend public domain (e.g. https://app.bridgelet.org), and ensure SDK CORS origin allows requests from the frontend origin.
3. **Serverless Function Duration**: Ensure host serverless limits accommodate up to 60s execution for account funding and claim operations (pp/api/accounts).
4. **Environment Verification**: Run 
pm run check-env to ensure all production variables are set without leaks prior to deploying.
