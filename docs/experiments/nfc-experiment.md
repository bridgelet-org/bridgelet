# Experiment: NFC Tap-to-Share

This document details the implementation of an experimental feature that allows physical disbursement of Bridgelet payments using the Web NFC API.

## Overview
Currently, payment intents generate a claim URL that must be emailed or manually shared with the recipient. For in-person distributions (e.g. at community events, disaster relief camps, or physical marketplaces), sending emails is slow, error-prone, or impossible if the recipient lacks internet access at that precise moment.

By utilizing the [Web NFC API](https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API), an event organizer can generate a claim link on their Android device and immediately write that URL to a physical NFC card or tag. The recipient can then take the card and tap it on their own device later to claim the funds.

## How it works
1. **Send Flow Integration:** Once a payment is authorized via Freighter and the mock backend responds with a `claimUrl`, the `ConfirmStep` UI displays a "Write to NFC Tag" button.
2. **Web NFC Hook:** The `useNfc` React hook detects if `window.NDEFReader` is available (currently limited to Chrome on Android).
3. **Writing the Tag:** When clicked, the browser prompts the sender to hold an NFC tag to the back of their device. The hook writes an NDEF record of type `url` containing the `claimUrl`.

## Constraints & Considerations
- **Platform Availability:** Web NFC is currently heavily restricted. It is essentially only available on Chrome for Android. iOS does not support Web NFC within Safari. Desktop browsers do not support it.
- **Security Context:** Web NFC requires a secure context (HTTPS). Local testing must be done over `localhost` or an HTTPS tunnel (e.g. ngrok).
- **Security of the Tag:** A standard NFC tag can be read by anyone. If a recipient loses the tag before claiming the funds, a malicious actor who finds the tag can claim the funds.
- **Rewriting:** Unless the tag is permanently locked after writing, malicious actors could overwrite the NFC tag with a phishing link. For high-security environments, the tags should be write-locked immediately after the claim link is written.

## Future Work
- Implement a physical hardware wallet abstraction where the NFC tap initiates a direct Stellar transaction signature rather than just sharing a URL.
- Support deep linking directly into the Lobstr or Freighter mobile apps when the tag is tapped.
