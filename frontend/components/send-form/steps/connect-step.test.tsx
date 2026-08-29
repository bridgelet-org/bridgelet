import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectStep } from './connect-step';

// Stub ChainSelector — tested separately.
vi.mock('@/components/chain-selector', () => ({
  ChainSelector: () => <div data-testid="chain-selector" />,
}));

const mockConnectFreighter = vi.fn();
const mockPersistWallet = vi.fn();
const mockLoadPersistedWallet = vi.fn().mockReturnValue(null);
const mockClearPersistedWallet = vi.fn();

vi.mock('@/lib/wallet', () => ({
  connectFreighter: () => mockConnectFreighter(),
  persistWallet: (w: unknown) => mockPersistWallet(w),
  loadPersistedWallet: () => mockLoadPersistedWallet(),
  clearPersistedWallet: () => mockClearPersistedWallet(),
}));

describe('ConnectStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadPersistedWallet.mockReturnValue(null);
  });

  // ── Pre-connected (publicKey already set) ────────────────────────────────

  it('shows the connected wallet address when publicKey is provided', () => {
    const key = 'G' + 'A'.repeat(55);
    render(<ConnectStep publicKey={key} onConnected={vi.fn()} extensionSupportedOverride={true} />);
    expect(screen.getByText('Wallet connected')).toBeInTheDocument();
    expect(screen.getByText(key)).toBeInTheDocument();
  });

  it('does not render the connect button when already connected', () => {
    render(<ConnectStep publicKey={'G' + 'A'.repeat(55)} onConnected={vi.fn()} extensionSupportedOverride={true} />);
    expect(screen.queryByRole('button', { name: /connect freighter/i })).not.toBeInTheDocument();
  });

  it('shows a disconnect button when wallet is connected', () => {
    render(<ConnectStep publicKey={'G' + 'A'.repeat(55)} onConnected={vi.fn()} extensionSupportedOverride={true} />);
    expect(screen.getByRole('button', { name: /disconnect wallet/i })).toBeInTheDocument();
  });

  it('calls onConnected with empty string and clearPersistedWallet when disconnecting', async () => {
    const onConnected = vi.fn();
    const user = userEvent.setup();
    render(<ConnectStep publicKey={'G' + 'A'.repeat(55)} onConnected={onConnected} extensionSupportedOverride={true} />);

    await user.click(screen.getByRole('button', { name: /disconnect wallet/i }));

    expect(mockClearPersistedWallet).toHaveBeenCalledTimes(1);
    expect(onConnected).toHaveBeenCalledWith('');
  });

  // ── Wallet persistence ───────────────────────────────────────────────────

  it('calls onConnected with persisted wallet key on mount if no publicKey is set', async () => {
    const savedKey = 'G' + 'B'.repeat(55);
    mockLoadPersistedWallet.mockReturnValue({ publicKey: savedKey, type: 'freighter' });
    const onConnected = vi.fn();

    render(<ConnectStep publicKey="" onConnected={onConnected} extensionSupportedOverride={true} />);

    await waitFor(() => expect(onConnected).toHaveBeenCalledWith(savedKey));
  });

  it('does not call onConnected on mount when publicKey is already set', async () => {
    const onConnected = vi.fn();
    render(<ConnectStep publicKey={'G' + 'A'.repeat(55)} onConnected={onConnected} extensionSupportedOverride={true} />);

    // Give the effect time to fire
    await new Promise((r) => setTimeout(r, 50));
    expect(onConnected).not.toHaveBeenCalled();
  });

  // ── Disconnected state ───────────────────────────────────────────────────

  it('renders the connect button and chain selector when no publicKey', () => {
    render(<ConnectStep publicKey="" onConnected={vi.fn()} extensionSupportedOverride={true} />);
    expect(screen.getByRole('button', { name: /connect freighter wallet/i })).toBeInTheDocument();
    expect(screen.getByTestId('chain-selector')).toBeInTheDocument();
  });

  it('renders an Install Freighter link pointing to the docs', () => {
    render(<ConnectStep publicKey="" onConnected={vi.fn()} extensionSupportedOverride={true} />);
    const link = screen.getByRole('link', { name: /install freighter/i });
    expect(link).toHaveAttribute('href', 'https://docs.freighter.app');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows unsupported browser fallback when extension is not supported', () => {
    render(<ConnectStep publicKey="" onConnected={vi.fn()} extensionSupportedOverride={false} />);
    expect(screen.queryByRole('button', { name: /connect freighter wallet/i })).not.toBeInTheDocument();
    expect(screen.getByText(/browser not supported/i)).toBeInTheDocument();
  });

  // ── Successful connection ────────────────────────────────────────────────

  it('calls onConnected with the returned public key on success', async () => {
    const publicKey = 'G' + 'B'.repeat(55);
    mockConnectFreighter.mockResolvedValue({ publicKey });
    const onConnected = vi.fn();
    const user = userEvent.setup();

    render(<ConnectStep publicKey="" onConnected={onConnected} extensionSupportedOverride={true} />);
    await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

    await waitFor(() => expect(onConnected).toHaveBeenCalledWith(publicKey));
  });

  it('persists wallet after successful connection', async () => {
    const publicKey = 'G' + 'B'.repeat(55);
    const wallet = { publicKey, type: 'freighter' as const };
    mockConnectFreighter.mockResolvedValue(wallet);
    const user = userEvent.setup();

    render(<ConnectStep publicKey="" onConnected={vi.fn()} extensionSupportedOverride={true} />);
    await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

    await waitFor(() => expect(mockPersistWallet).toHaveBeenCalledWith(wallet));
  });

  it('shows "Connecting…" while the wallet request is in flight', async () => {
    let resolve!: (v: { publicKey: string }) => void;
    mockConnectFreighter.mockReturnValue(new Promise((r) => { resolve = r; }));
    const user = userEvent.setup();

    render(<ConnectStep publicKey="" onConnected={vi.fn()} extensionSupportedOverride={true} />);
    await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

    expect(await screen.findByRole('button', { name: /connecting…/i })).toBeDisabled();
    resolve({ publicKey: 'G' + 'C'.repeat(55) });
  });

  // ── Failed connection ────────────────────────────────────────────────────

  it('shows an error message when wallet connection fails', async () => {
    mockConnectFreighter.mockRejectedValue(new Error('Freighter not installed'));
    const user = userEvent.setup();

    render(<ConnectStep publicKey="" onConnected={vi.fn()} extensionSupportedOverride={true} />);
    await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Freighter not installed');
  });

  it('shows a clear rejection message when the user declines the prompt', async () => {
    mockConnectFreighter.mockRejectedValue(new Error('User rejected the request'));
    const user = userEvent.setup();

    render(<ConnectStep publicKey="" onConnected={vi.fn()} extensionSupportedOverride={true} />);
    await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/declined/i);
  });

  it('shows a generic fallback message for non-Error rejections', async () => {
    mockConnectFreighter.mockRejectedValue('unexpected');
    const user = userEvent.setup();

    render(<ConnectStep publicKey="" onConnected={vi.fn()} extensionSupportedOverride={true} />);
    await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to connect wallet/i);
  });

  it('re-enables the button after a failed attempt', async () => {
    mockConnectFreighter.mockRejectedValue(new Error('fail'));
    const user = userEvent.setup();

    render(<ConnectStep publicKey="" onConnected={vi.fn()} extensionSupportedOverride={true} />);
    await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /connect freighter wallet/i })).toBeEnabled(),
    );
  });

  // ── Destination address format validation (Issue #420) ──────────────────

  it('rejects a malformed address returned by Freighter instead of connecting', async () => {
    mockConnectFreighter.mockResolvedValue({ publicKey: 'not-a-real-address' });
    const onConnected = vi.fn();
    const user = userEvent.setup();

    render(<ConnectStep publicKey="" onConnected={onConnected} extensionSupportedOverride={true} />);
    await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/unexpected format/i);
    expect(onConnected).not.toHaveBeenCalled();
    expect(mockPersistWallet).not.toHaveBeenCalled();
  });

  it('discards a corrupted persisted wallet address instead of auto-connecting it', async () => {
    mockLoadPersistedWallet.mockReturnValue({ publicKey: 'corrupted-value', type: 'freighter' });
    const onConnected = vi.fn();

    render(<ConnectStep publicKey="" onConnected={onConnected} extensionSupportedOverride={true} />);

    // Give the restore effect time to run.
    await new Promise((r) => setTimeout(r, 50));

    expect(onConnected).not.toHaveBeenCalled();
    expect(mockClearPersistedWallet).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /connect freighter wallet/i })).toBeInTheDocument();
  });
});
