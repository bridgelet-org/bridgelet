import freighter from "@stellar/freighter-api";

export type WalletType = "freighter" | "lobstr" | "generated";

export interface ConnectedWallet {
  publicKey: string;
  type: WalletType;
}

const STORAGE_KEY = "bridgelet_wallet";

// Save wallet to localStorage so it survives page refreshes
export function persistWallet(wallet: ConnectedWallet): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
}

// Load previously saved wallet on page load
export function loadPersistedWallet(): ConnectedWallet | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConnectedWallet;
  } catch {
    return null;
  }
}

export function clearPersistedWallet(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Connect via Freighter browser extension
export async function connectFreighter(): Promise<ConnectedWallet> {
  const isAvailable = await freighter.isConnected();
  if (!isAvailable) {
    throw new Error(
      "Freighter extension not found. Please install it from freighter.app and refresh."
    );
  }

  // Request access — this opens the Freighter popup
  await freighter.requestAccess();

  const { publicKey } = await freighter.getPublicKey();
  if (!publicKey) {
    throw new Error("Freighter did not return a public key. Did you approve the request?");
  }

  return { publicKey, type: "freighter" };
}

// LOBSTR is mobile-only, so on desktop we deeplink and poll for a result
// The user scans a QR or taps the link, approves, and we read back their key
// For MVP: we just open the LOBSTR website and ask them to paste their address
export async function connectLobstr(): Promise<ConnectedWallet> {
  // LOBSTR doesn't have a JS SDK for web connection like Freighter does.
  // The flow here is: open LOBSTR, the user copies their public key, pastes it back.
  // This function returns a placeholder — the UI handles the paste step.
  throw new Error("USE_PASTE_FLOW");
}

// Generate a brand-new Stellar keypair for users who have no wallet at all
export async function generateNewWallet(): Promise<{
  wallet: ConnectedWallet;
  secretKey: string;
}> {
  // We use the Stellar SDK dynamically to avoid SSR issues
  const { Keypair } = await import("@stellar/stellar-sdk");
  const keypair = Keypair.random();
  return {
    wallet: { publicKey: keypair.publicKey(), type: "generated" },
    secretKey: keypair.secret(),
  };
}
