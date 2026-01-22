# Sample Feature Request

Problem Statement:
Batch payouts need different claim windows per cohort, but current config is global.

Proposed Solution:
Allow claim window to be set per payout batch via a new field in the creation API.

Alternatives Considered:
- Maintain multiple Bridgelet instances per cohort (heavy ops overhead).
- Document manual overrides (error-prone).

Impact:
Improves operational flexibility for partners running multiple campaigns.

Acceptance Criteria:
- API accepts a per-batch claim window.
- Default behavior remains unchanged if not provided.
