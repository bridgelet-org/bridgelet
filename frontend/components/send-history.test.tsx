import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SendHistory } from './send-history';
import { listEphemeralAccounts, type AccountStatus } from '@/lib/bridgelet';

vi.mock('@/lib/bridgelet', () => ({
  listEphemeralAccounts: vi.fn(),
}));

const listMock = vi.mocked(listEphemeralAccounts);

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
  });

  it('renders rows from the { accounts, total } response', async () => {
    listMock.mockResolvedValue({ accounts: [account('a1'), account('a2')], total: 2 });

    render(<SendHistory />);

    expect((await screen.findAllByText('10.0000000 XLM')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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

    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith({ limit: 10, offset: 10 }),
    );
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
