import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimStatusCard } from './claim-status-card';
import { RateLimitError } from '@/lib/api/client';
import { AccountStatus } from '@/lib/api/types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/components/rate-limit-banner', () => ({
  RateLimitBanner: ({ retryAfter }: { retryAfter: number | null }) => (
    <div data-testid="rate-limit-banner">retry: {String(retryAfter)}</div>
  ),
}));

vi.mock('@/components/chain-selector', () => ({
  ChainSelector: () => <div data-testid="chain-selector" />,
}));

// #432: mock WalletConnect so we can test it independently of Freighter
vi.mock('@/components/wallet-connect', () => ({
  WalletConnect: ({
    onConnected,
    onRejected,
  }: {
    onConnected?: (w: { publicKey: string }) => void;
    onRejected?: (msg: string) => void;
  }) => (
    <div>
      <button onClick={() => onConnected?.({ publicKey: 'G' + 'B'.repeat(55) })}>
        Connect Freighter Wallet
      </button>
      <button onClick={() => onRejected?.('User rejected')}>Simulate reject</button>
    </div>
  ),
}));

// A valid-looking Stellar public key (G + 55 base32 chars).
const VALID_ADDRESS = 'G' + 'A'.repeat(55);

function setDestinationAddress(value: string) {
  const input = screen.getByLabelText(/your stellar wallet address/i);
  fireEvent.change(input, { target: { value } });
}

describe('ClaimStatusCard', () => {
  // ─── INITIALIZING / PENDING_PAYMENT ────────────────────────────────────

  it('shows a setting-up message for INITIALIZING', () => {
    render(<ClaimStatusCard status={AccountStatus.INITIALIZING} />);
    expect(screen.getByText('Setting up your payment')).toBeInTheDocument();
    expect(screen.getByText(/sender is setting up this payment/i)).toBeInTheDocument();
  });

  it('shows a waiting-for-payment message for PENDING_PAYMENT', () => {
    render(<ClaimStatusCard status={AccountStatus.PENDING_PAYMENT} />);
    expect(screen.getByText('Waiting for payment')).toBeInTheDocument();
    expect(screen.getByText(/payment hasn.t confirmed on-chain yet/i)).toBeInTheDocument();
  });

  // ─── PENDING_CLAIM (AvailablePanel) ────────────────────────────────────

  describe('PENDING_CLAIM', () => {
    it('renders amount, expiry, and memo', () => {
      render(
        <ClaimStatusCard
          status={AccountStatus.PENDING_CLAIM}
          amountStroops="123456789"
          assetCode="XLM"
          expiresAt="2026-08-01T12:00:00Z"
          memo="Thanks!"
        />,
      );
      expect(screen.getByText(/12\.3456789 XLM/)).toBeInTheDocument();
      expect(screen.getByText('Thanks!')).toBeInTheDocument();
    });

    it('renders a dash when amount is missing', () => {
      render(<ClaimStatusCard status={AccountStatus.PENDING_CLAIM} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('disables the claim button until a valid address is entered', () => {
      render(<ClaimStatusCard status={AccountStatus.PENDING_CLAIM} amountStroops="10000000" />);
      const button = screen.getByRole('button', { name: /claim now/i });
      expect(button).toBeDisabled();

      setDestinationAddress('not-a-valid-address');
      expect(button).toBeDisabled();
      expect(screen.getByText(/enter a valid stellar public key/i)).toBeInTheDocument();

      setDestinationAddress(VALID_ADDRESS);
      expect(button).toBeEnabled();
    });

    // #432: wallet-connect path is shown alongside manual entry
    it('shows the wallet connect option alongside manual entry', () => {
      render(<ClaimStatusCard status={AccountStatus.PENDING_CLAIM} amountStroops="10000000" />);
      expect(screen.getByText(/already have a stellar wallet/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /connect freighter wallet/i })).toBeInTheDocument();
      expect(screen.getByText(/new to stellar/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/your stellar wallet address/i)).toBeInTheDocument();
    });

    // #432: wallet connect prefills address and shows confirmation before sweep
    it('prefills address from wallet connect and shows confirmation step', async () => {
      const user = userEvent.setup({ delay: null });
      const onClaim = vi.fn().mockResolvedValue(undefined);
      render(
        <ClaimStatusCard
          status={AccountStatus.PENDING_CLAIM}
          amountStroops="10000000"
          onClaim={onClaim}
        />,
      );

      // Connect wallet via mock
      await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

      // Should show connected address and a "Claim to …" button
      expect(await screen.findByText(/freighter connected/i)).toBeInTheDocument();
      const claimToBtn = screen.getByRole('button', { name: /claim to/i });
      expect(claimToBtn).toBeInTheDocument();

      // Click it → should show confirmation dialog
      await user.click(claimToBtn);
      expect(await screen.findByRole('dialog', { name: /confirm destination address/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm & send/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();

      // onClaim should NOT have been called yet
      expect(onClaim).not.toHaveBeenCalled();
    });

    // #432: wallet connect rejection shows contextual fallback message
    it('shows a non-alarming message when wallet connect is rejected', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ClaimStatusCard status={AccountStatus.PENDING_CLAIM} amountStroops="10000000" />);

      await user.click(screen.getByRole('button', { name: /simulate reject/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/user rejected/i);
      // Manual entry should still be accessible
      expect(screen.getByLabelText(/your stellar wallet address/i)).toBeInTheDocument();
    });

    // #433: claim now → confirmation → confirm & send → sweep in progress → success
    it('shows confirmation step, then sweep-in-progress, then final success state', async () => {
      const user = userEvent.setup({ delay: null });
      const onClaim = vi.fn().mockResolvedValue(undefined);
      render(
        <ClaimStatusCard
          status={AccountStatus.PENDING_CLAIM}
          amountStroops="10000000"
          assetCode="XLM"
          onClaim={onClaim}
        />,
      );

      setDestinationAddress(VALID_ADDRESS);
      await user.click(screen.getByRole('button', { name: /claim now/i }));

      // Confirmation step shown
      expect(await screen.findByRole('dialog', { name: /confirm destination address/i })).toBeInTheDocument();

      // Confirm
      await user.click(screen.getByRole('button', { name: /confirm & send/i }));

      await waitFor(() => expect(onClaim).toHaveBeenCalledWith(VALID_ADDRESS));

      // #433: sweep-in-progress state shown
      expect(await screen.findByText(/funds are moving to your wallet/i)).toBeInTheDocument();

      // #433: final success state appears after 2s (we fake timers are not needed as we just await)
      await waitFor(
        () => expect(screen.getByText(/payment sent successfully/i)).toBeInTheDocument(),
        { timeout: 3500 },
      );
      expect(screen.getByText(/1\.00 XLM/)).toBeInTheDocument();
      expect(screen.getByText(VALID_ADDRESS)).toBeInTheDocument();
    });

    it('shows a rate limit banner when onClaim throws RateLimitError', async () => {
      const user = userEvent.setup({ delay: null });
      const onClaim = vi.fn().mockRejectedValue(new RateLimitError(30));
      render(
        <ClaimStatusCard
          status={AccountStatus.PENDING_CLAIM}
          amountStroops="10000000"
          onClaim={onClaim}
        />,
      );

      setDestinationAddress(VALID_ADDRESS);
      await user.click(screen.getByRole('button', { name: /claim now/i }));

      // Confirmation step
      expect(await screen.findByRole('dialog', { name: /confirm destination address/i })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /confirm & send/i }));

      expect(await screen.findByTestId('rate-limit-banner')).toHaveTextContent('retry: 30');
      // Should not show the success state
      expect(screen.queryByText(/payment sent successfully/i)).not.toBeInTheDocument();
    });

    it('shows a visible error message for a non-rate-limit rejection', async () => {
      const user = userEvent.setup({ delay: null });
      const onClaim = vi.fn().mockRejectedValue(new Error('boom'));
      render(
        <ClaimStatusCard
          status={AccountStatus.PENDING_CLAIM}
          amountStroops="10000000"
          onClaim={onClaim}
        />,
      );

      setDestinationAddress(VALID_ADDRESS);
      await user.click(screen.getByRole('button', { name: /claim now/i }));
      await user.click(await screen.findByRole('button', { name: /confirm & send/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent('boom');
      expect(screen.queryByText(/payment sent successfully/i)).not.toBeInTheDocument();
    });

    it('back button on confirmation returns to the address entry form', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ClaimStatusCard status={AccountStatus.PENDING_CLAIM} amountStroops="10000000" />);

      setDestinationAddress(VALID_ADDRESS);
      await user.click(screen.getByRole('button', { name: /claim now/i }));
      expect(await screen.findByRole('dialog', { name: /confirm destination address/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /back/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/your stellar wallet address/i)).toBeInTheDocument();
    });

    it('renders the ChainSelector', () => {
      render(<ClaimStatusCard status={AccountStatus.PENDING_CLAIM} amountStroops="10000000" />);
      expect(screen.getByTestId('chain-selector')).toBeInTheDocument();
    });
  });

  // ─── CLAIMING / PARTIAL_SWEEP ──────────────────────────────────────────

  // #433: CLAIMING shows "funds are moving" distinct from initial claim step
  it('shows a "funds are moving" message for CLAIMING', () => {
    render(<ClaimStatusCard status={AccountStatus.CLAIMING} />);
    expect(screen.getAllByText('Funds are moving to your wallet').length).toBeGreaterThan(0);
    expect(screen.getByText(/being processed on the Stellar network/i)).toBeInTheDocument();
  });

  it('shows a finalizing message and sweep note for PARTIAL_SWEEP', () => {
    render(
      <ClaimStatusCard
        status={AccountStatus.PARTIAL_SWEEP}
        sweepNote="stub: 1 of 2 legs complete"
      />,
    );
    expect(screen.getByText('Finishing up your claim')).toBeInTheDocument();
    expect(screen.getByText(/finalizing your transfer/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 legs complete/)).toBeInTheDocument();
  });

  // ─── CLAIMED ────────────────────────────────────────────────────────────

  // #435: "claimed by someone else" state — neutral, not alarming
  it('shows the "claimed by someone else" state when claimedByMe is false', () => {
    render(<ClaimStatusCard status={AccountStatus.CLAIMED} claimedByMe={false} />);
    expect(
      screen.getByRole('heading', { name: 'Payment already claimed' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/each claim link can only be used once/i)).toBeInTheDocument();
    // Should NOT offer a claim action
    expect(screen.queryByRole('button', { name: /claim/i })).not.toBeInTheDocument();
  });

  // #435: "claimed by you" state — success confirmation
  it('shows the "claimed by you" success state when claimedByMe is true', () => {
    render(
      <ClaimStatusCard
        status={AccountStatus.CLAIMED}
        claimedByMe={true}
        sweepAmountStroops="10000000"
        assetCode="XLM"
        sweepDestination={VALID_ADDRESS}
        supportEmail="support@example.com"
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Payment claimed by you' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/you already claimed this payment/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.00 XLM/)).toBeInTheDocument();
    expect(screen.getByText(VALID_ADDRESS)).toBeInTheDocument();
    // Should NOT offer a claim action
    expect(screen.queryByRole('button', { name: /claim/i })).not.toBeInTheDocument();
  });

  // #435: support link shown in "claimed by someone else" state
  it('shows a support link in the "claimed by someone else" state', () => {
    render(
      <ClaimStatusCard
        status={AccountStatus.CLAIMED}
        claimedByMe={false}
        supportEmail="help@example.com"
      />,
    );
    const link = screen.getByRole('link', { name: 'help@example.com' });
    expect(link).toHaveAttribute('href', 'mailto:help@example.com');
  });

  // ─── EXPIRED ────────────────────────────────────────────────────────────

  describe('EXPIRED', () => {
    // #434: visually distinct from FAILED (amber vs red)
    it('shows the expiry date when provided', () => {
      render(<ClaimStatusCard status={AccountStatus.EXPIRED} expiresAt="2026-01-01T00:00:00Z" />);
      expect(screen.getByText('Payment link expired')).toBeInTheDocument();
      expect(screen.getByText(/expired on/i)).toBeInTheDocument();
    });

    // #434: explains funds are returned to sender
    it('explains that funds are automatically returned to the sender', () => {
      render(<ClaimStatusCard status={AccountStatus.EXPIRED} />);
      expect(screen.getByText(/automatically returned to the sender/i)).toBeInTheDocument();
    });

    // #434: no claim action offered
    it('does not offer a claim action when expired', () => {
      render(<ClaimStatusCard status={AccountStatus.EXPIRED} />);
      expect(screen.queryByRole('button', { name: /claim/i })).not.toBeInTheDocument();
    });

    it('renders a mailto link when supportEmail is provided', () => {
      render(<ClaimStatusCard status={AccountStatus.EXPIRED} supportEmail="help@example.com" />);
      const link = screen.getByRole('link', { name: 'help@example.com' });
      expect(link).toHaveAttribute('href', 'mailto:help@example.com');
    });

    it('omits the support link when supportEmail is not provided', () => {
      render(<ClaimStatusCard status={AccountStatus.EXPIRED} />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  // ─── FAILED ─────────────────────────────────────────────────────────────

  describe('FAILED', () => {
    it('shows the failure message', () => {
      render(<ClaimStatusCard status={AccountStatus.FAILED} />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/couldn.t be set up/i)).toBeInTheDocument();
    });

    it('renders a mailto link when supportEmail is provided', () => {
      render(<ClaimStatusCard status={AccountStatus.FAILED} supportEmail="support@example.com" />);
      const link = screen.getByRole('link', { name: 'support@example.com' });
      expect(link).toHaveAttribute('href', 'mailto:support@example.com');
    });

    it('omits the support line when supportEmail is not provided', () => {
      render(<ClaimStatusCard status={AccountStatus.FAILED} />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  // ─── General / accessibility ───────────────────────────────────────────

  it('sets an aria-label reflecting the current status', () => {
    render(<ClaimStatusCard status={AccountStatus.CLAIMED} />);
    expect(screen.getByLabelText(`Claim status: ${AccountStatus.CLAIMED}`)).toBeInTheDocument();
  });

  it('renders every AccountStatus value without throwing', () => {
    Object.values(AccountStatus).forEach((status) => {
      const { unmount } = render(<ClaimStatusCard status={status} />);
      unmount();
    });
  });
});
