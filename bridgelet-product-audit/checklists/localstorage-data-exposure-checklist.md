# LocalStorage Data Exposure Review Checklist

This checklist covers all frontend localStorage usage to ensure no sensitive data is ever stored in localStorage, and that all stored data is accounted for and secure.

## Core Wallet Storage Verification (`bridgelet_wallet`)
- [ ] Verify that `bridgelet_wallet` (used in `frontend/lib/wallet.ts`) only ever stores `publicKey` and `type` properties from the `ConnectedWallet` interface, never any secret key material
- [ ] Confirm `persistWallet()` function only accepts and stringifies the `ConnectedWallet` type, which is strictly limited to `{ publicKey: string; type: WalletType }`
- [ ] Verify that generated wallets' secret keys are never persisted to localStorage or any other persistent storage
- [ ] Confirm no other code in the codebase writes additional properties to the `bridgelet_wallet` localStorage entry
- [ ] Verify `clearPersistedWallet()` properly removes the `bridgelet_wallet` entry from localStorage when a wallet is disconnected

## Other localStorage Usage Inventory
- [ ] Document and verify all non-wallet localStorage usage in the frontend:
  - [ ] `bridgelet-theme`: Stores theme preference ('light'/'dark') in `frontend/components/theme-provider.tsx` and `frontend/app/layout.tsx` — confirm this only stores theme selection, no sensitive data
- [ ] Scan entire frontend codebase to ensure no other localStorage keys are being used beyond the ones documented here
- [ ] Verify all localStorage usage is intentional and necessary for application functionality
- [ ] Confirm no third-party libraries are writing unexpected data to localStorage that hasn't been accounted for

## Maintenance & Preventative Checks
- [ ] **This checklist must be re-run after any change to `persistWallet()`'s stored shape or any modification to what data is persisted to localStorage**
- [ ] Before merging any PR that modifies localStorage usage, complete this full checklist to confirm no sensitive data is exposed
- [ ] Add this checklist to PR review requirements for any frontend changes that touch wallet persistence or localStorage access
- [ ] Regularly (quarterly) re-run this full checklist to scan for new localStorage usage that may have been added

## Security Validation
- [ ] Confirm that no localStorage entries contain any PII (Personally Identifiable Information) beyond what's strictly necessary
- [ ] Verify that all localStorage data is properly cleared when a user logs out/disconnects their wallet
- [ ] Confirm that the application never stores sensitive cryptographic material (private keys, seed phrases, mnemonics) in localStorage, sessionStorage, or any client-side persistent storage