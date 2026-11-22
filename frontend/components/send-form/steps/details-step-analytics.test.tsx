import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DetailsStep } from '@/components/send-form/steps/details-step';
import type { SendFormState } from '@/components/send-form';
import { analytics } from '@/lib/analytics';

vi.mock('@/lib/xlm-price', () => ({
  getXlmUsdRate: vi.fn().mockResolvedValue(0.1),
  formatFiat: (xlm: number, rate: number) => `$${(xlm * rate).toFixed(2)}`,
}));

// Offer a second asset so the asset select has something to change to.
vi.mock('@/lib/bridgelet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/bridgelet')>();
  return {
    ...actual,
    supportedAssetCodes: () => ['XLM', 'USDC'],
    isAssetAvailable: () => true,
  };
});

const INITIAL: SendFormState = {
  publicKey: 'G' + 'A'.repeat(55),
  expiresInHours: 24,
  recipientName: '',
  recipientEmail: '',
  amountXlm: '',
  assetCode: 'XLM',
  memo: '',
  expiresIn: 24 * 60 * 60,
};

// A real controlled parent: the field's DOM value only changes if state does.
function Harness() {
  const [state, setState] = useState<SendFormState>(INITIAL);
  return (
    <DetailsStep
      state={state}
      onChange={(patch) => setState((prev) => ({ ...prev, ...patch }))}
      onFirstInteraction={vi.fn()}
      onBack={vi.fn()}
      onNext={vi.fn()}
    />
  );
}

describe('DetailsStep Send Form Field Changed (#984)', () => {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(analytics, 'sendFormFieldChanged').mockImplementation(() => undefined);
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('does not fire on keystrokes, only once focus leaves the field', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText('Amount'));
    await user.keyboard('125');
    expect(spy).not.toHaveBeenCalled();

    await user.tab();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ fieldName: 'amount', assetType: undefined });
  });

  it('fires nothing when a field is focused and left untouched', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText('Amount'));
    await user.tab();

    expect(spy).not.toHaveBeenCalled();
  });

  it('fires nothing when the value is edited back to what it was', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText(/memo/i));
    await user.keyboard('a');
    await user.keyboard('{Backspace}');
    await user.tab();

    expect(spy).not.toHaveBeenCalled();
  });

  it('maps the recipient name input to recipient_name', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText(/recipient name/i));
    await user.keyboard('Amina');
    await user.tab();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toMatchObject({ fieldName: 'recipient_name' });
  });

  it('maps the memo input to message', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText(/memo/i));
    await user.keyboard('Invoice 42');
    await user.tab();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toMatchObject({ fieldName: 'message' });
  });

  it('reports the newly selected asset for the asset select', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.selectOptions(screen.getByLabelText('Asset'), 'USDC');
    await user.tab();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ fieldName: 'asset', assetType: 'USDC' });
  });

  it('does not track the recipient email field (PII, not in the spec)', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText(/recipient email/i));
    await user.keyboard('amina@example.com');
    await user.tab();

    expect(spy).not.toHaveBeenCalled();
  });

  it('never passes the entered amount to the analytics layer', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText('Amount'));
    await user.keyboard('987654');
    await user.tab();

    expect(JSON.stringify(spy.mock.calls)).not.toContain('987654');
  });
});
