import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { HowItWorks } from './how-it-works';

describe('HowItWorks', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the heading and all three steps', () => {
    render(<HowItWorks intervalMs={999999} />);
    expect(screen.getByRole('heading', { name: 'How It Works' })).toBeInTheDocument();
    expect(screen.getAllByText('Sender creates ephemeral account').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Recipient claims via link')).toBeInTheDocument();
    expect(screen.getByText('Funds sweep to permanent wallet')).toBeInTheDocument();
  });

  it('uses list semantics with aria-labels on each step', () => {
    render(<HowItWorks intervalMs={999999} />);
    const list = screen.getByRole('list', { name: /how it works steps/i });
    expect(list).toBeInTheDocument();

    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    expect(screen.getByLabelText(/step 1: sender creates ephemeral account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/step 2: recipient claims via link/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/step 3: funds sweep to permanent wallet/i)).toBeInTheDocument();
  });

  it('sets the first step as current by default', () => {
    render(<HowItWorks intervalMs={999999} />);
    expect(screen.getByLabelText(/step 1: sender creates ephemeral account/i)).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('rotates the active step after the interval', async () => {
    vi.useFakeTimers();
    render(<HowItWorks intervalMs={1000} />);
    expect(screen.getByLabelText(/step 1: sender creates ephemeral account/i)).toHaveAttribute('aria-current', 'step');

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByLabelText(/step 2: recipient claims via link/i)).toHaveAttribute('aria-current', 'step');

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByLabelText(/step 3: funds sweep to permanent wallet/i)).toHaveAttribute('aria-current', 'step');

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByLabelText(/step 1: sender creates ephemeral account/i)).toHaveAttribute('aria-current', 'step');
  });

  it('announces the active step in a live region', () => {
    const { container } = render(<HowItWorks intervalMs={999999} />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveTextContent('Sender creates ephemeral account');
  });
});
