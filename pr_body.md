Closes #98

### What does this PR do?
This PR introduces an experimental feature using the Web NFC API to allow users to write a Bridgelet claim URL directly to a physical NFC tag. This feature is intended for in-person payment disbursements (e.g., events, community distributions), enabling recipients to tap the tag and claim funds without relying on email delivery.

### Description
- **Web NFC Hook:** Created `useNfc` (`frontend/hooks/use-nfc.ts`), a React hook that checks for `window.NDEFReader` support and handles writing URL records to NFC tags.
- **Send Flow Integration:** Updated `ConfirmStep` (`frontend/components/send-form/steps/confirm-step.tsx`) to display a "Write to NFC Tag" button upon successful payment generation (if the browser supports Web NFC).
- **NFC Evaluation Document:** Drafted `docs/experiments/nfc-experiment.md` detailing the implementation, its constraints (e.g., currently restricted to Android Chrome), security considerations, and potential future use-cases.
- **Latent Type Fixes:** Addressed missing MSW module imports and updated the Freighter API `getPublicKey` to `getAddress` to ensure clean builds.

### Acceptance Criteria met
- [x] Implementation complete
- [x] Tests passing
- [x] Docs updated
