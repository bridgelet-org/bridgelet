# Bridgelet Frontend Experiments

This document records experimental features built for the Bridgelet reference UI.

---

## Experiment 1: WhatsApp Share Button for Claim Links (Issue #150)
- **Goal**: Enable direct messaging sharing of payment claim URLs via WhatsApp (`wa.me`).
- **Target Markets**: Primary communication channel for African and LatAm disbursement flows.
- **Implementation**: `frontend/components/share-prompt.tsx` and `ConfirmStep` render deep links:
  ```text
  https://wa.me/?text=Send%20and%20claim%20crypto%20payments%3A%20<URL>
  ```

---

## Experiment 2: Multi-Chain Support UI Stubs (Issue #152)
- **Goal**: Provide UI placeholders for future EVM & Soroban multi-chain payment flows while maintaining active Stellar functionality.
- **Implementation**: `ChainSelector` (`frontend/components/chain-selector.tsx`) displays Stellar (active) alongside disabled options for Ethereum, Polygon, and Soroban with `[Coming Soon]` badges.

---

## Experiment 3: Web NFC Tap to Share (Issue #154)
- **Goal**: Allow event organizers and community leaders to write claim URLs directly onto NFC cards/tags via mobile devices.
- **Browser Compatibility**: Utilizes the Web NFC API (`NDEFReader`). Supported natively on Android Chrome.
- **Implementation**: `NfcShareButton` (`frontend/components/nfc-share-button.tsx`) detects browser support, requests NFC write permissions, and writes URL records to nearby tags upon user interaction.
