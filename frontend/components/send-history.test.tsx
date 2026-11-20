import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SendHistory } from './send-history';
import { listEphemeralAccounts, type AccountStatus } from '@/lib/bridgelet';
import { analytics } from '@/lib/analytics';
import { rememberClaimLink } from '@/lib/claim-links';

vi.mock('@/lib/bridgelet', () => ({
  listEphemeralAccounts: vi.fn(),
  listAccountEvents: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  analytics: {
    claimLinkCopied: vi.fn(),
    claimLinkShared: vi.fn(),
    claimLinkRecoveryViewed: vi.fn(),
    dashboardViewed: vi.fn(),
    dashboardFilterApplied: vi.fn(),
  },
  DASHBOARD_FILTERS: ['all', 'unclaimed', 'claimed', 'expired'],
}));

const listMock = vi.mocked(listEphemeralAccounts);
const claimLinkCopiedMock = vi.mocked(analytics.claimLinkCopied);
const claimLinkRecoveryViewedMock = vi.mocked(analytics.claimLinkRecoveryViewed);
const dashboardViewedMock = vi.mocked(analytics.dashboardViewed);
const dashboardFilterAppliedMock = vi.mocked(analytics.dashboardFilterApplied);

function account(id: string, status: AccountStatus = 'pending_claim') {
  return {
    accountId: id,
    publicKey: 'G1',
    claimUrl: null,
    amount: '10.0000000',
    asset: 'XLM',
    status,
    expiresAt: '2026-11-10T00:00:00.000Z',
    createdAt: '2026-11-03T00:00:00.000Z',
  };
}

describe('SendHistory (#956)', () => {
  beforeEach(() => {
    listMock.mockReset();
    claimLinkCopiedMock.mockReset();
    claimLinkRecoveryViewedMock.mockReset();
    dashboardViewedMock.mockReset();
    dashboardFilterAppliedMock.mockReset();
    window.localStorage.clear();
  });

  describe('Dashboard Viewed (#995)', () => {
    it('fires once the list has loaded, with the page size and the "all" filter', async () => {
      listMock.mockResolvedValue({ accounts: [account('a1'), account('a2'), account('a3')], total: 3 });

      render(<SendHistory />);
      await screen.findAllByText('10.0000000 XLM');

      expect(dashboardViewedMock).toHaveBeenCalledTimes(1);
      expect(dashboardViewedMock).toHaveBeenCalledWith({ totalPayments: 3, activeFilter: 'all' });
    });

    it('fires with a zero count for an empty dashboard', async () => {
      listMock.mockResolvedValue({ accounts: [], total: 0 });

      render(<SendHistory />);
      await screen.findByText('No sent payments to show yet.');

      expect(dashboardViewedMock).toHaveBeenCalledTimes(1);
      expect(dashboardViewedMock).toHaveBeenCalledWith({ totalPayments: 0, activeFilter: 'all' });
    });

    it('does not fire while loading or when the list fails to load', async () => {
      listMock.mockRejectedValue(new Error('boom'));

      render(<SendHistory />);
      await screen.findByRole('alert');

      expect(dashboardViewedMock).not.toHaveBeenCalled();
    });

    it('does not fire again when the sender pages through the list', async () => {
      const first = Array.from({ length: 10 }, (_, i) => account(`p1-${i}`));
      listMock.mockResolvedValueOnce({ accounts: first, total: 12 });
      listMock.mockResolvedValueOnce({ accounts: [account('p2-0'), account('p2-1')], total: 12 });
      const user = userEvent.setup();

      render(<SendHistory />);
      await screen.findAllByText('10.0000000 XLM');
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
      await screen.findAllByText('10.0000000 XLM');

      expect(dashboardViewedMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('status filter (#996)', () => {
    const mixed = () => [
      account('open-1', 'pending_claim'),
      account('done-1', 'claimed'),
      account('gone-1', 'expired'),
      account('bad-1', 'failed'),
    ];

    it('lists every payment and marks "All" as active initially, without emitting an event', async () => {
      listMock.mockResolvedValue({ accounts: mixed(), total: 4 });

      render(<SendHistory />);

      await screen.findAllByText('10.0000000 XLM');
      expect(screen.getAllByRole('listitem')).toHaveLength(4);
      expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
      expect(dashboardFilterAppliedMock).not.toHaveBeenCalled();
    });

    it('narrows the list and emits the lowercase filter value when a different filter is chosen', async () => {
      listMock.mockResolvedValue({ accounts: mixed(), total: 4 });
      const user = userEvent.setup();
      render(<SendHistory />);
      await screen.findAllByText('10.0000000 XLM');

      await user.click(screen.getByRole('button', { name: 'Claimed' }));

      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Claimed' })).toHaveAttribute('aria-pressed', 'true');
      expect(dashboardFilterAppliedMock).toHaveBeenCalledTimes(1);
      expect(dashboardFilterAppliedMock).toHaveBeenCalledWith({ filter: 'claimed' });
    });

    it('does not emit again when the active filter is re-selected', async () => {
      listMock.mockResolvedValue({ accounts: mixed(), total: 4 });
      const user = userEvent.setup();
      render(<SendHistory />);
      await screen.findAllByText('10.0000000 XLM');

      await user.click(screen.getByRole('button', { name: 'All' }));
      await user.click(screen.getByRole('button', { name: 'Expired' }));
      await user.click(screen.getByRole('button', { name: 'Expired' }));

      expect(dashboardFilterAppliedMock).toHaveBeenCalledTimes(1);
      expect(dashboardFilterAppliedMock).toHaveBeenCalledWith({ filter: 'expired' });
    });

    it('shows a message when nothing on the page matches', async () => {
      listMock.mockResolvedValue({ accounts: [account('open-1', 'pending_claim')], total: 1 });
      const user = userEvent.setup();
      render(<SendHistory />);
      await screen.findAllByText('10.0000000 XLM');

      await user.click(screen.getByRole('button', { name: 'Expired' }));

      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
      expect(screen.getByText(/No payments on this page match the Expired filter/)).toBeInTheDocument();
    });
  });

  it('renders rows from the { accounts, total } response', async () => {
    listMock.mockResolvedValue({ accounts: [account('a1'), account('a2')], total: 2 });

    render(<SendHistory />);

    expect((await screen.findAllByText('10.0000000 XLM')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('never renders the app-wide claimUrl from the accounts response', async () => {
    listMock.mockResolvedValue({
      accounts: [
        {
          ...account('a1'),
          claimUrl: 'https://app.example/claim/another-senders-token',
        },
      ],
      total: 1,
    });

    render(<SendHistory />);

    await screen.findByText('10.0000000 XLM');
    expect(screen.queryByText(/another-senders-token/i)).not.toBeInTheDocument();
    expect(claimLinkRecoveryViewedMock).not.toHaveBeenCalled();
  });

  it('recovers a claim link remembered by this browser and copies it', async () => {
    const claimUrl = 'https://app.example/claim/recovered-token';
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    rememberClaimLink('a1', claimUrl);
    listMock.mockResolvedValue({ accounts: [account('a1', 'pending_claim')], total: 1 });

    render(<SendHistory />);

    const link = await screen.findByTestId('recovered-claim-link-a1');
    expect(link).toHaveAttribute('href', claimUrl);
    expect(claimLinkRecoveryViewedMock).toHaveBeenCalledTimes(1);
    expect(claimLinkRecoveryViewedMock).toHaveBeenCalledWith({ claimId: 'a1' });
    expect(screen.getByRole('link', { name: /share on whatsapp/i })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent(claimUrl)),
    );

    await userEvent.click(screen.getByRole('button', { name: /copy link/i }));

    expect(writeText).toHaveBeenCalledWith(claimUrl);
    expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument();
    expect(claimLinkCopiedMock).toHaveBeenCalledWith({
      claimId: 'a1',
      copyLocation: 'send_history_recovery',
    });
  });

  it('recovers a remembered claim link while the payment is still confirming', async () => {
    rememberClaimLink('a1', 'https://app.example/claim/pending-token');
    listMock.mockResolvedValue({ accounts: [account('a1', 'pending_payment')], total: 1 });

    render(<SendHistory />);

    expect(await screen.findByTestId('recovered-claim-link-a1')).toBeInTheDocument();
  });

  it('does not show a remembered claim link after the payment is claimed', async () => {
    rememberClaimLink('a1', 'https://app.example/claim/claimed-token');
    listMock.mockResolvedValue({ accounts: [account('a1', 'claimed')], total: 1 });

    render(<SendHistory />);

    await screen.findByText('10.0000000 XLM');
    expect(screen.queryByTestId('recovered-claim-link-a1')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no accounts', async () => {
    listMock.mockResolvedValue({ accounts: [], total: 0 });

    render(<SendHistory />);

    expect(await screen.findByText(/no sent payments to show yet/i)).toBeInTheDocument();
  });

  it('uses total to enable Next only when more pages exist', async () => {
    listMock.mockResolvedValueOnce({
      accounts: Array.from({ length: 10 }, (_, i) => account(`a${i}`)),
      total: 12,
    });
    listMock.mockResolvedValueOnce({ accounts: [account('last-1'), account('last-2')], total: 12 });

    render(<SendHistory />);

    const next = await screen.findByRole('button', { name: /next/i });
    await waitFor(() => expect(next).toBeEnabled());

    await userEvent.click(next);

    await waitFor(() => expect(listMock).toHaveBeenLastCalledWith({ limit: 10, offset: 10 }));
    await waitFor(() => expect(screen.getByRole('button', { name: /next/i })).toBeDisabled());
  });

  it('shows the in-page error panel for a malformed response', async () => {
    listMock.mockResolvedValue({
      accounts: null as unknown as ReturnType<typeof account>[],
      total: 1,
    });

    render(<SendHistory />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/malformed/i);
  });

  it('shows the in-page error panel when the request fails', async () => {
    listMock.mockRejectedValue(new Error('Network down'));

    render(<SendHistory />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
