/**
 * Issue #420 — Sender wallet balance lookup, used to block sends that
 * exceed the connected wallet's balance before they ever reach the API.
 *
 * Follows the same pattern as `lib/fee-estimation.ts`: a direct, cached,
 * client-side fetch against Horizon. Failures are swallowed and surfaced
 * as `null` rather than thrown — an unknown balance should never block a
 * send outright (the backend still enforces the real balance check), it
 * should just skip the client-side "insufficient balance" hint.
 */

const HORIZON_BASE_URL =
  process.env['NEXT_PUBLIC_HORIZON_URL'] ?? 'https://horizon-testnet.stellar.org';

const CACHE_MS = 15_000;

interface HorizonBalanceLine {
  asset_type: string;
  asset_code?: string;
  balance: string;
}

interface HorizonAccountResponse {
  balances: HorizonBalanceLine[];
}

const balanceCache = new Map<string, { data: HorizonAccountResponse; at: number }>();

async function fetchAccount(publicKey: string): Promise<HorizonAccountResponse | null> {
  const cached = balanceCache.get(publicKey);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.data;
  }
  try {
    const res = await fetch(`${HORIZON_BASE_URL}/accounts/${encodeURIComponent(publicKey)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as HorizonAccountResponse;
    balanceCache.set(publicKey, { data, at: Date.now() });
    return data;
  } catch {
    return null;
  }
}

/**
 * Returns the available balance of `assetCode` for `publicKey`, or `null`
 * when it can't be determined (account not found/funded yet, network
 * error, or Horizon unreachable). `assetCode` of `'XLM'` looks up the
 * native balance line; anything else matches on `asset_code`.
 */
export async function getAccountBalance(
  publicKey: string,
  assetCode: string,
): Promise<number | null> {
  if (!publicKey) return null;
  const account = await fetchAccount(publicKey);
  if (!account) return null;

  const line =
    assetCode === 'XLM'
      ? account.balances.find((b) => b.asset_type === 'native')
      : account.balances.find((b) => b.asset_code === assetCode);

  if (!line) return 0;
  const parsed = parseFloat(line.balance);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Clears the balance cache — mainly useful for tests. */
export function clearBalanceCache(): void {
  balanceCache.clear();
}
