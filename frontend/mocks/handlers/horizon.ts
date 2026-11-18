import { http, HttpResponse } from 'msw';

const HORIZON_BASE = 'https://horizon-testnet.stellar.org';

/**
 * GET https://horizon-testnet.stellar.org/fee_stats
 *
 * Returns realistic Stellar testnet fee statistics used by the fee estimator.
 * Values approximate a lightly-loaded testnet ledger.
 */
const feeStatsHandler = http.get(`${HORIZON_BASE}/fee_stats`, () => {
  return HttpResponse.json({
    last_ledger: '51234567',
    last_ledger_base_fee: '100',
    ledger_capacity_usage: '0.42',
    fee_charged: {
      max: '10000',
      min: '100',
      mode: '100',
      p10: '100',
      p20: '100',
      p30: '100',
      p40: '100',
      p50: '100',
      p60: '200',
      p70: '200',
      p80: '500',
      p90: '1000',
      p95: '2000',
      p99: '10000',
    },
    max_fee: {
      max: '50000',
      min: '100',
      mode: '100',
      p10: '100',
      p20: '100',
      p30: '200',
      p40: '200',
      p50: '500',
      p60: '1000',
      p70: '2000',
      p80: '5000',
      p90: '10000',
      p95: '20000',
      p99: '50000',
    },
  });
});

/**
 * GET https://horizon-testnet.stellar.org/accounts/:id
 *
 * Returns a realistic Stellar testnet account object for the given public key.
 * Balance is set to 10,000 XLM: enough to cover testnet operations.
 */
const accountDetailHandler = http.get(`${HORIZON_BASE}/accounts/:id`, ({ params }) => {
  const { id } = params as { id: string };

  return HttpResponse.json({
    id,
    account_id: id,
    sequence: '51234567000',
    sequence_ledger: 51234560,
    sequence_time: String(Math.floor(Date.now() / 1000) - 120),
    subentry_count: 0,
    last_modified_ledger: 51234567,
    last_modified_time: new Date(Date.now() - 120_000).toISOString(),
    thresholds: {
      low_threshold: 0,
      med_threshold: 0,
      high_threshold: 0,
    },
    flags: {
      auth_required: false,
      auth_revocable: false,
      auth_immutable: false,
      auth_clawback_enabled: false,
    },
    balances: [
      {
        balance: '10000.0000000',
        buying_liabilities: '0.0000000',
        selling_liabilities: '0.0000000',
        asset_type: 'native',
      },
    ],
    signers: [
      {
        weight: 1,
        key: id,
        type: 'ed25519_public_key',
      },
    ],
    data: {},
    num_sponsoring: 0,
    num_sponsored: 0,
    paging_token: id,
  });
});

export const horizonHandlers = [feeStatsHandler, accountDetailHandler];
