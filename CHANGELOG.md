# Changelog

All notable changes to Bridgelet will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial MVP implementation of Bridgelet for ephemeral Stellar accounts
- **bridgelet-core**: Soroban smart contracts for on-chain account restrictions, sweep logic, and event emission ([bridgelet-core](https://github.com/bridgelet-org/bridgelet-core))
- **bridgelet-sdk**: NestJS backend SDK for account lifecycle management, claim authentication, and webhook system ([bridgelet-sdk](https://github.com/bridgelet-org/bridgelet-sdk))
- Ephemeral account creation with programmable restrictions (funding source, amount, asset, expiration)
- Single inbound payment acceptance per account with validation
- Automatic fund sweep to permanent wallets upon successful claim redemption
- Time-based account expiration with automatic fund recovery to sender
- On-chain event monitoring and emission for all state changes (AccountCreated, PaymentReceived, SweepExecuted, AccountExpired)
- REST API endpoints for account creation, retrieval, claim redemption, and webhook subscriptions
- Database schema for accounts, claims, and webhooks with PostgreSQL
- Comprehensive documentation including architecture overview, security model, integration guide, and use cases
- Testing requirements and deployment specifications for MVP

### Changed

### Deprecated

### Removed

### Fixed

### Security
