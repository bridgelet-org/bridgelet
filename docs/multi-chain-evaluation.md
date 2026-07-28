# Multi-Chain Support Evaluation

This document evaluates the necessary changes to support multiple chains (e.g., Ethereum, Solana, Base) in the Bridgelet application, specifically focusing on the Send and Claim flows.

## 1. Send Flow Changes

Currently, the Send flow (`SendForm`) is tightly coupled to the Stellar network and the Freighter wallet. To support multi-chain operations, the following components must be adapted:

### Wallet Integration
- **Agnostic Wallet Provider:** Replace the hardcoded `connectFreighter` logic with a generalized wallet adapter system (e.g., `wagmi` for EVM, `@solana/wallet-adapter` for Solana).
- **Network Switching:** The `ChainSelector` (currently a stub) must become active. When a user selects a chain, the application should prompt the user to switch networks in their connected wallet if they are on the wrong one.

### Payment Details
- **Asset Mapping:** The hardcoded `XLM` asset code must be replaced with a dynamic token list fetched based on the selected chain (e.g., `USDC` on Ethereum, `SOL` on Solana).
- **Address Validation:** The `DetailsStep` currently validates Stellar public keys (e.g., starting with `G` and 56 characters long). We need to introduce chain-specific validators:
  - **EVM:** `^0x[a-fA-F0-9]{40}$`
  - **Solana:** Base58 string of length 32-44.
- **Gas & Fees estimation:** Non-Stellar chains have drastically different fee markets. The UI must fetch and display estimated gas costs in the native token (ETH, SOL) before confirming the send transaction.

## 2. Claim Flow Changes

The Claim flow (`ClaimStatusCard` and `AccessibleClaimForm`) currently assumes funds are being claimed to a Stellar wallet.

### Claiming to Different Chains
- **Cross-Chain Sweeping:** If a token was sent on Stellar but the user wishes to claim it on Base, the backend/smart contract infrastructure must facilitate cross-chain bridging (e.g., using Wormhole or LayerZero).
- **Recipient Wallet Connection:** The recipient must connect a wallet compatible with the target chain they select in the `ChainSelector`. The "Claim now" button will trigger a transaction signature or API call specific to that chain's SDK.

### UI State and Validation
- **Status Badges:** The `ClaimStatus` might need to account for bridging delays. For example, moving from "Available" -> "Bridging (Pending)" -> "Claimed".
- **Accessible Form:** The `accessible-claim-form.tsx` currently strictly validates `^G[A-Z2-7]{55}$`. It must be updated to dynamically change its regex validation and placeholder hints (e.g., `0x...`) based on the currently selected chain from the `ChainSelector`.

## 3. Database and API Schema
- The underlying token schema (e.g., `amountStroops`) is Stellar-specific. This needs to be generalized to handle arbitrary decimals and different native denominations (e.g., `amountWei`, `amountLamports`, or a generic `rawAmount` with a `decimals` field).
- The `assetCode` field must be accompanied by a `chainId` or `network` identifier to prevent ambiguity between assets bridging across chains (e.g., bridging native USDC vs. wrapped USDC).
