import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpiryStep } from '@/components/send-form/steps/expiry-step';

describe('ExpiryStep', () => {
  it('renders expiry options and selects the initial value', () => {
    render(
      <ExpiryStep expiresInHours={24} onChange={vi.fn()} onFirstInteraction={vi.fn()} onBack={vi.fn()} onNext={vi.fn()} />,
    );

    expect(screen.getByLabelText(/24 hours/)).toBeInTheDocument();
    expect(screen.getByLabelText(/3 days/)).toBeInTheDocument();
    expect(screen.getByLabelText(/7 days/)).toBeInTheDocument();
    expect(screen.getByLabelText(/24 hours/)).toBeChecked();
  });

  it('shows a note about unclaimed funds', () => {
    render(
      <ExpiryStep expiresInHours={24} onChange={vi.fn()} onFirstInteraction={vi.fn()} onBack={vi.fn()} onNext={vi.fn()} />,
    );

    expect(
      screen.getAllByText(/unclaimed funds are automatically returned/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('calls onChange then onNext with the selected expiry in hours', async () => {
    const onChange = vi.fn();
    const onNext = vi.fn();
    render(
      <ExpiryStep expiresInHours={24} onChange={onChange} onFirstInteraction={vi.fn()} onBack={vi.fn()} onNext={onNext} />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/3 days/));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(onChange).toHaveBeenCalledWith(72);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('shows an error and does not continue when no preset is selected', async () => {
    const onChange = vi.fn();
    const onNext = vi.fn();
    render(
      <ExpiryStep expiresInHours={24} onChange={onChange} onFirstInteraction={vi.fn()} onBack={vi.fn()} onNext={onNext} />,
    );

    const user = userEvent.setup();
    // Unselect the default option, then attempt to continue without a selection.
    await user.click(screen.getByLabelText(/24 hours/));
    await user.click(screen.getByLabelText(/3 days/));
    await user.click(screen.getByLabelText(/24 hours/));
    const preset = screen.getByLabelText(/24 hours/) as HTMLInputElement;
    preset.checked = false;
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/choose how long/i);
    expect(onChange).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn();
    render(
      <ExpiryStep expiresInHours={24} onChange={vi.fn()} onFirstInteraction={vi.fn()} onBack={onBack} onNext={vi.fn()} />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});