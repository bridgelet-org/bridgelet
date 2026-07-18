# Bridgelet Frontend

Reference Next.js UI for initiating and claiming crypto payments.

## Tech stack

- Next.js 16 (App Router)
- TypeScript 5 in strict mode
- Tailwind CSS 4

## Local setup

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Start development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Routes

- `/` homepage placeholder
- `/send` sender flow placeholder
- `/claim/[token]` recipient claim placeholder

## Quality checks

- Type-check only:

  ```bash
  npm run typecheck
  ```

- Production build:

  ```bash
  npm run build
  ```

## API client

All calls to the `bridgelet-sdk` backend go through a single canonical client:
**`lib/create-bridgelet-client.ts`**. Import the `BridgeletClient` class (or the
`getClaimDetails` / `createPaymentIntent` / `redeemClaim` helpers) from there — do not
add new API-calling modules or reintroduce parallel clients. Request/response types
live in `lib/bridgelet.ts` (auto-generated via `npm run generate:types`).
