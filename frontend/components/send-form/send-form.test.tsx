import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SendForm } from './index';
import { analytics } from '@/lib/analytics';

// ── Step component stubs ─────────────────────────────────────────────────────

vi.mock('./steps/connect-step', () => ({
  ConnectStep: ({ onConnected }: { onConnected: (key: string) => void }) => (
    <div>
      <span>Connect step</span>
      <button onClick={() => onConnected('G' + 'A'.repeat(55))}>Mock Connect</button>
    </div>
  ),
}));

vi.mock('./steps/expiry-step', () => ({
  ExpiryStep: ({
    onBack,
    onNext,
    onChange,
  }: {
    onBack: () => void;
    onNext: () => void;
    onChange: (hours: number) => void;
  }) => (
    <div>
      <span>Expiry step</span>
      <button onClick={() => onChange(168)}>Pick 7 days</button>
      <button onClick={onBack}>Back</button>
      <button onClick={onNext}>Continue</button>
    </div>
  ),
}));

vi.mock('./steps/details-step', () => ({
  DetailsStep: ({
    onBack,
    onNext,
    onChange,
  }: {
    onBack: () => void;
    onNext: () => void;
    onChange: (patch: Record<string, string>) => void;
  }) => (
    <div>
      <span>Details step</span>
      <button
        onClick={() => onChange({ recipientName: 'Amina', memo: 'Invoice 42', assetCode: 'USDC' })}
      >
        Fill details
      </button>
      <button onClick={onBack}>Back</button>
      <button onClick={onNext}>Continue</button>
    </div>
  ),
}));

vi.mock('./steps/confirm-step', () => ({
  ConfirmStep: ({ onBack }: { onBack: () => void }) => (
    <div>
      <span>Confirm step</span>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

describe('SendForm', () => {
  // ── Initial render ─────────────────────────────────────────────────────────

  it('starts on the connect step with the correct heading', () => {
    render(<SendForm />);
    expect(screen.getByText('Connect step')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /step 1 of 4/i })).toBeInTheDocument();
  });

  it('renders the step breadcrumb nav with 4 items', () => {
    render(<SendForm />);
    expect(
      screen.getByRole('navigation', { name: /create ephemeral account progress/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('marks only the current step with aria-current="step"', () => {
    render(<SendForm />);
    // sr-only "(current)" appears exactly once
    expect(screen.getAllByText(/\(current\)/)).toHaveLength(1);
  });

  // ── Forward navigation ─────────────────────────────────────────────────────

  it('advances to expiry when wallet is connected', async () => {
    const user = userEvent.setup();
    render(<SendForm />);

    await user.click(screen.getByRole('button', { name: 'Mock Connect' }));

    expect(screen.getByText('Expiry step')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /step 2 of 4/i })).toBeInTheDocument();
  });

  it('advances to details after expiry Continue', async () => {
    const user = userEvent.setup();
    render(<SendForm />);

    await user.click(screen.getByRole('button', { name: 'Mock Connect' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Details step')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /step 3 of 4/i })).toBeInTheDocument();
  });

  it('advances to confirm after details Continue', async () => {
    const user = userEvent.setup();
    render(<SendForm />);

    await user.click(screen.getByRole('button', { name: 'Mock Connect' }));
    await user.click(screen.getByRole('button', { name: 'Continue' })); // expiry
    await user.click(screen.getByRole('button', { name: 'Continue' })); // details

    expect(screen.getByText('Confirm step')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /step 4 of 4/i })).toBeInTheDocument();
  });

  // ── Back navigation ────────────────────────────────────────────────────────

  it('goes back from expiry to connect', async () => {
    const user = userEvent.setup();
    render(<SendForm />);

    await user.click(screen.getByRole('button', { name: 'Mock Connect' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByText('Connect step')).toBeInTheDocument();
  });

  it('goes back from details to expiry', async () => {
    const user = userEvent.setup();
    render(<SendForm />);

    await user.click(screen.getByRole('button', { name: 'Mock Connect' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByText('Expiry step')).toBeInTheDocument();
  });

  it('goes back from confirm to details', async () => {
    const user = userEvent.setup();
    render(<SendForm />);

    await user.click(screen.getByRole('button', { name: 'Mock Connect' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByText('Details step')).toBeInTheDocument();
  });

  // ── Breadcrumb state ───────────────────────────────────────────────────────

  it('marks completed steps with sr-only "(complete)" after advancing', async () => {
    const user = userEvent.setup();
    render(<SendForm />);

    await user.click(screen.getByRole('button', { name: 'Mock Connect' }));
    // Step 1 (Connect) is now done
    expect(screen.getAllByText(/\(complete\)/)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    // Steps 1 and 2 are done
    expect(screen.getAllByText(/\(complete\)/)).toHaveLength(2);
  });

  // ── Focus management ───────────────────────────────────────────────────────

  it('moves focus to the step heading when the step changes', async () => {
    const user = userEvent.setup();
    render(<SendForm />);

    await user.click(screen.getByRole('button', { name: 'Mock Connect' }));

    await waitFor(() => {
      const heading = screen.getByRole('heading', { name: /step 2 of 4/i });
      expect(document.activeElement).toBe(heading);
    });
  });
});

describe('SendForm Send Form Completed (#985)', () => {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(analytics, 'sendFormCompleted').mockImplementation(() => undefined);
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('fires with the spec payload when the sender continues from the details step', async () => {
    const user = userEvent.setup();
    render(<SendForm />);

    await user.click(screen.getByRole('button', { name: 'Mock Connect' }));
    await user.click(screen.getByRole('button', { name: 'Pick 7 days' }));
    await user.click(screen.getByRole('button', { name: 'Continue' })); // expiry
    await user.click(screen.getByRole('button', { name: 'Fill details' }));
    await user.click(screen.getByRole('button', { name: 'Continue' })); // details

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      assetType: 'USDC',
      expiryDays: 7,
      hasRecipientName: true,
      hasMessage: true,
    });
  });

  it('reports the optional recipient name and message as absent when left blank', async () => {
    const user = userEvent.setup();
    render(<SendForm />);

    await user.click(screen.getByRole('button', { name: 'Mock Connect' }));
    await user.click(screen.getByRole('button', { name: 'Continue' })); // expiry
    await user.click(screen.getByRole('button', { name: 'Continue' })); // details

    expect(spy).toHaveBeenCalledWith({
      assetType: 'XLM',
      expiryDays: 1,
      hasRecipientName: false,
      hasMessage: false,
    });
  });

  it('does not fire before the details step is completed', async () => {
    const user = userEvent.setup();
    render(<SendForm />);

    await user.click(screen.getByRole('button', { name: 'Mock Connect' }));
    await user.click(screen.getByRole('button', { name: 'Continue' })); // expiry -> details

    expect(screen.getByText('Details step')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not fire when the sender goes back from the details step', async () => {
    const user = userEvent.setup();
    render(<SendForm />);

    await user.click(screen.getByRole('button', { name: 'Mock Connect' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(spy).not.toHaveBeenCalled();
  });
});
