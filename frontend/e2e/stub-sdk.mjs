/**
 * Issue #767 — tiny local stub SDK used by the frontend e2e suite.
 *
 * Serves the exact HTTP surface the Next.js app depends on, with fixed
 * responses so the suite is deterministic and needs no testnet, no bridgelet-sdk
 * instance, and no real Freighter:
 *
 *   SDK (proxied from the Next server via BRIDGELET_SDK_URL)
 *     POST /accounts        → account-creation response (with a claim URL)
 *     GET  /accounts        → account list (limit/offset)
 *     GET  /accounts/:id    → account status
 *     POST /claims/verify   → 200 / 400 / 401 / 404 / 409 (token-driven)
 *     POST /claims/redeem   → 200 success or 500 SWEEP_CONTRACT_FAILED
 *
 *   Horizon (browser → NEXT_PUBLIC_HORIZON_URL)
 *     GET  /accounts/:id    → loadAccount (native balance + sequence)
 *     POST /transactions    → 200 { hash } (no result_xdr → SDK returns as-is)
 *
 * Claim behaviour is driven by the token so each spec can force a case:
 *   contains "claimed"  → verify 409 (already redeemed)
 *   contains "expired"  → verify 401 (past expiry)
 *   contains "invalid"  → verify 404 (no such claim)
 *   contains "fail"     → verify 200 but redeem 500 SWEEP_CONTRACT_FAILED
 *   anything else       → verify 200 and redeem success
 */

import { createServer } from 'node:http';

const PORT = Number(process.env['STUB_SDK_PORT'] || 4100);
const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';

// A real, valid Stellar strkey is required: Operation.payment() validates the
// destination before building the transaction XDR.
const EPHEMERAL_PUBLIC_KEY = 'GCQZD2HXO42UGHOSUFQZG27FBOAYV35QZ5SIVE5AEJ5M5N57FAPESIYI';

/** In-memory store so POST /accounts followed by GET /accounts/:id is coherent. */
const accounts = new Map();

function iso(daysFromNow = 0) {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString();
}

function makeAccount(id, amount, asset) {
  return {
    accountId: id,
    publicKey: EPHEMERAL_PUBLIC_KEY,
    claimUrl: `${APP_URL}/claim/${id}`,
    amount,
    asset,
    status: 'pending_claim',
    expiresAt: iso(7),
    createdAt: iso(0),
  };
}

// Pre-seed a couple of accounts so GET /accounts is never empty and the
// history page has data to render.
['stub-claim-1', 'stub-claim-2'].forEach((id, i) => {
  accounts.set(id, makeAccount(id, `${10 + i}.0000000`, 'XLM'));
});

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(payload);
}

function errorBody(code, message) {
  return { error: { code, message, statusCode: 400 } };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    // Horizon posts form-encoded `tx=...`; ignore it.
    return {};
  }
}

function handleClaimVerify(token) {
  if (token.includes('claimed')) {
    return { status: 409, body: errorBody('ALREADY_CLAIMED', 'This claim link was already used.') };
  }
  if (token.includes('expired')) {
    return { status: 401, body: errorBody('TOKEN_EXPIRED', 'This claim link has expired.') };
  }
  if (token.includes('invalid')) {
    return { status: 404, body: errorBody('TOKEN_NOT_FOUND', 'No claim matches this link.') };
  }
  return {
    status: 200,
    body: {
      valid: true,
      accountId: token,
      amount: '100.0000000',
      asset: 'native',
      expiresAt: iso(1),
    },
  };
}

function handleClaimRedeem(token) {
  if (token.includes('fail')) {
    return {
      status: 500,
      body: errorBody('SWEEP_CONTRACT_FAILED', 'The on-chain sweep failed.'),
    };
  }
  return {
    status: 200,
    body: {
      success: true,
      txHash: 'stub-tx-hash-0000',
      amountSwept: '100.0000000',
      asset: 'native',
      destination: EPHEMERAL_PUBLIC_KEY,
      sweptAt: iso(0),
      message: 'Payment claimed.',
    },
  };
}

function horizonAccount(publicKey) {
  return {
    account_id: publicKey,
    sequence: '123456789',
    subentry_count: 0,
    home_domain: '',
    last_modified_ledger: 1,
    last_modified_time: new Date().toISOString(),
    thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
    flags: { auth_required: false, auth_revocable: false, auth_immutable: false },
    balances: [
      {
        balance: '10000.0000000',
        asset_type: 'native',
        buying_liabilities: '0.0000000',
        selling_liabilities: '0.0000000',
      },
    ],
    signers: [{ weight: 1, key: publicKey, type: 'ed25519_public_key' }],
    data: {},
    // stellar-sdk's checkMemoRequired reads `data_attr['config.memo_required']`,
    // so an account with no data attributes must still expose an empty map.
    data_attr: {},
    num_sponsoring: 0,
    num_sponsored: 0,
    paging_token: '1',
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  // ── Horizon (browser submits the sender's payment here) ────────────────
  if (path.startsWith('/horizon/accounts/')) {
    const publicKey = decodeURIComponent(path.slice('/horizon/accounts/'.length));
    json(res, 200, horizonAccount(publicKey || EPHEMERAL_PUBLIC_KEY));
    return;
  }
  if (path === '/horizon/transactions') {
    await readBody(req);
    json(res, 200, { hash: 'stub-tx-hash-0000', ledger: 1, successful: true, paging_token: '1' });
    return;
  }

  // ── Claims (called directly by the browser) ────────────────────────────
  if (path === '/claims/verify' && method === 'POST') {
    const body = await readBody(req);
    const result = handleClaimVerify(String(body.claimToken || ''));
    json(res, result.status, result.body);
    return;
  }
  if (path === '/claims/redeem' && method === 'POST') {
    const body = await readBody(req);
    const result = handleClaimRedeem(String(body.claimToken || ''));
    json(res, result.status, result.body);
    return;
  }

  // ── Accounts (proxied from the Next server) ────────────────────────────
  if (path === '/accounts' && method === 'POST') {
    const body = await readBody(req);
    const id = `stub-claim-${accounts.size + 1}`;
    const account = makeAccount(id, body.amount || '1.0000000', 'XLM');
    account.status = 'pending_payment';
    accounts.set(id, account);
    json(res, 201, account);
    return;
  }
  if (path === '/accounts' && method === 'GET') {
    const limit = Number(url.searchParams.get('limit') || accounts.size);
    const offset = Number(url.searchParams.get('offset') || 0);
    const all = [...accounts.values()];
    json(res, 200, all.slice(offset, offset + limit));
    return;
  }
  if (path.startsWith('/accounts/')) {
    const id = decodeURIComponent(path.slice('/accounts/'.length));
    const account = accounts.get(id) || makeAccount(id, '1.0000000', 'XLM');
    json(res, 200, account);
    return;
  }

  json(res, 404, errorBody('NOT_FOUND', `stub-sdk has no route for ${method} ${path}`));
});

server.listen(PORT, () => {
  console.log(`[stub-sdk] listening on http://localhost:${PORT}`);
});
