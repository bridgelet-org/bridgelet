const STORAGE_KEY = 'bridgelet_claim_links';
const MAX_REMEMBERED_LINKS = 100;

type RememberedClaimLink = {
  claimUrl: string;
  savedAt: string;
};

type RememberedClaimLinkStore = Record<string, RememberedClaimLink>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStore(): RememberedClaimLinkStore {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};

    const store: RememberedClaimLinkStore = {};
    for (const [accountId, value] of Object.entries(parsed)) {
      if (!accountId || !isRecord(value)) continue;

      const claimUrl = value['claimUrl'];
      const savedAt = value['savedAt'];
      if (typeof claimUrl !== 'string' || !claimUrl.trim()) continue;

      store[accountId] = {
        claimUrl,
        savedAt: typeof savedAt === 'string' ? savedAt : '',
      };
    }
    return store;
  } catch {
    return {};
  }
}

function writeStore(store: RememberedClaimLinkStore): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage can be unavailable (private mode, quota); recovery is best-effort.
  }
}

export function rememberClaimLink(accountId: string, claimUrl: string): void {
  if (!accountId || !claimUrl.trim()) return;

  const store = readStore();
  store[accountId] = { claimUrl, savedAt: new Date().toISOString() };

  const newestFirst = Object.entries(store)
    .sort(([, a], [, b]) => b.savedAt.localeCompare(a.savedAt))
    .slice(0, MAX_REMEMBERED_LINKS);

  writeStore(Object.fromEntries(newestFirst));
}

export function getRememberedClaimLinks(): Record<string, string> {
  const store = readStore();
  return Object.fromEntries(
    Object.entries(store).map(([accountId, record]) => [accountId, record.claimUrl]),
  );
}
