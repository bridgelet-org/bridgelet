import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimPageClient } from '@/app/claim/[token]/claim-page-client';
import { AccountStatus } from '@/lib/api/types';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

vi.mock('@/lib/fetch-with-timeout', () => ({
  fetchWithTimeout: vi.fn(),
  RequestTimeoutError: class RequestTimeoutError extends Error {
    constructor() {
      super('The request timed out. Please try again.');
      this.name = 'RequestTimeoutError';
    }
  },
}));

vi.mock('@/components/claim-status-card', () => ({
  ClaimStatusCard: ({ status, onClaim, supportEmail }: any) => (
    <div data-testid="claim-status-card">
      <span data-testid="status">{status}</span>
      <button onClick={() => onClaim?.('G' + 'A'.repeat(55))}>Claim</button>
      <span data-testid="support-email">{supportEmail}</span>
    </div>
  ),
}));

const mockedFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe('ClaimPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ClaimStatusCard immediately when initialView is provided', () => {
    render(
      <ClaimPageClient
        token="test-token"
        supportEmail="help@example.com"
        initialView={{
          status: AccountStatus.PENDING_CLAIM,
          amountStroops: '10000000',
          assetCode: 'XLM',
          expiresAt: '2026-08-01T12:00:00Z',
        }}
      />,
    );

    expect(screen.getByTestId('claim-status-card')).toBeInTheDocument();
    expect(screen.getByTestId('status')).toHaveTextContent(AccountStatus.PENDING_CLAIM);
    expect(screen.queryByText(/loading claim details/i)).not.toBeInTheDocument();
  });

  it('passes supportEmail through to ClaimStatusCard', () => {
    render(
      <ClaimPageClient
        token="test-token"
        supportEmail="help@example.com"
        initialView={{ status: AccountStatus.EXPIRED, expiresAt: '2026-08-01T12:00:00Z' }}
      />,
    );

    expect(screen.getByTestId('support-email')).toHaveTextContent('help@example.com');
  });

  it('shows loading state when initialView is not provided', () => {
    render(<ClaimPageClient token="test-token" supportEmail="help@example.com" />);
    expect(screen.getByText(/loading claim details/i)).toBeInTheDocument();
  });

  it('does not fetch when initialView is provided', async () => {
    render(
      <ClaimPageClient
        token="test-token"
        supportEmail="help@example.com"
        initialView={{ status: AccountStatus.PENDING_CLAIM }}
      />,
    );
    expect(mockedFetchWithTimeout).not.toHaveBeenCalled();
  });

  it('maps API failure to FAILED status when initialView is not provided', async () => {
    mockedFetchWithTimeout.mockRejectedValue(new Error('network error'));

    render(<ClaimPageClient token="test-token" supportEmail="help@example.com" />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent(AccountStatus.FAILED);
    });
  });

  it('calls onClaim and updates view to CLAIMED when initialView is provided and claim succeeds', async () => {
    const user = userEvent.setup();
    mockedFetchWithTimeout.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        isPartial: false,
        message: 'stub: sweep complete',
      }),
      headers: new Headers(),
    } as Response);

    render(
      <ClaimPageClient
        token="test-token"
        supportEmail="help@example.com"
        initialView={{ status: AccountStatus.PENDING_CLAIM, amountStroops: '10000000' }}
      />,
    );

    expect(screen.getByTestId('status')).toHaveTextContent(AccountStatus.PENDING_CLAIM);

    await user.click(screen.getByRole('button', { name: /claim/i }));

    expect(await screen.findByTestId('status')).toHaveTextContent(AccountStatus.CLAIMED);
  });
});
