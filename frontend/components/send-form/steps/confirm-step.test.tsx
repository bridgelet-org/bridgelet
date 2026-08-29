import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmStep } from '@/components/send-form/steps/confirm-step';

vi.mock('@/hooks/use-nfc', () => ({
  useNfc: () => ({
    isSupported: false,
    writeUrl: vi.fn(),
    isWriting: false,
    error: null,
  }),
}));

vi.mock('@/lib/env', () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_API_BASE_URL: 'http://localhost:4000',
    NEXT_PUBLIC_CRYPTO_NETWORK: 'stellar-testnet',
    NEXT_PUBLIC_SUPPORT_EMAIL: 'support@example.com',
  },
}));

let createAccountImpl: () => Promise<any>;
let prepareImpl: () => Promise<any>;

vi.mock('@/lib/create-bridgelet-client', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/create-bridgelet-client')>(
      '@/lib/create-bridgelet-client',
    );
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

vi.mock('@/lib/wallet', async () => {
  const actual = await vi.importActual<typeof import('@/lib/wallet')>('@/lib/wallet');
  return {
    ...actual,
    isFreighterTransactionSigningAvailable: vi.fn().mockReturnValue(false),
    signFreighterTransaction: vi.fn(),
  };
});

const VALID_PUBLIC_KEY = 'G' + 'A'.repeat(55);

const STATE = {
  publicKey: VALID_PUBLIC_KEY,
  recipientName: 'Test Recipient',
  recipientEmail: 'test@example.com',
  amountXlm: '10',
  assetCode: 'XLM',
  memo: 'Thanks!',
  expiresIn: 7 * 24 * 60 * 60,
};

const EXPIRES_AT = new Date('2026-09-04T15:45:00.000Z').toISOString();

const SUCCESS_ACCOUNT = {
  accountId: 'acct_1',
  publicKey: 'G' + 'B'.repeat(55),
  claimUrl: 'https://bridgelet.org/claim/secret-token-abc123',
  amount: '10',
  asset: 'XLM',
  status: 'pending',
  expiresAt: EXPIRES_AT,
  createdAt: new Date().toISOString(),
};

function mockCreateAccount(value: any) {
  createAccountImpl = () => Promise.resolve(value);
}

describe('ConfirmStep — success screen (Issue #422)', () => {
  beforeEach(() => {
    mockCreateAccount(SUCCESS_ACCOUNT);
    prepareImpl = () => Promise.resolve({ unsignedTxXdr: 'AAAA_UNSIGNED' });
  });

  it('displays the full claim URL prominently after a successful send', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ConfirmStep state={STATE} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /confirm & send/i }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/payment sent/i));

    const link = screen.getByRole('link', { name: SUCCESS_ACCOUNT.claimUrl });
    expect(link).toHaveAttribute('href', SUCCESS_ACCOUNT.claimUrl);
  });

  it('offers a one-click copy button for the claim link', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ConfirmStep state={STATE} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /confirm & send/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/payment sent/i));

    // Defined after userEvent.setup(), which installs its own clipboard stub
    // on navigator.clipboard — ours must win so writeText is observable.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await user.click(
      screen.getByRole('button', { name: new RegExp(`copy: ${SUCCESS_ACCOUNT.claimUrl}`, 'i') }),
    );

    expect(writeText).toHaveBeenCalledWith(SUCCESS_ACCOUNT.claimUrl);
    expect(await screen.findByText(/copied!/i)).toBeInTheDocument();
  });

  it('shows the claim link expiration deadline for recipient awareness', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ConfirmStep state={STATE} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /confirm & send/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/payment sent/i));

    const expiry = screen.getByTestId('claim-link-expiry');
    expect(expiry).toHaveTextContent(/expires on/i);
    // The formatted deadline should reflect the year from the server-reported expiresAt.
    expect(expiry).toHaveTextContent('2026');
  });
});

describe('ConfirmStep — QR code for claim link (Issue #423)', () => {
  beforeEach(() => {
    mockCreateAccount(SUCCESS_ACCOUNT);
    prepareImpl = () => Promise.resolve({ unsignedTxXdr: 'AAAA_UNSIGNED' });
  });

  it('reveals a scannable QR code for the claim link on demand', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ConfirmStep state={STATE} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /confirm & send/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/payment sent/i));

    expect(screen.queryByRole('img', { name: new RegExp(SUCCESS_ACCOUNT.claimUrl) })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show qr code/i }));

    const qr = screen.getByRole('img', { name: new RegExp(SUCCESS_ACCOUNT.claimUrl) });
    expect(qr.tagName.toLowerCase()).toBe('svg');
  });
});

describe('ConfirmStep — pending/loading states (Issue #421)', () => {
  it('shows a distinct pending panel and disables Confirm while submitting', async () => {
    let resolveCreate!: (v: unknown) => void;
    createAccountImpl = () => new Promise((resolve) => { resolveCreate = resolve; });
    prepareImpl = () => Promise.resolve({ unsignedTxXdr: 'AAAA_UNSIGNED' });

    const user = userEvent.setup({ delay: null });
    render(<ConfirmStep state={STATE} onBack={vi.fn()} />);

    const confirmButton = screen.getByRole('button', { name: /confirm & send/i });
    await user.click(confirmButton);

    await waitFor(() => expect(screen.getByTestId('submit-pending-state')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /sending|preparing|waiting/i })).toBeDisabled();

    resolveCreate(SUCCESS_ACCOUNT);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/payment sent/i));
    expect(screen.queryByTestId('submit-pending-state')).not.toBeInTheDocument();
  });

  it('rejects submission when the connected wallet address is not a valid Stellar address', async () => {
    const user = userEvent.setup({ delay: null });
    createAccountImpl = () => Promise.resolve(SUCCESS_ACCOUNT);
    prepareImpl = () => Promise.resolve({ unsignedTxXdr: 'AAAA_UNSIGNED' });
    const createAccountSpy = vi.fn(createAccountImpl);
    createAccountImpl = createAccountSpy;

    render(<ConfirmStep state={{ ...STATE, publicKey: 'not-a-valid-address' }} onBack={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /confirm & send/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid/i),
    );
    expect(createAccountSpy).not.toHaveBeenCalled();
  });
});
