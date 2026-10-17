import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SendHistory } from './send-history';
import { listEphemeralAccounts, type EphemeralAccount } from '@/lib/bridgelet';
import { analytics } from '@/lib/analytics';
import { RateLimitError } from '@/lib/create-bridgelet-client';

vi.mock('@/lib/bridgelet', () => ({
  listEphemeralAccounts: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  analytics: {
    dashboardViewed: vi.fn(),
  },
}));

describe('SendHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(listEphemeralAccounts).mockReturnValue(new Promise(() => {}));
    render(<SendHistory />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading your payments…')).toBeInTheDocument();
  });

  it('renders payments and fires analytics.dashboardViewed on successful load', async () => {
    const mockAccounts: EphemeralAccount[] = [
      {
        accountId: 'GACC11111111111111111111111111111111111111111111111111111111',
        publicKey: 'GACC11111111111111111111111111111111111111111111111111111111',
        claimUrl: null,
        amount: '25.0',
        asset: 'USDC',
        status: 'pending_claim',
        createdAt: '2026-03-15T10:00:00.000Z',
        expiresAt: '2026-03-22T10:00:00.000Z',
      },
      {
        accountId: 'GACC22222222222222222222222222222222222222222222222222222222',
        publicKey: 'GACC22222222222222222222222222222222222222222222222222222222',
        claimUrl: null,
        amount: '10.0',
        asset: 'XLM',
        status: 'claimed',
        createdAt: '2026-03-14T10:00:00.000Z',
        expiresAt: '2026-03-21T10:00:00.000Z',
      },
    ];

    vi.mocked(listEphemeralAccounts).mockResolvedValueOnce(mockAccounts);

    render(<SendHistory />);

    await waitFor(() => {
      expect(screen.getByText('25.0 USDC')).toBeInTheDocument();
      expect(screen.getByText('10.0 XLM')).toBeInTheDocument();
    });

    expect(analytics.dashboardViewed).toHaveBeenCalledTimes(1);
    expect(analytics.dashboardViewed).toHaveBeenCalledWith({
      totalPayments: 2,
      activeFilter: 'all',
    });
  });

  it('renders empty state and fires analytics.dashboardViewed with totalPayments: 0', async () => {
    vi.mocked(listEphemeralAccounts).mockResolvedValueOnce([]);

    render(<SendHistory />);

    await waitFor(() => {
      expect(
        screen.getByText("You haven't sent any payments from this browser yet."),
      ).toBeInTheDocument();
    });

    expect(analytics.dashboardViewed).toHaveBeenCalledTimes(1);
    expect(analytics.dashboardViewed).toHaveBeenCalledWith({
      totalPayments: 0,
      activeFilter: 'all',
    });
  });

  it('does not fire analytics.dashboardViewed on pagination (next page)', async () => {
    const user = userEvent.setup();
    const firstPage: EphemeralAccount[] = Array.from({ length: 10 }, (_, i) => ({
      accountId: `GACC${i}111111111111111111111111111111111111111111111111111111`,
      publicKey: `GACC${i}111111111111111111111111111111111111111111111111111111`,
      claimUrl: null,
      amount: `${i + 1}`,
      asset: 'USDC',
      status: 'pending_claim',
      createdAt: '2026-03-15T10:00:00.000Z',
      expiresAt: '2026-03-22T10:00:00.000Z',
    }));
    const secondPage: EphemeralAccount[] = [
      {
        accountId: 'GACC991111111111111111111111111111111111111111111111111111',
        publicKey: 'GACC991111111111111111111111111111111111111111111111111111',
        claimUrl: null,
        amount: '11',
        asset: 'USDC',
        status: 'claimed',
        createdAt: '2026-03-14T10:00:00.000Z',
        expiresAt: '2026-03-21T10:00:00.000Z',
      },
    ];

    vi.mocked(listEphemeralAccounts)
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    render(<SendHistory />);

    await waitFor(() => {
      expect(screen.getByText('Page 1')).toBeInTheDocument();
    });

    expect(analytics.dashboardViewed).toHaveBeenCalledTimes(1);
    expect(analytics.dashboardViewed).toHaveBeenCalledWith({
      totalPayments: 10,
      activeFilter: 'all',
    });

    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(nextBtn).toBeEnabled();
    await user.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText('Page 2')).toBeInTheDocument();
    });

    // Should NOT have fired a second time on page 2
    expect(analytics.dashboardViewed).toHaveBeenCalledTimes(1);
  });

  it('renders error state and does not fire dashboardViewed when fetch fails', async () => {
    vi.mocked(listEphemeralAccounts).mockRejectedValueOnce(new Error('Network error'));

    render(<SendHistory />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });

    expect(analytics.dashboardViewed).not.toHaveBeenCalled();
  });

  it('fires dashboardViewed when user retries after error and succeeds', async () => {
    const user = userEvent.setup();
    vi.mocked(listEphemeralAccounts)
      .mockRejectedValueOnce(new RateLimitError(60))
      .mockResolvedValueOnce([
        {
          accountId: 'GACC11111111111111111111111111111111111111111111111111111111',
          publicKey: 'GACC11111111111111111111111111111111111111111111111111111111',
          claimUrl: null,
          amount: '5.0',
          asset: 'XLM',
          status: 'pending_claim',
          createdAt: '2026-03-15T10:00:00.000Z',
          expiresAt: '2026-03-22T10:00:00.000Z',
        },
      ]);

    render(<SendHistory />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(analytics.dashboardViewed).not.toHaveBeenCalled();

    const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
    await user.click(tryAgainBtn);

    await waitFor(() => {
      expect(screen.getByText('5.0 XLM')).toBeInTheDocument();
    });

    expect(analytics.dashboardViewed).toHaveBeenCalledTimes(1);
    expect(analytics.dashboardViewed).toHaveBeenCalledWith({
      totalPayments: 1,
      activeFilter: 'all',
    });
  });
});
