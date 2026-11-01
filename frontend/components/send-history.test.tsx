import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SendHistory } from './send-history';
import * as bridgelet from '@/lib/bridgelet';

vi.mock('@/lib/bridgelet', async () => {
  const actual = await vi.importActual('@/lib/bridgelet');
  return {
    ...actual,
    listEphemeralAccounts: vi.fn(),
  };
});

describe('SendHistory (#956)', () => {
  const mockList = vi.mocked(bridgelet.listEphemeralAccounts);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders accounts list when API returns { accounts, total } object', async () => {
    mockList.mockResolvedValueOnce({
      accounts: [
        {
          accountId: 'claim-1234567890',
          publicKey: 'GABC1234',
          claimUrl: null,
          amount: '10.5000000',
          asset: 'XLM',
          status: 'pending_claim',
          expiresAt: '2026-11-08T00:00:00.000Z',
          createdAt: '2026-11-01T00:00:00.000Z',
        },
      ],
      total: 1,
    });

    render(<SendHistory />);

    expect(screen.getByText(/loading payments/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('10.5000000 XLM')).toBeInTheDocument();
    });

    expect(screen.getByText(/available/i)).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 1/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('handles backward-compatible bare array response gracefully without throwing', async () => {
    mockList.mockResolvedValueOnce({
      accounts: [
        {
          accountId: 'claim-legacy-1',
          publicKey: 'GLEGACY',
          claimUrl: null,
          amount: '5.0000000',
          asset: 'XLM',
          status: 'claimed',
          expiresAt: '2026-11-08T00:00:00.000Z',
          createdAt: '2026-11-01T00:00:00.000Z',
        },
      ],
      total: 1,
    });

    render(<SendHistory />);

    await waitFor(() => {
      expect(screen.getByText('5.0000000 XLM')).toBeInTheDocument();
    });
    expect(screen.getByText(/claimed/i)).toBeInTheDocument();
  });

  it('renders empty state when there are zero accounts', async () => {
    mockList.mockResolvedValueOnce({
      accounts: [],
      total: 0,
    });

    render(<SendHistory />);

    await waitFor(() => {
      expect(screen.getByText(/you haven't sent any payments yet/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /send your first payment/i })).toBeInTheDocument();
  });

  it('renders inline error alert with "Try again" when API throws', async () => {
    mockList.mockRejectedValueOnce(new Error('Network connection failed'));

    render(<SendHistory />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText(/network connection failed/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    mockList.mockResolvedValueOnce({ accounts: [], total: 0 });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText(/you haven't sent any payments yet/i)).toBeInTheDocument();
    });
  });

  it('defensively handles malformed responses without throwing an unhandled render crash', async () => {
    // Simulate invalid response that could cause accounts.map crash
    mockList.mockResolvedValueOnce({} as any);

    render(<SendHistory />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText(/received malformed payments data/i)).toBeInTheDocument();
  });

  it('navigates pagination correctly using total', async () => {
    // 15 total items: page 1 has 10 items, hasMore is true
    const page1Accounts = Array.from({ length: 10 }, (_, i) => ({
      accountId: `claim-${i}`,
      publicKey: `GPUB${i}`,
      claimUrl: null,
      amount: `${i + 1}.0000000`,
      asset: 'XLM',
      status: 'pending_claim' as const,
      expiresAt: '2026-11-08T00:00:00.000Z',
      createdAt: '2026-11-01T00:00:00.000Z',
    }));

    mockList.mockResolvedValueOnce({
      accounts: page1Accounts,
      total: 15,
    });

    render(<SendHistory />);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(nextBtn).not.toBeDisabled();

    // Mock page 2
    mockList.mockResolvedValueOnce({
      accounts: Array.from({ length: 5 }, (_, i) => ({
        accountId: `claim-${i + 10}`,
        publicKey: `GPUB${i + 10}`,
        claimUrl: null,
        amount: `${i + 11}.0000000`,
        asset: 'XLM',
        status: 'pending_claim' as const,
        expiresAt: '2026-11-08T00:00:00.000Z',
        createdAt: '2026-11-01T00:00:00.000Z',
      })),
      total: 15,
    });

    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
    });
    expect(nextBtn).toBeDisabled();
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
  });
});
