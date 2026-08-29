import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DetailsStep, validateDetails } from '@/components/send-form/steps/details-step';
import type { SendFormState } from '@/components/send-form';

const getXlmUsdRate = vi.fn();

vi.mock('@/lib/xlm-price', async () => {
  const actual = await vi.importActual<typeof import('@/lib/xlm-price')>('@/lib/xlm-price');
  return {
    ...actual,
    getXlmUsdRate: () => getXlmUsdRate(),
  };
});

const getAccountBalance = vi.fn();

vi.mock('@/lib/wallet-balance', () => ({
  getAccountBalance: (...args: unknown[]) => getAccountBalance(...args),
}));

const VALID_PUBLIC_KEY = 'G' + 'A'.repeat(55);

const INITIAL_STATE: SendFormState = {
  publicKey: 'GABC', // not a valid Stellar address on purpose — see below
  recipientName: '',
  recipientEmail: '',
  amountXlm: '',
  assetCode: 'XLM',
  memo: '',
  expiresIn: 7 * 24 * 60 * 60,
};

function Harness({
  onNext = vi.fn(),
  onBack = vi.fn(),
  initialState = INITIAL_STATE,
}: {
  onNext?: () => void;
  onBack?: () => void;
  initialState?: SendFormState;
}) {
  const [state, setState] = useState<SendFormState>(initialState);
  return (
    <DetailsStep
      state={state}
      onChange={(patch) => setState((prev) => ({ ...prev, ...patch }))}
      onBack={onBack}
      onNext={onNext}
    />
  );
}

describe('validateDetails — minimum amount (Issue #420)', () => {
  it('rejects an amount below the minimum for the selected asset', () => {
    expect(
      validateDetails({ ...INITIAL_STATE, amountXlm: '0.5', assetCode: 'XLM' }).amountXlm,
    ).toMatch(/minimum amount/i);
  });

  it('accepts an amount at or above the minimum', () => {
    expect(
      validateDetails({ ...INITIAL_STATE, amountXlm: '1', assetCode: 'XLM' }).amountXlm,
    ).toBeUndefined();
    expect(
      validateDetails({ ...INITIAL_STATE, amountXlm: '10', assetCode: 'XLM' }).amountXlm,
    ).toBeUndefined();
  });
});

describe('DetailsStep — sender balance guard (Issue #420)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getXlmUsdRate.mockResolvedValue(0.5);
    getAccountBalance.mockResolvedValue(null);
  });

  it('never queries the balance for a placeholder/invalid wallet key', async () => {
    render(<Harness />);
    await waitFor(() => expect(getXlmUsdRate).toHaveBeenCalled());
    expect(getAccountBalance).not.toHaveBeenCalled();
  });

  it('blocks submission and shows an inline error when the amount exceeds the wallet balance', async () => {
    getAccountBalance.mockResolvedValue(5);
    const onNext = vi.fn();
    const user = userEvent.setup();

    render(
      <Harness onNext={onNext} initialState={{ ...INITIAL_STATE, publicKey: VALID_PUBLIC_KEY }} />,
    );

    await user.type(screen.getByLabelText(/amount/i), '10');
    await waitFor(() => expect(getAccountBalance).toHaveBeenCalledWith(VALID_PUBLIC_KEY, 'XLM'));

    await user.click(screen.getByRole('button', { name: /review payment/i }));

    expect(onNext).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText(/exceeds your wallet balance/i)).toBeInTheDocument(),
    );
  });

  it('allows submission when the amount is within the wallet balance', async () => {
    getAccountBalance.mockResolvedValue(100);
    const onNext = vi.fn();
    const user = userEvent.setup();

    render(
      <Harness onNext={onNext} initialState={{ ...INITIAL_STATE, publicKey: VALID_PUBLIC_KEY }} />,
    );

    await user.type(screen.getByLabelText(/amount/i), '10');
    await waitFor(() => expect(getAccountBalance).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /review payment/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});

describe('DetailsStep — inline validation before submit (Issue #420)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getXlmUsdRate.mockResolvedValue(0.5);
    getAccountBalance.mockResolvedValue(null);
  });

  it('shows the amount error on blur, before any submit attempt', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const amountInput = screen.getByLabelText(/amount/i);
    await user.click(amountInput);
    await user.tab(); // blur without typing anything

    expect(screen.getByRole('alert')).toHaveTextContent(/enter an amount/i);
  });

  it('shows the malformed-email error on blur, before any submit attempt', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/recipient email/i), 'not-an-email');
    await user.tab();

    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
  });
});
