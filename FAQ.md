# Bridgelet FAQ

**Frequently asked questions about the Bridgelet SDK for ephemeral Stellar accounts**

---

## Table of Contents

1. [General Overview](#general-overview)
2. [Security & Compliance](#security--compliance)
3. [Use Cases & Costs](#use-cases--costs)
4. [Technical Integration](#technical-integration)

---

## General Overview

### What is Bridgelet?

Bridgelet is an open-source infrastructure SDK that enables organizations to send payments to recipients who don't have crypto wallets yet. It creates secure, single-use Stellar accounts that automatically bridge recipients into permanent wallets when they claim funds.

**The problem:** Mass payments (payroll, aid distribution, airdrops) fail when recipients don't have wallets or understand seed phrases.

**The solution:** Create temporary accounts that recipients can claim without crypto knowledge, then auto-sweep funds to permanent wallets.

### Who is Bridgelet for?

Bridgelet serves three primary audiences:

| Audience | Description |
|----------|-------------|
| **Senders** | Organizations (businesses, NGOs, DAOs) that need to distribute funds to many recipients |
| **Recipients** | End users without crypto knowledge or existing wallets |
| **Integrators** | Developers building payment platforms who want to embed Bridgelet functionality |

### How does a basic claim flow work?

1. **Sender creates payment** → SDK generates ephemeral account + claim link
2. **Integrator delivers link** → Via email, SMS, QR code, or other channel (integrator's responsibility)
3. **Recipient opens link** → Lands on claim page
4. **Recipient creates/connects wallet** → Provides destination address
5. **Funds auto-sweep** → Assets transfer to recipient's permanent wallet

### What assets does Bridgelet support?

**MVP (v0.1):**
- Native XLM
- USDC (Stellar)

**Future versions** will expand to additional Stellar-based tokens.

### What blockchain does Bridgelet use?

Bridgelet is built on the **Stellar network** using:
- **Soroban smart contracts** for on-chain account restrictions
- **Horizon API** for account operations
- **Soroban RPC** for contract interactions

Both Testnet and Mainnet are supported.

---

## Security & Compliance

### Is Bridgelet custodial or non-custodial?

Bridgelet uses a **non-custodial architecture**. Funds remain in individual on-chain Stellar accounts, not in pooled custody:

- Each ephemeral account is a standard Stellar account on-chain
- The SDK stores encrypted private keys server-side for sweep operations
- Funds are never pooled or commingled
- Recipients receive funds directly to their own wallets upon claim

### What happens if a claim link is intercepted?

**Security of the claim link depends on security of the delivery channel.**

The SDK generates claim links and tokens. The **integrator is responsible** for secure delivery to recipients (via email, SMS, secure messaging, etc.). If a link is intercepted through an insecure delivery channel, the interceptor could potentially claim the funds.

**Mitigations:**
- Use secure, authenticated delivery channels
- Set shorter expiration windows for high-value transfers
- Consider additional verification steps in your claim flow

### How secure is the claim process?

The claim process includes multiple security layers:

| Layer | Protection |
|-------|------------|
| **Claim tokens** | JWT-signed, time-limited, single-use |
| **On-chain restrictions** | Smart contracts enforce single sweep destination |
| **Expiration** | Automatic expiry prevents indefinite exposure |
| **No seed phrase exposure** | Recipients never handle private keys |

**Security considerations:**
- Claim link security depends on the delivery channel (integrator's responsibility)
- MVP encryption is basic; production deployments should use AES-256
- All sweep transactions require valid claim token verification

See [Security Model](./docs/security-model.pdf) for detailed threat analysis.

### How long do claim links remain valid?

Claim link validity is **configurable per account**, with a maximum of **30 days**.

| Setting | Value |
|---------|-------|
| Minimum expiration | 1 hour |
| Maximum expiration | 30 days |

After expiration:
1. Claim link becomes invalid
2. Funds can be swept to the recovery address
3. Ephemeral account can be closed

Integrators set the `expiresIn` parameter (in seconds) when creating each account.

### What happens if the recipient never claims?

Unclaimed funds can be recovered after the account expires:

1. Each ephemeral account has a configurable expiration (up to 30 days)
2. After expiration, funds can be swept back via the smart contract's `expire()` function
3. The recovery address is configured at the smart contract level

### Can expired accounts be recovered?

**Funds yes, accounts no.**

- **Funds:** After expiration, unclaimed funds can be swept to a recovery address via the smart contract
- **Account:** Expired ephemeral accounts cannot be reactivated or extended; a new account must be created
- **Base reserve:** The 2 XLM base reserve is recovered when the account is merged

To recover funds from an expired account, call the contract's `expire()` function or use the SDK's expiration handling.

### How are private keys managed?

The SDK generates keypairs for ephemeral accounts and stores encrypted secrets server-side:

- Keys are encrypted before database storage
- Keys are used only for sweep transactions
- Each ephemeral account has its own unique keypair
- Integrators can configure their own encryption keys

**Note:** The MVP uses basic encryption. Production deployments should implement AES-256 or equivalent.

### Who is responsible for regulatory compliance?

**Integrators are responsible for compliance** with applicable regulations in their jurisdictions. Bridgelet is infrastructure software, not a regulated financial service.

Bridgelet's non-custodial architecture means:
- Funds are held in individual on-chain accounts, not pooled
- The SDK does not perform money transmission
- No built-in KYC/AML modules (integrators implement as needed)

Integrators should consult legal counsel regarding their specific use case and jurisdiction.

### Who handles recipient data and privacy?

**The SDK generates claim links. The integrator delivers them.**

This separation means:
- **SDK responsibility:** Generate ephemeral accounts, claim tokens, and links
- **Integrator responsibility:** Collect recipient contact information, deliver links, comply with GDPR/privacy regulations

The SDK stores account metadata (public keys, expiration, status). It does **not** store recipient email addresses, phone numbers, or personally identifiable information. Any PII handling is the integrator's domain.

---

## Use Cases & Costs

### What are the primary use cases?

| Use Case | Description |
|----------|-------------|
| **Payroll** | Pay contractors/employees who lack crypto wallets |
| **Aid Distribution** | Humanitarian organizations distributing funds to beneficiaries |
| **Airdrops** | Token distributions to users without existing wallets |
| **Remittances** | Cross-border payments to unbanked recipients |
| **Rewards Programs** | Distribute crypto rewards without onboarding friction |

### What does it cost to use Bridgelet?

**Per ephemeral account:**
- **2 XLM** creation cost (Stellar minimum balance requirement)
- Standard Stellar network transaction fees (~0.00001 XLM per operation)

**Who pays:**
- **Sender/Integrator:** Pays account creation costs and network fees
- **Recipient:** No fees for claiming

The 2 XLM base reserve is recovered when the ephemeral account is merged after sweep.

### Why use Bridgelet instead of direct transfers?

| Direct Transfer | Bridgelet |
|-----------------|-----------|
| Requires recipient's public key upfront | Recipient provides wallet during claim |
| Recipient must already have a wallet | Works for recipients without wallets |
| No recovery if address is wrong | Funds return to recovery address if unclaimed |
| No delivery confirmation | Claim events confirm receipt |

### Can Bridgelet be used for recurring payments?

Bridgelet ephemeral accounts are designed for **single-use, one-time payments**. Each account accepts one inbound payment and performs one outbound sweep.

For recurring payments, integrators should:
- Create a new ephemeral account for each payment cycle
- Automate account creation via the SDK API
- Track payment schedules in their own systems

**Note:** Batch account creation and recurring payment scheduling are not built into the MVP but can be implemented at the integration layer.

---

## Technical Integration

### What are the technical prerequisites?

- **Node.js** 18+ environment
- **PostgreSQL** database
- **Stellar funding account** with XLM for creating ephemeral accounts
- (Optional) Deployed Soroban contracts for on-chain restrictions

### How does Bridgelet integrate with existing payment systems?

Bridgelet integrates via its **REST API**, making it compatible with any system that can make HTTP requests:

| System Type | Integration Approach |
|-------------|---------------------|
| **ERP/Payroll** | Call `/accounts` API from batch jobs |
| **Payment platforms** | Embed SDK calls in payment workflows |
| **Custom apps** | Use API endpoints directly |
| **No-code tools** | Connect via webhooks (planned) |

**Integration pattern:**
1. Your system determines payment recipients and amounts
2. Call Bridgelet API to create ephemeral accounts
3. Receive claim URLs in response
4. Deliver claim URLs through your existing notification channels
5. Monitor claim status via API or webhooks (when available)

No changes to recipient-facing systems are required. Bridgelet handles the crypto complexity.

### How do I create an ephemeral account?

```typescript
// POST /accounts
const response = await fetch('http://localhost:3000/accounts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fundingSource: 'GSENDER...', // Your funding account
    amount: '100',
    asset: 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    expiresIn: 2592000, // 30 days in seconds
    metadata: { recipientId: 'user_123' }
  })
});

const { accountId, publicKey, claimUrl, expiresAt } = await response.json();
// claimUrl: "https://claim.bridgelet.io/c/eyJhbG..."
```

### How does the claim redemption work?

```typescript
// Recipient flow (handled by claim UI)
// 1. Initiate claim process
const initiation = await fetch('/claims/initiate', {
  method: 'POST',
  body: JSON.stringify({ claimToken: 'eyJhbG...' })
});
// Returns claim details: { accountId, amount, asset, expiresAt }

// 2. Redeem claim with destination wallet
const redemption = await fetch('/claims/redeem', {
  method: 'POST',
  body: JSON.stringify({
    claimToken: 'eyJhbG...',
    destinationAddress: 'GRECIPIENT_WALLET...'
  })
});
// Returns: { success: true, txHash: '...' }
```

### Can recipients claim without a smartphone?

**Yes.** The claim flow works on any device with a web browser:

- **Smartphone:** Mobile-optimized claim page
- **Desktop/Laptop:** Full browser support
- **Tablet:** Responsive design adapts to screen size

The only requirement is a web browser and internet connection. Recipients do not need to install any apps to claim funds, though they will need a Stellar wallet (which can be browser-based like Freighter or Albedo).

### What API endpoints are available?

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/accounts` | POST | Create ephemeral account |
| `/accounts/:id` | GET | Get account details |
| `/accounts` | GET | List accounts (with filters) |
| `/claims/initiate` | POST | Generate claim token |
| `/claims/redeem` | POST | Redeem claim and execute sweep |

API documentation is available at `/api/docs` (Swagger UI) when running the SDK.

### What events does the smart contract emit?

```rust
AccountCreated { creator, expiry_ledger }
PaymentReceived { amount, asset }
SweepExecuted { destination, amount, asset }
AccountExpired { recovery_address, amount_returned }
```

These events enable off-chain monitoring and integration with analytics systems.

### Where can I find the full documentation?

- [Architecture Overview](./docs/architecture.pdf)
- [Security Model](./docs/security-model.pdf)
- [Getting Started Guide](./docs/getting-started.pdf)
- [Integration Guide](./docs/integration-guide.pdf)
- [Use Cases & Examples](./docs/use-cases.pdf)
- [MVP Specification](./docs/mvp-specification.pdf)

### What features are planned for future releases?

The following features are planned but **not yet implemented** in the MVP:

| Feature | Description | Status |
|---------|-------------|--------|
| **Webhook Notifications** | Event-driven notifications for account lifecycle events (creation, payment, claim, sweep, expiration) | Planned |
| **Multi-Asset Sweeps** | Support for sweeping multiple token types in a single transaction | Planned |
| **Bridgelet UI** | Reference frontend implementation for claim flows using Next.js | In development |
| **Additional Assets** | Expanded support for Stellar-based tokens beyond XLM and USDC | Planned |

---

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/bridgelet-org/bridgelet/issues)
- **Discussions:** [GitHub Discussions](https://github.com/bridgelet-org/bridgelet/discussions)

---

*Last updated: January 2026*
