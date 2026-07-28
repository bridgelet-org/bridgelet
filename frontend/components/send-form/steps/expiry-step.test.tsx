import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpiryStep } from '@/components/send-form/steps/expiry-step';

describe('ExpiryStep', () => {
  it('renders expiry options and selects 7 days by default', () => {
    render(<ExpiryStep expiresIn={7 * 24 * 60 * 60} onChange={vi.fn()} onBack={vi.fn()} onNext={vi.fn()} />);

    expect(screen.getByLabelText(/24 hours/)).toBeInTheDocument();
    expect(screen.getByLabelText(/7 days/)).toBeInTheDocument();
    expect(screen.getByLabelText(/30 days/)).toBeInTheDocument();
    expect(screen.getByLabelText(/custom/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/7 days/)).toBeChecked();
  });

  it('shows a warning about unclaimed funds', () => {
    render(<ExpiryStep expiresIn={7 * 24 * 60 * 60} onChange={vi.fn()} onBack={vi.fn()} onNext={vi.fn()} />);

    const warningElements = screen.getAllByText(/unclaimed funds are automatically returned/i);
    expect(warningElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('alert')).toHaveTextContent(/unclaimed funds are automatically returned/i);
  });

  it('calls onChange with the selected preset seconds', async () => {
    const onChange = vi.fn();
    render(<ExpiryStep expiresIn={7 * 24 * 60 * 60} onChange={onChange} onBack={vi.fn()} onNext={vi.fn()} />);

    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/30 days/));
    expect(onChange).toHaveBeenCalledWith(30 * 24 * 60 * 60);
  });

  it('shows custom days input when custom is selected', async () => {
    render(<ExpiryStep expiresIn={7 * 24 * 60 * 60} onChange={vi.fn()} onBack={vi.fn()} onNext={vi.fn()} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: /custom/i }));

    expect(screen.getByLabelText(/number of days/i)).toBeInTheDocument();
  });

  it('calls onChange with custom days converted to seconds', async () => {
    const onChange = vi.fn();
    render(<ExpiryStep expiresIn={7 * 24 * 60 * 60} onChange={onChange} onBack={vi.fn()} onNext={vi.fn()} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: /custom/i }));
    const input = screen.getByLabelText(/number of days/i);
    await user.clear(input);
    await user.type(input, '14');

    expect(onChange).toHaveBeenCalledWith(14 * 24 * 60 * 60);
  });

  it('calls onNext when form is submitted', async () => {
    const onNext = vi.fn();
    render(<ExpiryStep expiresIn={7 * 24 * 60 * 60} onChange={vi.fn()} onBack={vi.fn()} onNext={onNext} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn();
    render(<ExpiryStep expiresIn={7 * 24 * 60 * 60} onChange={vi.fn()} onBack={onBack} onNext={vi.fn()} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
