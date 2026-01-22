# Sample Integration Help

Integration Goal:
Integrate claim flow with our payroll system and send claim links via SMS.

System Details:
- Runtime / framework: Node.js 20 + NestJS
- Hosting / infra: AWS ECS + API Gateway
- Network: testnet
- Relevant services: Twilio, Stripe

Steps Taken:
- Implemented account creation using the SDK.
- Wired webhook handler for claim completion.

Current Blocker:
Webhook verification fails when requests pass through the API Gateway.

Acceptance Criteria:
- Webhook signatures verify successfully behind the gateway.
- Required proxy headers are documented.
