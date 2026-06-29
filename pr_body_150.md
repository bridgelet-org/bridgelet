Closes #150

### What does this PR do?
This PR introduces a WhatsApp share button to the send success screen in the reference UI.

### Description
- **WhatsApp Share Button**: Added a direct WhatsApp sharing button on the `ConfirmStep` (Send Success screen). It constructs a `wa.me` deep link containing the generated claim URL (currently pointing to a placeholder link, ready to be updated once the actual claim API completes), making it easy to seamlessly share the claim with recipients, especially tailored for LatAm and African markets where WhatsApp is a primary communication tool.
- **Styling**: Leveraged matching Tailwind colors and modern inline SVG for the WhatsApp logo to ensure it feels native to the `bridgelet` application.
