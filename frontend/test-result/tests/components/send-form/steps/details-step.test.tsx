import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DetailsStep, validateDetails } from '../../../../../components/send-form/steps/details-step';
import type { SendFormState } from '../../../../../components/send-form';

const getXlmUsdRate = vi.fn();

vi.mock('../../../../../lib/xlm-price', async () => {
  const actual = await vi.importActual<typeof import('../../../../../lib/xlm-price')>(
    '../../../../../lib/xlm-price',
  );
  return {
    ...actual,
    getXlmUsdRate: () => getXlmUsdRate(),
  };
});

const INITIAL_STATE: SendFormState = {
  publicKey: 'GABC',
  recipientName: '',
  recipientEmail: '',
  amountXlm: '',
  assetCode: 'XLM',
  memo: '',
  expiresIn: 7 * 24 * 60 * 60,
};

/**
 * DetailsStep is a controlled component; this harness owns the form state the
 * same way SendForm does so user typing is reflected back into props.
 */
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

describe('validateDetails', () => {
  it('requires an amount greater than 0', () => {
    expect(validateDetails({ ...INITIAL_STATE, amountXlm: '' }).amountXlm).toMatch(/enter an amount/i);
    expect(validateDetails({ ...INITIAL_STATE, amountXlm: '0' }).amountXlm).toMatch(/greater than 0/i);
    expect(validateDetails({ ...INITIAL_STATE, amountXlm: '-5' }).amountXlm).toMatch(/greater than 0/i);
    expect(validateDetails({ ...INITIAL_STATE, amountXlm: '10' }).amountXlm).toBeUndefined();
  });

  it('requires a supported asset', () => {
    expect(validateDetails({ ...INITIAL_STATE, amountXlm: '1', assetCode: '' }).assetCode).toMatch(
      /select an asset/i,
    );
    expect(
      validateDetails({ ...INITIAL_STATE, amountXlm: '1', assetCode: 'DOGE' }).assetCode,
    ).toMatch(/select an asset/i);
    expect(
      validateDetails({ ...INITIAL_STATE, amountXlm: '1', assetCode: 'USDC' }).assetCode,
    ).toBeUndefined();
  });

  it('treats name and email as optional but rejects malformed emails', () => {
    expect(validateDetails({ ...INITIAL_STATE, amountXlm: '1' }).recipientEmail).toBeUndefined();
    expect(
      validateDetails({ ...INITIAL_STATE, amountXlm: '1', recipientEmail: 'not-an-email' })
        .recipientEmail,
    ).toMatch(/valid email/i);
    expect(
      validateDetails({ ...INITIAL_STATE, amountXlm: '1', recipientEmail: 'a@b.co' })
        .recipientEmail,
    ).toBeUndefined();
  });
});

describe('DetailsStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getXlmUsdRate.mockResolvedValue(0.5);
  });

  it('renders optional recipient name and email fields plus amount and asset', async () => {
    render(<Harness />);

    // Flush the mount-time rate fetch so React state settles inside act().
    await act(async () => {});

    expect(screen.getByLabelText(/recipient name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();

    const assetSelect = screen.getByRole('combobox', { name: /asset/i });
    const options = Array.from(assetSelect.querySelectorAll('option')).map((o) => o.value);
    expect(options).toEqual(['XLM', 'USDC']);
  });

  it('blocks submission and shows an error when amount is missing', async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();
    render(<Harness onNext={onNext} />);

    await user.click(screen.getByRole('button', { name: /review payment/i }));

    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/enter an amount/i);
    expect(screen.getByLabelText(/amount/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('blocks submission when amount is 0 or negative', async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();
    render(<Harness onNext={onNext} />);

    await user.type(screen.getByLabelText(/amount/i), '0');
    await user.click(screen.getByRole('button', { name: /review payment/i }));

    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/greater than 0/i);
  });

  it('clears the amount error in real time once corrected', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /review payment/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/enter an amount/i);

    await user.type(screen.getByLabelText(/amount/i), '25');
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('rejects a malformed email but allows an empty one', async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();
    render(<Harness onNext={onNext} />);

    await user.type(screen.getByLabelText(/amount/i), '10');
    await user.type(screen.getByLabelText(/recipient email/i), 'nope');
    await user.click(screen.getByRole('button', { name: /review payment/i }));

    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i);

    await user.clear(screen.getByLabelText(/recipient email/i));
    await user.click(screen.getByRole('button', { name: /review payment/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('proceeds with valid amount, asset and no recipient details', async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();
    render(<Harness onNext={onNext} />);

    await user.type(screen.getByLabelText(/amount/i), '12.5');
    await user.selectOptions(screen.getByRole('combobox', { name: /asset/i }), 'USDC');
    await user.click(screen.getByRole('button', { name: /review payment/i }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('shows a real-time USD conversion for XLM amounts', async () => {
    getXlmUsdRate.mockResolvedValue(0.5);
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/amount/i), '10');

    // 10 XLM × $0.50 = $5.00
    await waitFor(() => expect(screen.getByText(/\$5\.00/)).toBeInTheDocument());
  });

  it('updates the conversion as the amount changes', async () => {
    getXlmUsdRate.mockResolvedValue(0.5);
    const user = userEvent.setup();
    render(<Harness />);

    const amountInput = screen.getByLabelText(/amount/i);
    await user.type(amountInput, '10');
    await waitFor(() => expect(screen.getByText(/\$5\.00/)).toBeInTheDocument());

    await user.clear(amountInput);
    await user.type(amountInput, '20');
    await waitFor(() => expect(screen.getByText(/\$10\.00/)).toBeInTheDocument());
  });

  it('hides the conversion when the asset is USDC', async () => {
    getXlmUsdRate.mockResolvedValue(0.5);
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/amount/i), '10');
    await waitFor(() => expect(screen.getByText(/\$5\.00/)).toBeInTheDocument());

    await user.selectOptions(screen.getByRole('combobox', { name: /asset/i }), 'USDC');
    expect(screen.queryByText(/\$5\.00/)).not.toBeInTheDocument();
  });

  it('hides the conversion when the rate is unavailable', async () => {
    getXlmUsdRate.mockResolvedValue(0);
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/amount/i), '10');
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
  });

  it('calls onBack when the Back button is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<Harness onBack={onBack} />);

    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
