# Experiment: WhatsApp Share Button for Claim Links

This document outlines an experimental feature added to the Bridgelet UI: allowing the sender to directly share the generated claim link via WhatsApp.

## Overview
In many African and Latin American markets, WhatsApp is the dominant communication channel—far outpacing email or standard SMS. While the current Bridgelet UI defaults to sending claim links via email, providing a frictionless way to share the link via WhatsApp significantly reduces the friction of cross-border or local physical disbursements.

## Implementation Details
1. **Send Success State:** Upon successful generation of a payment intent, the UI transitions to the success screen (`ConfirmStep` component).
2. **Dynamic Deep Linking:** A new "Share via WhatsApp" button is displayed. This button utilizes the `wa.me` deep link scheme.
3. **Encoding:** The generated claim URL is securely embedded into the `text` query parameter: `https://wa.me/?text=Here%20is%20your%20payment%20link:%20[CLAIM_URL]`.

## Behavior
- **On Desktop:** Clicking the button will open a new tab prompting the user to either open the WhatsApp Desktop application or use WhatsApp Web.
- **On Mobile:** Clicking the button will immediately launch the native WhatsApp application on the device, prompting the user to select a contact to send the pre-filled message to.

## Future Considerations
- Allow the sender to optionally input the recipient's phone number before sharing, changing the deep link to `https://wa.me/[PHONE_NUMBER]/?text=...` to skip the contact selection step.
- Implement similar share buttons for Telegram or native Web Share API (`navigator.share`) for broader social sharing capabilities.
