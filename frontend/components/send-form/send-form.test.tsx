import { beforeEach, describe, it, expect, vi } from 'vitest';
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
  ExpiryStep: ({ onBack, onNext }: { onBack: () => void; onNext: () => void }) => (
    <div>
      <span>Expiry step</span>
      <button onClick={onBack}>Back</button>
      <button onClick={onNext}>Continue</button>
    </div>
  ),
}));

vi.mock('./steps/details-step', () => ({
  DetailsStep: ({ onBack, onNext }: { onBack: () => void; onNext: () => void }) => (
    <div>
      <span>Details step</span>
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

// ── Analytics mock ──────────────────────────────────────────────────────────

vi.mock('@/lib/analytics', () => ({
  analytics: {
    sendFormViewed: vi.fn(),
    sendFormCompleted: vi.fn(),
  },
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

  // ── Analytics (#772) ──────────────────────────────────────────────────────

  describe('Send Form Viewed (spec 4.2, issue #772)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('fires analytics.sendFormViewed exactly once when the form is displayed', () => {
      render(<SendForm />);

      expect(analytics.sendFormViewed).toHaveBeenCalledTimes(1);
    });

    it('does not re-fire sendFormViewed on step transitions', async () => {
      const user = userEvent.setup();
      render(<SendForm />);

      await user.click(screen.getByRole('button', { name: 'Mock Connect' }));
      await user.click(screen.getByRole('button', { name: 'Continue' })); // expiry
      await user.click(screen.getByRole('button', { name: 'Continue' })); // details
      await user.click(screen.getByRole('button', { name: 'Back' })); // back to details

      expect(screen.getByText('Details step')).toBeInTheDocument();
      expect(analytics.sendFormViewed).toHaveBeenCalledTimes(1);
    });
  });
});
