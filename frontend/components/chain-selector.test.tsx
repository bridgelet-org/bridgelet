import { render, screen } from '@testing-library/react';
import { ChainSelector } from './chain-selector';

describe('ChainSelector', () => {
  it('renders Stellar as supported active network', () => {
    render(<ChainSelector selectedChainId="stellar" />);
    const option = screen.getByRole('option', { name: /Stellar \(XLM\)/i });
    expect(option).toBeInTheDocument();
    expect(option).not.toBeDisabled();
  });

  it('renders future EVM and Soroban chains as disabled stubs with Coming Soon badges', () => {
    render(<ChainSelector selectedChainId="stellar" />);
    const ethOption = screen.getByRole('option', { name: /Ethereum \(ETH\) — \[Coming Soon\]/i });
    expect(ethOption).toBeInTheDocument();
    expect(ethOption).toBeDisabled();

    const polygonOption = screen.getByRole('option', { name: /Polygon \(MATIC\) — \[Coming Soon\]/i });
    expect(polygonOption).toBeInTheDocument();
    expect(polygonOption).toBeDisabled();
  });
});
