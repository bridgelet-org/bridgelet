# Bridgelet

**Ephemeral accounts for onboarding non-crypto users into Stellar**

## Overview

Bridgelet is an open-source infrastructure SDK that enables organizations to send payments to recipients who don't have crypto wallets yet. It creates secure, single-use Stellar accounts that automatically bridge recipients into permanent wallets when they claim funds.

**The problem:** Mass payments (payroll, aid, airdrops) fail when recipients don't have wallets or understand seed phrases.

**The solution:** Create temporary accounts that recipients can claim without crypto knowledge, then auto-sweep funds to permanent wallets.

## Key Features

- ✅ Single-use ephemeral Stellar accounts
- ✅ No seed phrase management for recipients
- ✅ Automatic sweep to permanent wallets
- ✅ Time-based expiration with fund recovery
- ✅ Composable with existing payment platforms

## Architecture

- **[bridgelet-core](https://github.com/bridgelet-org/bridgelet-core):** Soroban smart contracts for on-chain account restrictions and sweep logic
- **[bridgelet-sdk](https://github.com/bridgelet-org/bridgelet-sdk):** NestJS backend SDK for account lifecycle management and claim authentication
- **[bridgelet-ui](https://github.com/bridgelet-org/bridgelet-frontend):** (Future) Next.js reference implementation for claim flows

## Documentation

Comprehensive documentation is available in `/docs`:

- [📘 Architecture Overview](./docs/architecture.pdf)
- [🔒 Security Model](./docs/security-model.pdf)
- [🚀 Getting Started Guide](./docs/getting-started.pdf)
- [🔧 Integration Guide](./docs/integration-guide.pdf)
- [📊 Use Cases & Examples](./docs/use-cases.pdf)
- [📝 Changelog](./CHANGELOG.md)

This documentation is still a work in progress and will constantly change as the project progresses. If pdf file is not visible on github, clone the repo to view full documentation

## Quick Start

```bash
# Clone repositories
git clone https://github.com/bridgelet-org/bridgelet-sdk.git
git clone https://github.com/bridgelet-org/bridgelet-core.git

# See individual repo READMEs for setup instructions
```

## Repositories

- **[bridgelet-sdk](https://github.com/bridgelet-org/bridgelet-sdk.git)** - Backend SDK (NestJS + TypeScript)
- **[bridgelet-core](https://github.com/bridgelet-org/bridgelet-core.git)** - Smart contracts (Soroban + Rust)

## MVP Scope (v0.1)

- Create single-use Stellar accounts programmatically
- Accept one inbound payment per account
- Lock outbound transfers to one destination
- Auto-sweep on claim
- Expire unclaimed accounts after time window

See [MVP Specification](./docs/mvp-specification.pdf) for details.

## Status

🚧 **Early Development** - Building core primitives

Current phase: MVP implementation (Q1 2026)

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

MIT License - see [LICENSE](LICENSE)

## Contact

 - Issues: [GitHub Issues](https://github.com/bridgelet-org/bridgelet/issues)
 - Discussions: [GitHub Discussions](https://github.com/bridgelet-org/bridgelet/discussions)
 - Support Overview: [SUPPORT.md](./SUPPORT.md)
<!-- - Stellar Discord: [#bridgelet](https://discord.gg/stellardev) -->

---

**Built for the Stellar ecosystem 🌟**
