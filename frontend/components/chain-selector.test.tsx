import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChainSelector } from './chain-selector';

describe('ChainSelector', () => {
  // ── Stellar (supported) ────────────────────────────────────────────────────

  it('renders Stellar as the supported active network', () => {
    render(<ChainSelector selectedChainId="stellar" />);
    const option = screen.getByRole('option', { name: /Stellar \(XLM\)/i });
    expect(option).toBeInTheDocument();
    expect(option).not.toBeDisabled();
  });

  it('defaults to Stellar when selectedChainId is omitted', () => {
    render(<ChainSelector />);
    const select = screen.getByRole('combobox');
    expect((select as HTMLSelectElement).value).toBe('stellar');
  });

  // ── Coming-soon chains (disabled) ─────────────────────────────────────────

  it('renders Ethereum as a disabled Coming Soon stub', () => {
    render(<ChainSelector selectedChainId="stellar" />);
    const option = screen.getByRole('option', { name: /Ethereum \(ETH\) \[Coming Soon\]/i });
    expect(option).toBeInTheDocument();
    expect(option).toBeDisabled();
  });

  it('renders Polygon as a disabled Coming Soon stub', () => {
    render(<ChainSelector selectedChainId="stellar" />);
    const option = screen.getByRole('option', { name: /Polygon \(MATIC\) \[Coming Soon\]/i });
    expect(option).toBeInTheDocument();
    expect(option).toBeDisabled();
  });

  it('renders Soroban as a disabled Coming Soon stub', () => {
    render(<ChainSelector selectedChainId="stellar" />);
    const option = screen.getByRole('option', { name: /Soroban Smart Contracts \(XLM\) \[Coming Soon\]/i });
    expect(option).toBeInTheDocument();
    expect(option).toBeDisabled();
  });

  // ── label prop ────────────────────────────────────────────────────────────

  it('renders the default label when no label prop is supplied', () => {
    render(<ChainSelector />);
    expect(screen.getByText(/select network \/ chain/i)).toBeInTheDocument();
  });

  it('renders a custom label when provided', () => {
    render(<ChainSelector label="Blockchain network" />);
    expect(screen.getByText('Blockchain network')).toBeInTheDocument();
  });

  // ── onSelectChain callback ─────────────────────────────────────────────────

  it('calls onSelectChain with the selected chain id on change', async () => {
    const onSelectChain = vi.fn();
    const user = userEvent.setup();
    render(<ChainSelector selectedChainId="stellar" onSelectChain={onSelectChain} />);

    // Attempt to change: only Stellar is actually enabled, but the event still fires.
    await user.selectOptions(screen.getByRole('combobox'), 'stellar');
    expect(onSelectChain).toHaveBeenCalledWith('stellar');
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  it('associates the label with the select via htmlFor/id', () => {
    render(<ChainSelector />);
    const label = screen.getByText(/select network/i);
    const select = screen.getByRole('combobox');
    expect(label).toHaveAttribute('for', select.id);
  });

  // ── Description text ──────────────────────────────────────────────────────

  it('renders the multi-chain coming-soon description', () => {
    render(<ChainSelector />);
    expect(
      screen.getByText(/bridgelet currently operates on the/i),
    ).toBeInTheDocument();
  });
});
