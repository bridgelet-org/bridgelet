# FRD / UI-UX Document — Overview

A short pointer to `docs/bridgelet-frd-ui-ux.md`. Detail is deliberately left in
the source document.

## Scope

The Functional Requirements Document for UI/UX design. At a high level it covers:

- **Product overview** — what Bridgelet is, in product rather than protocol terms,
  and its core value proposition (the sender doesn't need the recipient's wallet
  address upfront; the recipient claims with one click, no app download and no
  seed phrase; works with Stellar-based assets such as XLM and USDC).
- **User personas** — notably Alice the **sender** (crypto-literate, already has a
  wallet) and Bob the **recipient** (the person who has no wallet yet), each with
  stated goals, pain points and assumed tech comfort.
- The functional and UI/UX requirements that follow from those personas.

Its framing analogy is "a Venmo request, but for crypto" — send first, claim later.

## Intended audience

Primarily **designers and product people**, and engineers who need to understand
*why* a screen is shaped the way it is rather than how it is implemented. It is
written in product language, not API or contract language — personas and user
goals rather than types and endpoints.

## Relationship to `docs/FRONTEND_TECHNICAL_SPEC.md`

The two are complementary and are best read together, in this order:

| | `bridgelet-frd-ui-ux.md` | `FRONTEND_TECHNICAL_SPEC.md` |
|---|---|---|
| Answers | *What should this do, and for whom?* | *How is it built?* |
| Language | Personas, journeys, value prop | Components, structure, implementation |
| Read it when | Deciding or reviewing behaviour | Building or changing code |

If the two ever disagree about intended behaviour, that is a discrepancy worth
recording rather than silently resolving — the FRD states intent, the technical
spec states realisation, and a gap between them is exactly the sort of finding
this audit folder is for.

## Related

- [`../integration-notes/claim-flow-wallet-requirement.md`](../integration-notes/claim-flow-wallet-requirement.md)
  — where FRD intent and implemented behaviour meet in the claim flow.
