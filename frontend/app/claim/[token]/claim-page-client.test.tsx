import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimPageClient } from '@/app/claim/[token]/claim-page-client';
import { AccountStatus } from '@/lib/api/types';
import type { ClaimView } from '@/lib/claim-view';

const mocks = vi.hoisted(() => ({
  loadClaimView: vi.fn(),
  submitClaimWithRetry: vi.fn(),
  pollClaimStatus: vi.fn(),
  analytics: {
    claimPageOpened: vi.fn(),
    claimVerified: vi.fn(),
    claimConfirmationViewed: vi.fn(),
    errorDisplayed: vi.fn(),
    walletAddressValidationFailed: vi.fn(),
    retryClicked: vi.fn(),
    claimCtaClicked: vi.fn(),
    claimSubmitted: vi.fn(),
    claimFailed: vi.fn(),
    claimSucceeded: vi.fn(),
    claimSuccessViewed: vi.fn(),
    explorerLinkClicked: vi.fn(),
    senderSignupCtaClicked: vi.fn(),
  },
}));

vi.mock('@/lib/claim-view', () => ({
  loadClaimView: mocks.loadClaimView,
  markTokenClaimed: vi.fn(),
}));

vi.mock('@/lib/claim-retry', () => ({
  submitClaimWithRetry: mocks.submitClaimWithRetry,
  pollClaimStatus: mocks.pollClaimStatus,
}));

vi.mock('@/lib/analytics', () => ({
  analytics: mocks.analytics,
  daysRemainingUntil: vi.fn().mockReturnValue(1),
}));

vi.mock('@/components/chain-selector', () => ({
  ChainSelector: () => <div data-testid="chain-selector" />,
}));

vi.mock('@/components/rate-limit-banner', () => ({
  RateLimitBanner: ({ retryAfter }: { retryAfter: number | null }) => (
    <div data-testid="rate-limit-banner">retry: {String(retryAfter)}</div>
  ),
}));

const VALID_ADDRESS = 'G' + 'A'.repeat(55);

const USDC_VIEW: ClaimView = {
  status: AccountStatus.PENDING_CLAIM,
  amountStroops: '123456789',
  assetCode: 'USDC',
  expiresAt: '2026-08-01T12:00:00Z',
};

describe('ClaimPageClient (#977)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadClaimView.mockResolvedValue(USDC_VIEW);
  });

  it('shows the asset code on the claim page', async () => {
    render(
      <ClaimPageClient
        token="claim-token"
        supportEmail="support@example.com"
        initialView={USDC_VIEW}
      />,
    );

    expect(await screen.findByText(/you are receiving/i)).toBeInTheDocument();
    expect(screen.getByText('12.3456789 USDC')).toBeInTheDocument();
  });

  it('explains a missing USDC trustline and keeps the form usable for a retry', async () => {
    mocks.submitClaimWithRetry.mockResolvedValue({
      outcome: {
        kind: 'terminal',
        error: {
          code: 'DESTINATION_MISSING_TRUSTLINE',
          statusCode: 422,
          message: 'Backend trustline message',
        },
      },
    });

    const user = userEvent.setup({ delay: null });
    render(
      <ClaimPageClient
        token="claim-token"
        supportEmail="support@example.com"
        initialView={USDC_VIEW}
      />,
    );

    const input = screen.getByLabelText(/your stellar wallet address/i);
    const claimButton = screen.getByRole('button', { name: /claim now/i });

    fireEvent.change(input, { target: { value: VALID_ADDRESS } });
    expect(claimButton).toBeEnabled();

    await user.click(claimButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your wallet needs to add USDC before it can receive this payment. Add USDC in your wallet, then try again.',
    );
    expect(input).toHaveValue(VALID_ADDRESS);
    expect(claimButton).toBeEnabled();
    expect(mocks.submitClaimWithRetry).toHaveBeenCalledTimes(1);
  });
});
