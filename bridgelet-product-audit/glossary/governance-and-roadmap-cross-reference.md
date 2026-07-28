# Governance and Roadmap — Cross Reference

A navigational aid connecting the project's two "how this project runs" documents.
Neither is restated here; go to the source for detail.

## Where they live

Note the two sit in **different places**, which is itself worth knowing:

| Document | Path |
|---|---|
| Governance | `docs/GOVERNANCE.md` |
| Roadmap | `ROADMAP.md` (repository root) |

## What each covers

**`docs/GOVERNANCE.md`** — *how decisions get made.* It describes how the project
is governed, how decisions are reached, and how contributors can participate in
shaping its direction, framed around transparency, inclusivity and long-term
sustainability. It states outright that governance processes may evolve as the
project grows.

**`ROADMAP.md`** — *what gets built and when.* It lays out the development
timeline, planned features and community priorities. It records current status as
**MVP Implementation**, focused on the core primitives for ephemeral account
creation and sweeping, and carries a 2026 timeline. It flags itself as a living
document subject to change on community feedback.

## How they relate

They answer complementary questions: the roadmap says *what* is planned, and
governance says *who decides* and *by what process* the plan changes. The roadmap's
own caveat — that priorities shift with community feedback — is only meaningful
because governance defines how that feedback is weighed. Read governance first if
you want to influence the roadmap rather than just follow it.

## Roadmap items likely to warrant their own audit entry

Once work begins, these look like natural candidates for dedicated
`bridgelet-product-audit/` coverage:

- **Ephemeral account creation and sweeping** — the current MVP focus, and the
  concept the rest of this folder already leans on heavily.
- **Multi-chain support** — a summary already exists at
  [`multi-chain-evaluation-summary.md`](./multi-chain-evaluation-summary.md); the
  implementation will need integration notes of its own.
- **Mobile app maturation** — currently thin, with no CI. See
  [`../runbooks/onboard-mobile-app-to-ci.md`](../runbooks/onboard-mobile-app-to-ci.md).
