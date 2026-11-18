import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentTimeline } from './payment-timeline';
import { listAccountEvents, type AccountEvent } from '@/lib/bridgelet';

vi.mock('@/lib/bridgelet', () => ({
  listAccountEvents: vi.fn(),
}));

const listMock = vi.mocked(listAccountEvents);
const VALID_HASH = 'a'.repeat(64);

function event(
  overrides: Partial<AccountEvent> & Pick<AccountEvent, 'id' | 'type' | 'createdAt'>,
): AccountEvent {
  return {
    accountId: 'acct-1',
    txHash: null,
    details: {},
    ...overrides,
  };
}

describe('PaymentTimeline (#978)', () => {
  beforeEach(() => {
    listMock.mockReset();
    vi.stubEnv('NEXT_PUBLIC_CRYPTO_NETWORK', 'stellar-testnet');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not load events until the row timeline is expanded', async () => {
    listMock.mockResolvedValue([
      event({
        id: 'e1',
        type: 'funded',
        createdAt: '2026-11-01T12:00:00.000Z',
      }),
    ]);

    render(<PaymentTimeline accountId="acct-1" />);

    expect(listMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Payment funded')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /view timeline/i }));

    expect(await screen.findByText('Payment funded')).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith('acct-1');
  });

  it('renders readable labels oldest first with explorer links only for valid hashes', async () => {
    listMock.mockResolvedValue([
      event({
        id: 'e3',
        type: 'claimed',
        createdAt: '2026-11-02T12:00:00.000Z',
        txHash: VALID_HASH,
      }),
      event({
        id: 'e1',
        type: 'created',
        createdAt: '2026-11-01T12:00:00.000Z',
        txHash: 'not-a-transaction-hash',
      }),
      event({
        id: 'e2',
        type: 'funded',
        createdAt: '2026-11-01T13:00:00.000Z',
      }),
    ]);

    render(<PaymentTimeline accountId="acct-1" />);
    await userEvent.click(screen.getByRole('button', { name: /view timeline/i }));

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(3);
    const created = items[0]!;
    const funded = items[1]!;
    const claimed = items[2]!;
    expect(within(created).getByText('Payment created')).toBeInTheDocument();
    expect(within(funded).getByText('Payment funded')).toBeInTheDocument();
    expect(within(claimed).getByText('Payment claimed')).toBeInTheDocument();

    expect(within(created).queryByRole('link')).not.toBeInTheDocument();
    expect(within(funded).queryByRole('link')).not.toBeInTheDocument();
    expect(within(claimed).getByRole('link', { name: /view transaction/i })).toHaveAttribute(
      'href',
      `https://stellar.expert/explorer/testnet/tx/${VALID_HASH}`,
    );
  });

  it('handles an empty event list gracefully', async () => {
    listMock.mockResolvedValue([]);

    render(<PaymentTimeline accountId="acct-1" />);
    await userEvent.click(screen.getByRole('button', { name: /view timeline/i }));

    expect(await screen.findByText(/no timeline events yet/i)).toBeInTheDocument();
  });

  it('keeps the page usable when events fail to load and allows a retry', async () => {
    listMock.mockRejectedValueOnce(new Error('Network down'));
    listMock.mockResolvedValueOnce([
      event({
        id: 'e1',
        type: 'expired',
        createdAt: '2026-11-03T12:00:00.000Z',
      }),
    ]);

    render(<PaymentTimeline accountId="acct-1" />);
    await userEvent.click(screen.getByRole('button', { name: /view timeline/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load timeline events/i);

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Payment expired')).toBeInTheDocument();
  });
});
