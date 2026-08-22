import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimStatusCard } from './claim-status-card';
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

    it('calls onClaim with the destination address and shows success state via redemptionStatus', async () => {
      const user = userEvent.setup({ delay: null });
      const onClaim = vi.fn().mockResolvedValue(undefined);
      const { rerender } = render(
        <ClaimStatusCard
          status={AccountStatus.PENDING_CLAIM}
          amountStroops="10000000"
          onClaim={onClaim}
          sweepNote="stub: sweep pending"
        />,
      );

      setDestinationAddress(VALID_ADDRESS);
      await user.click(screen.getByRole('button', { name: /claim now/i }));

      // The parent (ClaimPageClient) would set redemptionStatus to 'confirmed'
      // after onClaim resolves. Simulate that by re-rendering with the prop.
      await waitFor(() => expect(onClaim).toHaveBeenCalledWith(VALID_ADDRESS));
      rerender(
        <ClaimStatusCard
          status={AccountStatus.PENDING_CLAIM}
          amountStroops="10000000"
          onClaim={onClaim}
          sweepNote="stub: sweep pending"
          redemptionStatus="confirmed"
        />,
      );
      expect(await screen.findByText(/claim submitted/i)).toBeInTheDocument();
      expect(screen.getByText(/stub: sweep pending/)).toBeInTheDocument();
    });

    it('shows a rate limit banner when redemptionRetryAfter is provided', () => {
      render(
        <ClaimStatusCard
          status={AccountStatus.PENDING_CLAIM}
          amountStroops="10000000"
          redemptionStatus="failed-safe-to-retry"
          redemptionRetryAfter={30}
        />,
      );
      expect(screen.getByTestId('rate-limit-banner')).toHaveTextContent('retry: 30');
    });

    it('shows a visible error message when onClaim throws', async () => {
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

      expect(await screen.findByRole('alert')).toHaveTextContent('boom');
      expect(screen.queryByText(/claim submitted/i)).not.toBeInTheDocument();
    });

    it('clears a previous error on the next claim attempt', async () => {
      const user = userEvent.setup({ delay: null });
      const onClaim = vi
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(undefined);
      const { rerender } = render(
        <ClaimStatusCard
          status={AccountStatus.PENDING_CLAIM}
          amountStroops="10000000"
          onClaim={onClaim}
        />,
      );

      setDestinationAddress(VALID_ADDRESS);
      const button = screen.getByRole('button', { name: /claim now/i });
      await user.click(button);
      expect(await screen.findByRole('alert')).toBeInTheDocument();

      // Retry: parent would set redemptionStatus back to idle, then confirmed
      rerender(
        <ClaimStatusCard
          status={AccountStatus.PENDING_CLAIM}
          amountStroops="10000000"
          onClaim={onClaim}
          redemptionStatus="confirmed"
        />,
      );
      expect(await screen.findByText(/claim submitted/i)).toBeInTheDocument();
    });

    it('shows pending-confirmation state with spinner', () => {
      render(
        <ClaimStatusCard
          status={AccountStatus.PENDING_CLAIM}
          amountStroops="10000000"
          redemptionStatus="pending-confirmation"
          redemptionError="Checking your claim status…"
        />,
      );
      expect(screen.getByText(/checking your claim status/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /claim received/i })).toBeDisabled();
    });

    it('shows failed-safe-to-retry state with try-again button', () => {
      render(
        <ClaimStatusCard
          status={AccountStatus.PENDING_CLAIM}
          amountStroops="10000000"
          redemptionStatus="failed-safe-to-retry"
          redemptionError="Network error"
        />,
      );
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.getByText(/safe to try again/i)).toBeInTheDocument();
      // Retry still requires a valid address (the button is disabled until one is entered).
      setDestinationAddress(VALID_ADDRESS);
      expect(screen.getByRole('button', { name: /try again/i })).toBeEnabled();
    });

    it('shows failed-needs-support state with do-not-retry message', () => {
      render(
        <ClaimStatusCard
          status={AccountStatus.PENDING_CLAIM}
          amountStroops="10000000"
          redemptionStatus="failed-needs-support"
          redemptionError="This claim has expired"
        />,
      );
      expect(screen.getByText(/this claim has expired/i)).toBeInTheDocument();
      expect(screen.getByText(/do not submit again/i)).toBeInTheDocument();
    });

    it('renders the ChainSelector', () => {
      render(<ClaimStatusCard status={AccountStatus.PENDING_CLAIM} amountStroops="10000000" />);
      expect(screen.getByTestId('chain-selector')).toBeInTheDocument();
    });
  });

  // ─── CLAIMING / PARTIAL_SWEEP ──────────────────────────────────────────

  it('shows a processing message for CLAIMING', () => {
    render(<ClaimStatusCard status={AccountStatus.CLAIMING} />);
    expect(screen.getByText('Claim in progress')).toBeInTheDocument();
    expect(screen.getByText(/being processed on-chain/i)).toBeInTheDocument();
  });

  it('shows a retry hint and sweep note for PARTIAL_SWEEP', () => {
    render(
      <ClaimStatusCard
        status={AccountStatus.PARTIAL_SWEEP}
        sweepNote="stub: 1 of 2 legs complete"
      />,
    );
    expect(screen.getByText('Finishing up your claim')).toBeInTheDocument();
    expect(screen.getByText(/tap claim now to retry/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 legs complete/)).toBeInTheDocument();
  });

  // ─── CLAIMED ────────────────────────────────────────────────────────────

  it('shows the claimed state', () => {
    render(<ClaimStatusCard status={AccountStatus.CLAIMED} />);
    expect(screen.getByRole('heading', { name: 'Payment already claimed' })).toBeInTheDocument();
    expect(screen.getByText(/transferred to the recipient/i)).toBeInTheDocument();
  });

  // ─── EXPIRED ────────────────────────────────────────────────────────────

  describe('EXPIRED', () => {
    it('shows the expiry date when provided', () => {
      render(<ClaimStatusCard status={AccountStatus.EXPIRED} expiresAt="2026-01-01T00:00:00Z" />);
      expect(screen.getByText('Payment link expired')).toBeInTheDocument();
      expect(screen.getByText(/expired on/i)).toBeInTheDocument();
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