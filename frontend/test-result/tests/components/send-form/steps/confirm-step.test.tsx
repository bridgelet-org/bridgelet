import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BridgeletApiError } from '../../../../../lib/create-bridgelet-client';
import { ConfirmStep } from '../../../../../components/send-form/steps/confirm-step';

vi.mock('../../../../../hooks/use-nfc', () => ({
  useNfc: () => ({
    isSupported: false,
    writeUrl: vi.fn(),
    isWriting: false,
    error: null,
  }),
}));

vi.mock('../../../../../lib/env', () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_API_BASE_URL: 'http://localhost:4000',
    NEXT_PUBLIC_CRYPTO_NETWORK: 'stellar-testnet',
    NEXT_PUBLIC_SUPPORT_EMAIL: 'support@example.com',
  },
}));

let createAccountImpl: () => Promise<any>;
let prepareImpl: () => Promise<any>;

vi.mock('../../../../../lib/create-bridgelet-client', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../../lib/create-bridgelet-client')
  >('../../../../../lib/create-bridgelet-client');

  return {
    ...actual,
    BridgeletClient: class extends actual.BridgeletClient {
      override createAccount(): Promise<any> {
        return createAccountImpl();
      }
      override prepareAccountTransaction(): Promise<any> {
        return prepareImpl();
      }
    },
  };
});

vi.mock('../../../../../lib/wallet', async () => {
  const actual = await vi.importActual<typeof import('../../../../../lib/wallet')>(
    '../../../../../lib/wallet',
  );
  return {
    ...actual,
    isFreighterTransactionSigningAvailable: vi.fn().mockReturnValue(false),
    signFreighterTransaction: vi.fn(),
  };
});

import {
  isFreighterTransactionSigningAvailable,
  signFreighterTransaction,
} from '../../../../../lib/wallet';

function mockCreateAccount(value: any) {
  createAccountImpl = () => Promise.resolve(value);
}

function mockCreateAccountRejects(err: unknown) {
  createAccountImpl = () => Promise.reject(err);
}

const STATE = {
  publicKey: 'G' + 'A'.repeat(55),
  recipientName: 'Test Recipient',
  recipientEmail: 'test@example.com',
  amountXlm: '10',
  assetCode: 'XLM',
  memo: 'Thanks!',
  expiresIn: 7 * 24 * 60 * 60,
};

const SUCCESS_ACCOUNT = {
  accountId: 'acct_1',
  publicKey: 'GABC',
  claimUrl: '/claim/1',
  amount: '10',
  asset: 'XLM',
  status: 'pending_payment',
  expiresAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

describe('ConfirmStep error handling', () => {
  beforeEach(() => {
    mockCreateAccount(SUCCESS_ACCOUNT);
    prepareImpl = () => Promise.resolve({ unsignedTxXdr: 'AAAA_UNSIGNED' });
    vi.mocked(isFreighterTransactionSigningAvailable).mockReturnValue(false);
    vi.clearAllMocks();
  });

  it(
    'shows a user-friendly network error with a retry button',
    async () => {
      mockCreateAccountRejects(new TypeError('fetch failed'));

      const user = userEvent.setup({ delay: null });
      render(<ConfirmStep state={STATE} onBack={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /confirm & send/i }));
      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(/network error/i),
      );

      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    },
    20_000,
  );

  it(
    'shows a user-friendly insufficient funds error without a retry button',
    async () => {
      mockCreateAccountRejects(
        new BridgeletApiError(
          { error: { code: 'INSUFFICIENT_BALANCE', message: 'No funds' } },
          402,
        ),
      );

      const user = userEvent.setup({ delay: null });
      render(<ConfirmStep state={STATE} onBack={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /confirm & send/i }));
      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(/doesn.t have enough funds/i),
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm & send/i })).toBeInTheDocument();
    },
    20_000,
  );

  it(
    'shows a user-friendly Stellar creation failure with retry',
    async () => {
      mockCreateAccountRejects(
        new BridgeletApiError({ error: { code: 'STELLAR_ERROR', message: 'tx failed' } }, 500),
      );

      const user = userEvent.setup({ delay: null });
      render(<ConfirmStep state={STATE} onBack={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /confirm & send/i }));
      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(
          /create the payment on the stellar network/i,
        ),
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    },
    20_000,
  );

  it(
    'increments retry count and limits to MAX_RETRIES',
    async () => {
      mockCreateAccountRejects(new TypeError('fetch failed'));

      const user = userEvent.setup({ delay: null });
      render(<ConfirmStep state={STATE} onBack={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /confirm & send/i }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument(),
      );

      let tryAgainBtn = screen.getByRole('button', { name: /try again/i });
      expect(tryAgainBtn).toHaveTextContent(/2 left/);

      await user.click(tryAgainBtn);
      await waitFor(() => {
        tryAgainBtn = screen.getByRole('button', { name: /try again/i });
        expect(tryAgainBtn).toHaveTextContent(/1 left/);
      });

      await user.click(tryAgainBtn);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
      });
    },
    30_000,
  );

  it(
    'shows contact support after max retries',
    async () => {
      mockCreateAccountRejects(new TypeError('fetch failed'));

      const user = userEvent.setup({ delay: null });
      render(<ConfirmStep state={STATE} onBack={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /confirm & send/i }));
      for (let i = 0; i < 2; i++) {
        await waitFor(() =>
          expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument(),
        );
        await user.click(screen.getByRole('button', { name: /try again/i }));
      }

      await waitFor(() => expect(screen.getByText(/contact support/i)).toBeInTheDocument());
    },
    30_000,
  );

  it(
    'keeps the Back button functional on error',
    async () => {
      const onBack = vi.fn();
      mockCreateAccountRejects(new TypeError('fetch failed'));

      const user = userEvent.setup({ delay: null });
      render(<ConfirmStep state={STATE} onBack={onBack} />);

      await user.click(screen.getByRole('button', { name: /confirm & send/i }));
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /back/i }));
      expect(onBack).toHaveBeenCalledTimes(1);
    },
    20_000,
  );
});

describe('ConfirmStep Freighter sender signing', () => {
  beforeEach(() => {
    mockCreateAccount(SUCCESS_ACCOUNT);
    prepareImpl = () => Promise.resolve({ unsignedTxXdr: 'AAAA_UNSIGNED' });
    vi.mocked(isFreighterTransactionSigningAvailable).mockReturnValue(true);
    vi.mocked(signFreighterTransaction).mockResolvedValue({
      signedTxXdr: 'AAAA_SIGNED',
      signerAddress: STATE.publicKey,
      networkPassphrase: 'Test SDF Network ; September 2015',
    });
    vi.clearAllMocks();
  });

  it(
    'signs with Freighter and reports client-side signing on success',
    async () => {
      const user = userEvent.setup({ delay: null });
      render(<ConfirmStep state={STATE} onBack={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /confirm & send/i }));

      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/payment sent/i));
      expect(signFreighterTransaction).toHaveBeenCalledWith('AAAA_UNSIGNED');
      expect(
        screen.getByText(/authorised with freighter client-side signing/i),
      ).toBeInTheDocument();
    },
    20_000,
  );

  it(
    'falls back to backend signing when prepare is unavailable',
    async () => {
      prepareImpl = () => Promise.reject(new BridgeletApiError({ message: 'missing' }, 404));

      const user = userEvent.setup({ delay: null });
      render(<ConfirmStep state={STATE} onBack={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /confirm & send/i }));

      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/payment sent/i));
      expect(signFreighterTransaction).not.toHaveBeenCalled();
      expect(
        screen.queryByText(/authorised with freighter client-side signing/i),
      ).not.toBeInTheDocument();
    },
    20_000,
  );

  it(
    'surfaces Freighter rejection without silently falling back',
    async () => {
      vi.mocked(signFreighterTransaction).mockRejectedValue(new Error('User rejected request'));

      const user = userEvent.setup({ delay: null });
      render(<ConfirmStep state={STATE} onBack={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /confirm & send/i }));

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(/freighter signing was cancelled/i),
      );
    },
    20_000,
  );
});
