import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FAQAccordion } from './faq-accordion';

describe('FAQAccordion', () => {
  it('renders the FAQ heading and questions', () => {
    render(<FAQAccordion />);

    expect(screen.getByRole('heading', { name: /frequently asked questions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /what is an ephemeral account\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /do recipients need a wallet\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /what happens if the payment is unclaimed\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /is it safe\?/i })).toBeInTheDocument();
  });

  it('keeps all panels collapsed by default except the first one', () => {
    render(<FAQAccordion />);

    const firstButton = screen.getByRole('button', { name: /what is an ephemeral account\?/i });
    expect(firstButton).toHaveAttribute('aria-expanded', 'true');

    const secondButton = screen.getByRole('button', { name: /do recipients need a wallet\?/i });
    expect(secondButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands and collapses panels on click', async () => {
    const user = userEvent.setup();
    render(<FAQAccordion />);

    const secondButton = screen.getByRole('button', { name: /do recipients need a wallet\?/i });
    await user.click(secondButton);

    expect(secondButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: /do recipients need a wallet\?/i })).toBeVisible();

    await user.click(secondButton);
    expect(secondButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('moves focus with arrow keys and toggles panel with enter', async () => {
    const user = userEvent.setup();
    render(<FAQAccordion />);

    const firstButton = screen.getByRole('button', { name: /what is an ephemeral account\?/i });
    const secondButton = screen.getByRole('button', { name: /do recipients need a wallet\?/i });

    firstButton.focus();
    await user.keyboard('{ArrowDown}');
    expect(secondButton).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(secondButton).toHaveAttribute('aria-expanded', 'true');
  });
});
