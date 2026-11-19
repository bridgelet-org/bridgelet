import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfirmStep } from '@/components/send-form/steps/confirm-step';
import type { SendFormState } from '@/components/send-form';
import { analytics } from '@/lib/analytics';

vi.mock('@/hooks/use-nfc', () => ({
  useNfc: () => ({ isSupported: false, writeUrl: vi.fn(), isWriting: false, error: null }),
}));

// ConfirmStep builds a client at module load; the network is never touched here.
vi.mock('@/lib/create-bridgelet-client', () => ({
  BridgeletClient: class {},
  RateLimitError: class extends Error {},
}));

function makeState(overrides: Partial<SendFormState> = {}): SendFormState {
  return {
    publicKey: 'G' + 'A'.repeat(55),
    expiresInHours: 24,
    recipientName: '',
    recipientEmail: '',
    amountXlm: '5',
    assetCode: 'XLM',
    memo: '',
    expiresIn: 24 * 60 * 60,
    ...overrides,
  };
}

describe('ConfirmStep Payment Confirmation Viewed (#986)', () => {
  let viewed: ReturnType<typeof vi.spyOn>;
  let confirmed: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    viewed = vi.spyOn(analytics, 'paymentConfirmationViewed').mockImplementation(() => undefined);
    confirmed = vi.spyOn(analytics, 'paymentConfirmed').mockImplementation(() => undefined);
  });

  afterEach(() => {
    viewed.mockRestore();
    confirmed.mockRestore();
  });

  it('fires once with asset_type and expiry_days when the screen is shown', () => {
    render(
      <ConfirmStep
        state={makeState({ assetCode: 'USDC', expiresInHours: 168 })}
        onBack={vi.fn()}
      />,
    );

    expect(viewed).toHaveBeenCalledTimes(1);
    expect(viewed).toHaveBeenCalledWith({ assetType: 'USDC', expiryDays: 7 });
  });

  it('converts the chosen expiry from hours to days', () => {
    render(<ConfirmStep state={makeState({ expiresInHours: 72 })} onBack={vi.fn()} />);

    expect(viewed).toHaveBeenCalledWith({ assetType: 'XLM', expiryDays: 3 });
  });

  it('does not fire again when the parent re-renders with the same values', () => {
    const { rerender } = render(<ConfirmStep state={makeState()} onBack={vi.fn()} />);
    rerender(<ConfirmStep state={makeState()} onBack={vi.fn()} />);

    expect(viewed).toHaveBeenCalledTimes(1);
  });

  it('is a view event only: it does not also report Payment Confirmed', () => {
    render(<ConfirmStep state={makeState()} onBack={vi.fn()} />);

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(confirmed).not.toHaveBeenCalled();
  });
});
