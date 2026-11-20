import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DetailsStep, validateDetails } from '@/components/send-form/steps/details-step';
import type { SendFormState } from '@/components/send-form';

vi.mock('@/lib/xlm-price', () => ({
  getXlmUsdRate: vi.fn().mockResolvedValue(0.1),
  formatFiat: (xlm: number, rate: number) => `$${(xlm * rate).toFixed(2)}`,
}));

function makeState(overrides: Partial<SendFormState> = {}): SendFormState {
  return {
    publicKey: 'G' + 'A'.repeat(55),
    expiresInHours: 24,
    recipientName: '',
    recipientEmail: '',
    amountXlm: '',
    assetCode: 'XLM',
    memo: '',
    expiresIn: 24 * 60 * 60,
    ...overrides,
  };
}

describe('validateDetails (#763)', () => {
  it('accepts an empty email', () => {
    expect(validateDetails(makeState({ amountXlm: '5' })).recipientEmail).toBeUndefined();
  });

  it('still flags a malformed email when one is provided', () => {
    expect(
      validateDetails(makeState({ amountXlm: '5', recipientEmail: 'nope' })).recipientEmail,
    ).toMatch(/valid email/i);
  });
});

describe('DetailsStep (#763)', () => {
  it('advances without an email when the amount is valid', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<DetailsStep state={makeState({ amountXlm: '5' })} onChange={vi.fn()} onFirstInteraction={vi.fn()} onBack={vi.fn()} onNext={onNext} />);

    await user.click(screen.getByRole('button', { name: /review payment/i }));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('blocks submission and explains when the email is malformed', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(
      <DetailsStep
        state={makeState({ amountXlm: '5', recipientEmail: 'nope' })}
        onChange={vi.fn()}
        onFirstInteraction={vi.fn()}
        onBack={vi.fn()}
        onNext={onNext}
      />,
    );

    await user.click(screen.getByRole('button', { name: /review payment/i }));

    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').map((el) => el.textContent).join(' ')).toMatch(
      /valid email address/i,
    );
  });

  it('blocks submission when the amount is missing', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<DetailsStep state={makeState()} onChange={vi.fn()} onFirstInteraction={vi.fn()} onBack={vi.fn()} onNext={onNext} />);

    await user.click(screen.getByRole('button', { name: /review payment/i }));

    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').map((el) => el.textContent).join(' ')).toMatch(
      /enter an amount/i,
    );
  });

  it('advances when both the email and amount are valid', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(
      <DetailsStep
        state={makeState({ amountXlm: '5', recipientEmail: 'amina@example.com' })}
        onChange={vi.fn()}
        onFirstInteraction={vi.fn()}
        onBack={vi.fn()}
        onNext={onNext}
      />,
    );

    await user.click(screen.getByRole('button', { name: /review payment/i }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('reports the field the sender first interacted with', async () => {
    const user = userEvent.setup();
    const onFirstInteraction = vi.fn();
    render(
      <DetailsStep
        state={makeState()}
        onChange={vi.fn()}
        onFirstInteraction={onFirstInteraction}
        onBack={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/recipient name/i), 'A');
    expect(onFirstInteraction).toHaveBeenLastCalledWith('recipient_name');

    await user.type(screen.getByLabelText(/^amount$/i), '5');
    expect(onFirstInteraction).toHaveBeenLastCalledWith('amount');

    await user.selectOptions(screen.getByLabelText('Asset'), 'XLM');
    expect(onFirstInteraction).toHaveBeenLastCalledWith('asset');

    await user.type(screen.getByLabelText(/memo/i), 'hi');
    expect(onFirstInteraction).toHaveBeenLastCalledWith('message');
  });
});
