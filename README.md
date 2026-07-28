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

## Repository Structure

This is a monorepo containing both the docs and frontend reference implementation:

```text
bridgelet/
├── frontend/         # Next.js Reference UI
│   ├── app/          # App router pages (/, /send, /claim/[token])
│   ├── components/   # Reusable UI components
│   ├── lib/          # Utilities and SDK wrappers
│   └── ...
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
| [💡 Use Cases & Examples](https://github.com/bridgelet-org/bridgelet/raw/main/docs/use-cases.pdf)      | Real-world use cases and examples                |
| [📋 MVP Specification](https://github.com/bridgelet-org/bridgelet/raw/main/docs/mvp-specification.pdf) | Minimum viable product requirements              |
| [🧪 Testing Guide](./TESTING.md)                                                                       | Testing strategy, Lighthouse CI, and guidelines  |
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
