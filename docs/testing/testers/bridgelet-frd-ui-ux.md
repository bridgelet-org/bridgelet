Bridgelet - Functional Requirements Document (FRD) for UI/UX Design.

1. Product Overview

What is Bridgelet? A crypto onboarding solution that lets anyone send cryptocurrency to recipients who don't have wallets yet. Think "Venmo request" but for crypto - send first, recipient claims later. Core Value Proposition: • Sender doesn't need recipient's wallet address upfront • Recipient gets crypto with one click (no app downloads, no seed phrases) • Works with any Stellar-based asset (XLM, USDC, etc.)

2. User Personas

Persona A: The Sender (Alice) • Profile: Crypto-literate, has existing wallet • Goal: Send crypto to someone without asking for their wallet address • Pain Point: "My friend doesn't have a wallet yet, and explaining how to set one up takes forever" • Tech Comfort: Medium to High

Persona B: The Recipient (Bob)

• Profile: May have never used crypto before • Goal: Receive money someone sent them • Pain Point: "Crypto is too complicated. I just want my money." • Tech Comfort: Low to Medium • Critical Assumption: Bob HAS a destination wallet (or gets one before claiming)

3. User Journeys

Journey 1: SENDER CREATES A CLAIM (Alice)

Entry Point: Alice visits bridgelet.io or uses an integrated app Steps:

Specify Amount & Asset o Input: Amount (e.g., "50") o Select: Asset (XLM, USDC, etc.) o Optional: Add a message/note ("Happy Birthday!")
Set Expiration (optional) o Default: 30 days o Can customize: 1 day, 7 days, 30 days, never
Confirm & Pay o Review summary o Connect wallet (if not already) o Authorize transaction to fund ephemeral account o Wait for blockchain confirmation (~5 seconds)
Get Shareable Link o Success screen shows:  ✅ "Payment created!"
 Claim link: https://claim.bridgelet.io/c/abc123xyz  QR code  Share buttons (SMS, Email, WhatsApp, Copy) o Additional info displayed:  Amount & asset  Expiry date  Status: "Waiting to be claimed"

**Optional: Track Status **
o Dashboard shows all sent claims o Status indicators: Unclaimed, Claimed, Expired o Can cancel/reclaim if unclaimed and expired

Journey 2: RECIPIENT CLAIMS FUNDS (Bob)

Entry Point: Bob receives link via SMS/Email/etc. Steps: 1. Land on Claim Page o URL: https://claim.bridgelet.io/c/abc123xyz o Page loads and automatically verifies token o Shows claim details:  Amount: "50 USDC"  From: "Alice" (if sender added name) or "Someone"  Message: "Happy Birthday!" (if included)  Expires: "in 29 days" o Clear CTA: "Claim Your Funds"

2. Enter Destination Wallet

o Input field: "Enter your Stellar wallet address (starts with G)" o Helper text: "Don't have a wallet? [Get one here →]" o Validation: Real-time check if address is valid o Optional: Save address for future claims 3. Confirm Claim o Review screen:  "You're claiming: 50 USDC"  "To wallet: GD5J6H...4XR"  Button: "Claim Now" **4. Processing ** o Loading state: "Transferring funds..." o Behind the scenes:  Token verification  Contract authorization  Sweep execution o Takes 5-10 seconds 5. Success o ✅ "Success! You've received 50 USDC" o Transaction hash (clickable to Stellar Explorer) o "Your funds should appear in your wallet within 1 minute" o Optional: "Want to send crypto too? [Create account →]"

4. Screen-by-Screen Requirements

4.1 SENDER FLOW Screen: Homepage / Send Entry Purpose: Entry point for senders Elements: • Hero section: "Send Crypto to Anyone, Even Without a Wallet" • Primary CTA: "Send Funds" • Features list: o ✓ No wallet required upfront o ✓ Works with any Stellar asset o ✓ Secure & automatic • Secondary CTA: "How it works"

User Actions:

• Click "Send Funds" → Goes to Create Claim form • Click "How it works" → Opens explainer modal/page Screen: Create Claim Form Purpose: Sender specifies payment details

Form Fields:

Amount* o Type: Number input o Validation: Must be positive, max 2 decimal places o Placeholder: "0.00"
Asset* o Type: Dropdown o Options: XLM, USDC, (other Stellar assets) o Default: USDC
Recipient Name (optional) o Type: Text input o Purpose: Shows on claim page ("From: Alice") o Max: 50 characters
Message (optional) o Type: Textarea o Placeholder: "Add a note (optional)" o Max: 200 characters
Expiration o Type: Radio buttons or dropdown o Options: 24 hours, 7 days, 30 days (default), 90 days o Helper text: "Unclaimed funds return to you after expiry" Bottom Section: • Cost breakdown: o Amount: 50 USDC o Network fee: ~0.00001 XLM o Total: 50 USDC + fee • Button: "Continue" (enabled when form valid) Validation Rules: • Amount: Required, > 0 • Asset: Required • All other fields optional
Screen: Confirm Payment

Purpose: Final review before blockchain transaction Layout: • Summary Card: You're sending 50 USDC

To: [Recipient Name] or "Someone special" Message: "Happy Birthday!" Expires: March 15, 2026 • Wallet Connection Status: o If connected: "Connected: G...XYZ" with disconnect option o If not connected: "Connect Wallet" button • Action Buttons: o Primary: "Confirm & Pay" (requires wallet signature) o Secondary: "Back" (returns to form) States: • Loading: "Processing transaction..." • Success: Auto-redirect to success screen • Error: Show error message with retry option

Screen: Payment Success Purpose: Provide shareable claim link Layout: Success Message: ✅ Payment Created Successfully!

Your 50 USDC is ready to be claimed Claim Link Section: Share this link with your recipient:

[https://claim.bridgelet.io/c/abc123xyz] [Copy Link Button]

Or share via: [📱 SMS] [📧 Email] [💬 WhatsApp] [QR Code] Payment Details: Amount: 50 USDC Status: ⏳ Unclaimed Expires: March 15, 2026 (29 days) Transaction: [View on Stellar Explorer →] Actions: • "Track Status" → Goes to sender dashboard • "Send Another" → Returns to create form • "Done" → Returns to homepage

Screen: Sender Dashboard Purpose: Track all sent claims Layout: Header: • "Your Sent Payments" • Button: "+ New Payment" Filters: • All | Unclaimed | Claimed | Expired Payment List (Card/Table): Each item shows: 50 USDC → [Recipient Name / "Anonymous"] Status: ⏳ Unclaimed | ✅ Claimed | ❌ Expired Created: Feb 12, 2026 Expires: Mar 15, 2026 [View Details →] Empty State: No payments yet Send your first crypto payment [+ New Payment] Detailed View (Modal/New Page): When clicking "View Details": Payment Details

Amount: 50 USDC To: Alice Message: "Happy Birthday!" Status: ⏳ Unclaimed

Claim Link: [Copy] https://claim.bridgelet.io/c/abc123xyz

Created: Feb 12, 2026, 3:45 PM Expires: Mar 15, 2026, 3:45 PM

Actions: [Reclaim Funds] (only if unclaimed + expired) [Cancel Payment] (only if unclaimed)

4.2 RECIPIENT FLOW Screen: Claim Landing Page Purpose: Recipient's entry point via shared link URL Pattern: https://claim.bridgelet.io/c/{token} Loading State (First 1-2 seconds): Verifying claim... [Spinner] Valid Claim - Main Content: Header: 🎉 You've Received Crypto!

From: Alice Message: "Happy Birthday! 🎂" Amount Display (Large, Prominent): 50 USDC ≈ $50.00 USD Claim Details: Expires: March 15, 2026 (29 days left) Network: Stellar Call-to-Action: [Claim Your Funds] (Big, primary button) Helper Links: Don't have a wallet? [Get one here →] Need help? [Support →]

Screen: Enter Wallet Address Purpose: Recipient provides destination Triggered by: Clicking "Claim Your Funds" Content: Instruction: Where should we send your 50 USDC? Input Field: Wallet Address [G_________________________________] Placeholder: "Enter your Stellar address (starts with G)" Validation Feedback: • Real-time validation as user types • ✅ "Valid address" (green checkmark) • ❌ "Invalid address format" (red, with example shown) • ⚠️ "Address is too short" Helper Text: Your Stellar public address (56 characters, starts with G) Example: GD5J6HLF5666X4AZLTFTXLY2CQZBS2LBJBIMYV3S... Bottom Section: [Back] [Continue] Progressive Enhancement: • If user previously claimed, show: "Use previous address? [G...XYZ]"

Screen: Confirm Claim Purpose: Final confirmation before sweep Layout: Summary: Confirm Claim

You're receiving: 50 USDC

To your wallet: GD5J6HLF5666X4AZLTFTXLY2... (First 20 + last 6 chars shown) Important Notice: ⚠️ Double-check your wallet address Once claimed, funds cannot be reversed. Estimated Time: Transfer will complete in ~10 seconds Actions: [Back] [Claim Now]

Screen: Processing Claim Purpose: Show progress during sweep execution Visual: [Animated spinner / Progress bar]

Transferring your funds... This may take 5-10 seconds

Steps: ✅ Verifying claim ✅ Authorizing transfer ⏳ Executing sweep... Important: Don't allow user to navigate away Show: "Please don't close this window"

Screen: Claim Success Purpose: Confirmation and next steps Hero Message: ✅ Success!

You've received 50 USDC Details Card: Amount: 50 USDC To: GD5J6HLF5666X4AZLTFTXLY2... Transaction: abc123def456 [View on Stellar Explorer →]

Your funds should appear in your wallet within 1 minute Next Steps: Want to check your balance? [Open Stellar Account Viewer →]

Want to send crypto too? [Create your account →] Actions: [Done]

4.3 ERROR STATES Error: Invalid/Expired Token Trigger: User visits claim link with invalid/expired token Display: ❌ This claim link is invalid

Possible reasons:

Link has expired
Link was already claimed
Link is malformed
Contact the sender for a new link.

[Go to Homepage] Error: Already Claimed Trigger: Token valid but account already swept Display: ⚠️ Already Claimed

This payment was already claimed on [Date]

Transaction: [View on Explorer →]

If you believe this is an error, contact support.

[Go to Homepage]

Error: Invalid Wallet Address Trigger: User enters invalid Stellar address Display: ❌ Invalid Wallet Address

Please enter a valid Stellar public key:

Must start with 'G'
Must be exactly 56 characters
Example: GD5J6HLF5666X4AZLTFTXLY2...
[Try Again]

Error: Transaction Failed Trigger: Sweep execution fails Display: ❌ Claim Failed

We couldn't complete your claim.

Error: [Specific error message]

Your funds are safe. Please try again or contact support.

[Try Again] [Contact Support]

Error: Network Issues Trigger: Stellar network unavailable Display: ⚠️ Network Temporarily Unavailable

We're having trouble connecting to the Stellar network. Please try again in a few moments.

[Retry]

UI Components & Patterns 5.1 Navigation Public Pages (No Auth): • Logo (links to homepage) • "How It Works" • "Send Funds" (CTA button) Authenticated Pages (Sender Dashboard): • Logo • "Dashboard" • "New Payment" • User menu (wallet address, disconnect)
5.2 Buttons Primary Action: • Style: Solid, high-contrast • Use: "Claim Now", "Confirm & Pay", "Send Funds" Secondary Action: • Style: Outlined or ghost • Use: "Back", "Cancel" Destructive Action: • Style: Red/warning color • Use: "Reclaim Funds", "Cancel Payment"

5.3 Form Inputs Standard Input: • Label above input • Placeholder text • Helper text below (if needed) • Validation feedback (inline, real-time) Amount Input: • Large font size • Currency symbol/code shown • Max 2 decimal places • Show USD equivalent below (if applicable) Address Input: • Monospace font • Auto-trim whitespace • Show validation status (✓ or ✗) • Copy button if pre-filled

5.4 Status Indicators Unclaimed: • Icon: ⏳ or 🕐 • Color: Yellow/Amber • Text: "Waiting to be claimed" Claimed: • Icon: ✅ • Color: Green • Text: "Claimed on [Date]" Expired: • Icon: ❌ or ⏰ • Color: Red • Text: "Expired on [Date]"

5.5 Copy-to-Clipboard Pattern: Any long text (addresses, links, tx hashes) • Show truncated version • "Copy" button adjacent • On click: Brief "Copied!" confirmation • Full text shown on hover (tooltip)

5.6 Loading States Page Load: • Full-page spinner with message • e.g., "Loading your claim..." Action in Progress: • Button shows spinner • Button text: "Processing..." • Button disabled during process Long Operation: • Progress indicator • Step-by-step status • Don't allow navigation away

5.7 Modals/Dialogs Confirmation Modals: • Clear title • Explanation of action • "Cancel" + "Confirm" buttons • Example: "Are you sure you want to cancel this payment?" Info Modals: • "How It Works" • "What is a Stellar address?" • Scrollable content • "Close" button

Content & Messaging 6.1 Tone & Voice • Friendly, not technical: Avoid jargon (use "wallet address" not "Ed25519 public key") • Reassuring: Crypto is scary for newcomers - emphasize safety • Clear & concise: Short sentences, no fluff 6.2 Key Messages For Senders: • "Send crypto even if they don't have a wallet yet" • "Share a link, that's it" • "Unclaimed funds automatically return to you" For Recipients: • "You've received crypto!" • "Claim it in one click" • "Safe and secure" 6.3 Error Messages DO: • Explain what happened • Suggest next steps • Provide support contact DON'T: • Show raw error codes • Blame the user • Use technical jargon Example: ❌ Bad: "Error 500: Internal server exception" ✅ Good: "Something went wrong on our end. Please try again or contact support."

Responsive Design Requirements 7.1 Mobile (Primary) Critical: Most recipients will be on mobile (SMS links) Requirements: • Single column layout • Large tap targets (min 44x44px) • Minimal scrolling on claim page • Keyboard-friendly inputs • Works on iOS Safari & Chrome Android 7.2 Desktop Nice-to-have: • Two-column layouts where appropriate • QR code prominent on success screen • Hover states for interactive elements 7.3 Breakpoints • Mobile: < 768px • Tablet: 768px - 1024px • Desktop: > 1024px

Accessibility Requirements • WCAG 2.1 AA compliance minimum • Keyboard navigation support • Screen reader friendly • Color contrast ratios: 4.5:1 for text • Focus indicators on all interactive elements • Alt text for all images • Form labels properly associated • Error messages announced to screen readers

Performance Requirements • Initial page load: < 2 seconds • Claim verification: < 1 second • Sweep execution: 5-10 seconds (blockchain dependent) • Smooth animations (60fps)

Edge Cases & Special Scenarios 10.1 Multiple Claims Same Recipient Scenario: Bob receives 3 claim links from different people Behavior: • Each claim is independent • Bob can reuse same wallet address • No account needed - each claim is stateless from Bob's perspective

10.2 Partial Claims Scenario: Can Bob claim only part of the amount? Answer: No - it's all or nothing • Reason: Smart contract sweeps entire ephemeral account

10.3 Reclaiming Funds Scenario: Alice sent funds but Bob never claimed. It expired. Behavior: • In sender dashboard, status shows "Expired" • "Reclaim Funds" button available • One-click reclaim back to Alice's original wallet • Confirm modal: "Reclaim 50 USDC back to your wallet?"

10.4 Network Congestion Scenario: Stellar network is slow/congested Behavior: • Show warning: "Network is experiencing delays" • Increase timeout before showing error • Provide tx hash immediately so user can track independently

10.5 Browser Refresh During Claim Scenario: Bob clicks "Claim" then accidentally refreshes page Behavior: • If sweep not yet executed: Safe to retry • If sweep in progress: Show "Checking transaction status..." • If sweep completed: Show success (retrieve from backend)

10.6 Expired Link After Opening Scenario: Bob opens link while valid, takes 2 days to claim, expires in between Behavior: • Backend checks expiry on claim attempt • Show error: "This claim expired while you had it open" • Suggestion: "Contact the sender for a new link"

Security & Privacy Considerations 11.1 Token Security • Claim tokens are JWT (signed, not encrypted) • Tokens are single-use (consumed on claim) • Tokens expire based on sender's choice • Tokens cannot be guessed (cryptographically random) 11.2 Wallet Address Validation • Client-side: Format validation (length, prefix) • Server-side: Additional checksum validation • No storing of wallet addresses (unless recipient opts in) 11.3 Rate Limiting • Claim attempts: 5 per token per 10 minutes • Account creation: 10 per IP per hour • Prevents abuse/spam

Analytics & Tracking Requirements Track these events for product insights: Sender Journey: • Form started • Form completed • Payment confirmed • Link copied • Link shared (via which method) Recipient Journey: • Claim link opened • Wallet address entered • Claim confirmed • Claim succeeded • Claim failed (with error type) Business Metrics: • Claim conversion rate (opened → claimed) • Time to claim (link created → claimed) • Expiry rate (claims that expired unclaimed) • Reclaim rate

Future Enhancements (Out of Scope for MVP) These are NOT required for initial design, but good to keep in mind: • Multi-asset claims: One link, multiple tokens • Scheduled claims: "Claimable after March 1st" • Conditional claims: "Must verify email first" • Recurring payments: "Send 50 USDC every month" • Recipient accounts: Bob can track all his received claims • Fiat off-ramp: "Claim to bank account instead of wallet"

Questions for Designer After reviewing this document, please confirm your understanding of:

Primary user flow: Sender creates → Recipient claims

Key screens needed: ~8-10 unique screens

Mobile-first approach: Most recipients on mobile

Error handling: Multiple failure scenarios to design for

Branding constraints: Do we have existing brand guidelines, or starting from scratch?

Design Deliverables Expected

User Flow Diagrams o Sender journey flowchart o Recipient journey flowchart o Error state flows

Wireframes (Low-Fi) o All screens listed in Section 4 o Mobile & desktop versions o Annotations for interactions

High-Fidelity Mockups o Visual design applied o All states (default, hover, active, disabled) o Error states o Loading states

Interactive Prototype o Clickable prototype (Figma, Adobe XD, etc.) o Demonstrates complete user flows o Includes animations/transitions

Design System / Style Guide o Colors (primary, secondary, success, error, etc.) o Typography (fonts, sizes, weights) o Spacing system o Component library (buttons, inputs, cards, etc.) o Icons

Timeline & Milestones Phase 1: Research & Wireframes (1-2 weeks) • User flow diagrams • Low-fidelity wireframes • Review & iterate Phase 2: Visual Design (2-3 weeks) • High-fidelity mockups • Design system creation • Review & iterate Phase 3: Prototype & Handoff (1 week) • Interactive prototype • Design specs for developers • Final review

Appendix: Technical Constraints (For Designer's Awareness) • Blockchain finality: Transactions take ~5-10 seconds (can't speed up) • No user accounts: Recipient side is stateless (no login/signup) • Single-use links: Once claimed, link is dead (can't re-claim) • Expiry is absolute: No grace period after expiry • Network dependency: If Stellar is down, nothing works (rare but possible)

Document Version: 1.0 
Last Updated: February 2026 
Author: [phertyameen](https://github.com/phertyameen)
Updated by: [Ummi-001](https://github.com/Ummi-001)
Associated Pr: [#25](https://github.com/bridgelet-org/bridgelet/pull/25)
