Closes #90

### What does this PR do?
This PR introduces an experimental feature to share Bridgelet claim links directly via WhatsApp from the Send confirmation screen. This is particularly targeted at markets like LatAm and Africa where WhatsApp is the primary medium of communication.

### Description
- **Send Flow Integration:** Updated `frontend/components/send-form/steps/confirm-step.tsx` to display a branded "Share via WhatsApp" button on the success state.
- **Deep Linking:** Configured the button to use the `wa.me` URL scheme (`https://wa.me/?text=...`), which dynamically encodes the generated claim URL into a pre-filled message. This seamlessly opens the native WhatsApp application on mobile or prompts WhatsApp Web/Desktop on PC.
- **Documentation:** Added `docs/experiments/whatsapp-share.md` to detail the experiment's goals, implementation details, and future considerations (like optionally pre-filling a specific phone number).
- **Build Fixes:** Re-applied missing MSW imports and Freighter API updates (`getAddress()`) to ensure the Next.js `main` branch builds cleanly.

### Acceptance Criteria met
- [x] Implementation complete
- [x] Tests passing
- [x] Docs updated
