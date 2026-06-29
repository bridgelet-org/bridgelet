Closes #154

### What does this PR do?
This PR integrates the Web NFC API into the payment success screen to enable seamlessly writing the claim URL directly to an NFC tag for in-person distributions.

### Description
- **Web NFC Support Check**: Safely detects whether the device supports the Web NFC API (`NDEFReader`) upon component mount. This prevents rendering the button on unsupported devices (e.g., iOS Safari or non-NFC Androids).
- **In-Person Tap-to-Share Flow**: When supported, users are presented with a "Tap to NFC Tag" button. Clicking this initializes a write stream where users can simply tap a compatible NFC card/tag to the back of their device, provisioning it with the generated claim URL.
- **Robust Feedback**: The component gracefully handles success states and common failure scenarios (e.g., NFC disabled, permission denied) with clear, timed UI status updates.
