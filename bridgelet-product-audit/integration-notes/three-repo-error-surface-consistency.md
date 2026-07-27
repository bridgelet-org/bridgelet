# Error Surface Consistency Across Three Repos

Tracing one concrete error — `AlreadySwept` — from contract to user, to see
whether its identity survives the trip.

## The chain

| Stage | Repo | What holds the error |
|---|---|---|
| 1. Origin | `bridgelet-core` | `Error::AlreadySwept`, a typed contract variant |
| 2. Backend | `bridgelet-sdk` | String matching, per `error-string-matching.md` |
| 3. Frontend | `bridgelet` (this repo) | An API response rendered in the claim UI |

**Stage 1** is the strongest link — a Rust enum variant is unambiguous.

**Stage 2 is where identity is most at risk.** bridgelet-sdk-audit's
`error-string-matching.md` records that the SDK identifies contract errors by
**matching on strings** rather than structured codes. String matching is brittle:
reword the contract's error text and the match silently stops firing, degrading a
specific error into an unrecognised one. Nothing fails loudly.

**Stage 3** is this repo. The claim path calls `client.redeemClaim(...)` and, on
failure, throws:

```ts
throw new Error(result.error ?? 'Claim could not be completed. Please try again.');
```

The specific reason rides in `result.error` — but the `??` fallback means **any
response lacking that field collapses to a generic message.**

## Where identity can be lost

1. **Contract → SDK:** a reworded contract message breaks string matching.
2. **SDK → API response:** if the error isn't propagated into a populated
   `result.error`, stage 3 has nothing specific to show.
3. **Frontend fallback:** the `??` default fires and the user sees generic retry
   text.

Failure 3 is the most user-visible and most misleading. "Already swept" means *the
funds are gone, stop trying*; "please try again" invites the user to retry
something that can never succeed, then contact support when it doesn't.

## Recommendation

Confirm end-to-end that a genuine `AlreadySwept` reaches the claim UI as a
distinguishable message. Verify with an actual double-claim against a test account
rather than by reading code, since the weak link is runtime string matching.
**Backend counterpart:** bridgelet-sdk-audit's
`error-mapping-completeness-checklist.md` asks the same from the SDK side.
