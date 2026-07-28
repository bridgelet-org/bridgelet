import freighter from '@stellar/freighter-api';

export type WalletType = 'freighter' | 'lobstr' | 'generated';

export interface ConnectedWallet {
  publicKey: string;
  type: WalletType;
}

export interface SignedFreighterTransaction {
  signedTxXdr: string;
  signerAddress: string;
  networkPassphrase: string;
}

const NETWORK_PASSPHRASES: Record<string, string> = {
  'stellar-testnet': 'Test SDF Network ; September 2015',
  'stellar-mainnet': 'Public Global Stellar Network ; September 2015',
};

const STORAGE_KEY = 'bridgelet_wallet';

function resolveNetworkPassphrase(): string {
  const network = process.env['NEXT_PUBLIC_CRYPTO_NETWORK'] ?? 'stellar-testnet';
  return NETWORK_PASSPHRASES[network] ?? 'Test SDF Network ; September 2015';
}

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
      'Freighter extension not found. Please install it from freighter.app and refresh.',
    );
  }

  // Request access — this opens the Freighter popup
  await freighter.requestAccess();

  const { address } = await freighter.getAddress();
  if (!address) {
    throw new Error('Freighter did not return a public key. Did you approve the request?');
  }

  return { publicKey: address, type: 'freighter' };
}

export function isFreighterTransactionSigningAvailable(): boolean {
  const maybeSigner = (freighter as unknown as { signTransaction?: unknown }).signTransaction;
  return typeof maybeSigner === 'function';
}

export async function signFreighterTransaction(
  unsignedTxXdr: string,
): Promise<SignedFreighterTransaction> {
  if (!unsignedTxXdr.trim()) {
    throw new Error('Missing unsigned transaction XDR from server.');
  }

  if (!isFreighterTransactionSigningAvailable()) {
    throw new Error('Freighter transaction signing is not available in this environment.');
  }

  const networkPassphrase = resolveNetworkPassphrase();
  const signResult = await (
    freighter as unknown as {
      signTransaction: (
        xdr: string,
        options: { networkPassphrase: string },
      ) => Promise<Record<string, unknown>>;
    }
  ).signTransaction(unsignedTxXdr, { networkPassphrase });

  const signedTxXdr =
    (typeof signResult['signedTxXdr'] === 'string' && signResult['signedTxXdr']) ||
    (typeof signResult['signedTxXDR'] === 'string' && signResult['signedTxXDR']) ||
    (typeof signResult['xdr'] === 'string' && signResult['xdr']) ||
    '';

  if (!signedTxXdr) {
    throw new Error('Freighter did not return a signed transaction.');
  }

  const { address } = await freighter.getAddress();
  if (!address) {
    throw new Error('Freighter did not return a signer address.');
  }

  return {
    signedTxXdr,
    signerAddress: address,
    networkPassphrase,
  };
}

// LOBSTR is mobile-only, so on desktop we deeplink and poll for a result
// The user scans a QR or taps the link, approves, and we read back their key
// For MVP: we just open the LOBSTR website and ask them to paste their address
export async function connectLobstr(): Promise<ConnectedWallet> {
  // LOBSTR doesn't have a JS SDK for web connection like Freighter does.
  // The flow here is: open LOBSTR, the user copies their public key, pastes it back.
  // This function returns a placeholder — the UI handles the paste step.
  throw new Error('USE_PASTE_FLOW');
}

// Generate a brand-new Stellar keypair for users who have no wallet at all
export async function generateNewWallet(): Promise<{
  wallet: ConnectedWallet;
  secretKey: string;
}> {
  // We use the Stellar SDK dynamically to avoid SSR issues
  const { Keypair } = await import('@stellar/stellar-sdk');
  const keypair = Keypair.random();
  return {
    wallet: { publicKey: keypair.publicKey(), type: 'generated' },
    secretKey: keypair.secret(),
  };
}
