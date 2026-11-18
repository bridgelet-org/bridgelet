import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectStep } from './connect-step';

// Stub ChainSelector: tested separately.
vi.mock('@/components/chain-selector', () => ({
  ChainSelector: () => <div data-testid="chain-selector" />,
}));

const mockConnectFreighter = vi.fn();
vi.mock('@/lib/wallet', () => ({
  connectFreighter: () => mockConnectFreighter(),
}));

describe('ConnectStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Pre-connected (publicKey already set) ────────────────────────────────

  it('shows the connected wallet address when publicKey is provided', () => {
    const key = 'G' + 'A'.repeat(55);
    render(<ConnectStep publicKey={key} onConnected={vi.fn()} />);
    expect(screen.getByText('Wallet connected')).toBeInTheDocument();
    expect(screen.getByText(key)).toBeInTheDocument();
  });

  it('does not render the connect button when already connected', () => {
    render(<ConnectStep publicKey={'G' + 'A'.repeat(55)} onConnected={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /connect freighter/i })).not.toBeInTheDocument();
  });

  // ── Disconnected state ───────────────────────────────────────────────────

  it('renders the connect button and chain selector when no publicKey', () => {
    render(<ConnectStep publicKey="" onConnected={vi.fn()} />);
    expect(screen.getByRole('button', { name: /connect freighter wallet/i })).toBeInTheDocument();
    expect(screen.getByTestId('chain-selector')).toBeInTheDocument();
  });

  it('renders an Install Freighter link pointing to the docs', () => {
    render(<ConnectStep publicKey="" onConnected={vi.fn()} />);
    const link = screen.getByRole('link', { name: /install freighter/i });
    expect(link).toHaveAttribute('href', 'https://docs.freighter.app');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  // ── Successful connection ────────────────────────────────────────────────

  it('calls onConnected with the returned public key on success', async () => {
    const publicKey = 'G' + 'B'.repeat(55);
    mockConnectFreighter.mockResolvedValue({ publicKey });
    const onConnected = vi.fn();
    const user = userEvent.setup();

    render(<ConnectStep publicKey="" onConnected={onConnected} />);
    await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

    await waitFor(() => expect(onConnected).toHaveBeenCalledWith(publicKey));
  });

  it('shows "Connecting…" while the wallet request is in flight', async () => {
    let resolve!: (v: { publicKey: string }) => void;
    mockConnectFreighter.mockReturnValue(new Promise((r) => { resolve = r; }));
    const user = userEvent.setup();

    render(<ConnectStep publicKey="" onConnected={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

    expect(await screen.findByRole('button', { name: /connecting…/i })).toBeDisabled();
    resolve({ publicKey: 'G' + 'C'.repeat(55) });
  });

  // ── Failed connection ────────────────────────────────────────────────────

  it('shows an error message when wallet connection fails', async () => {
    mockConnectFreighter.mockRejectedValue(new Error('Freighter not installed'));
    const user = userEvent.setup();

    render(<ConnectStep publicKey="" onConnected={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Freighter not installed');
  });

  it('shows a generic fallback message for non-Error rejections', async () => {
    mockConnectFreighter.mockRejectedValue('unexpected');
    const user = userEvent.setup();

    render(<ConnectStep publicKey="" onConnected={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to connect wallet/i);
  });

  it('re-enables the button after a failed attempt', async () => {
    mockConnectFreighter.mockRejectedValue(new Error('fail'));
    const user = userEvent.setup();

    render(<ConnectStep publicKey="" onConnected={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /connect freighter wallet/i })).toBeEnabled(),
    );
  });
});
