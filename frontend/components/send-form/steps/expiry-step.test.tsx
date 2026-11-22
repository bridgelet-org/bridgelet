import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpiryStep } from '@/components/send-form/steps/expiry-step';
import { analytics } from '@/lib/analytics';

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
      screen.getAllByText(/unclaimed funds are returned/i).length,
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
      <ExpiryStep expiresInHours={0} onChange={onChange} onFirstInteraction={vi.fn()} onBack={vi.fn()} onNext={onNext} />,
    );

    const user = userEvent.setup();
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

describe('ExpiryStep Send Form Field Changed (#984)', () => {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(analytics, 'sendFormFieldChanged').mockImplementation(() => undefined);
  });

  afterEach(() => {
    spy.mockRestore();
  });

  function renderStep(onNext = vi.fn(), onBack = vi.fn()) {
    render(
      <ExpiryStep
        expiresInHours={24}
        onChange={vi.fn()}
        onFirstInteraction={vi.fn()}
        onBack={onBack}
        onNext={onNext}
      />,
    );
  }

  it('fires once with expiry_days when focus leaves the radio group', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByLabelText(/3 days/));
    expect(spy).not.toHaveBeenCalled();

    await user.tab(); // focus moves to Back, outside the group
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ fieldName: 'expiration', expiryDays: 3 });
  });

  it('does not fire while focus moves between radios inside the group', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByLabelText(/24 hours/));
    await user.keyboard('{ArrowDown}');

    expect(screen.getByLabelText(/3 days/)).toBeChecked();
    expect(spy).not.toHaveBeenCalled();
  });

  it('reports a change made without any blur when the sender clicks Continue', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    renderStep(onNext);

    await user.click(screen.getByLabelText(/7 days/));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ fieldName: 'expiration', expiryDays: 7 });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('reports a change when the sender goes Back', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderStep(vi.fn(), onBack);

    await user.click(screen.getByLabelText(/3 days/));
    await user.click(screen.getByRole('button', { name: /back/i }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('reports one edit once even when blur and Continue both follow', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByLabelText(/7 days/));
    await user.tab();
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('fires nothing when the choice is changed and then restored', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByLabelText(/7 days/));
    await user.click(screen.getByLabelText(/24 hours/));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(spy).not.toHaveBeenCalled();
  });

  it('fires nothing when Continue is clicked without changing the default', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(spy).not.toHaveBeenCalled();
  });
});
