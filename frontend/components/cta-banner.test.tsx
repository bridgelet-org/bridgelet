import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CTABanner } from './cta-banner';

describe('CTABanner', () => {
  it('renders the headline', () => {
    render(<CTABanner />);
    expect(screen.getByRole('heading', { name: /integrate bridgelet today/i })).toBeInTheDocument();
  });

  it('renders a "View on GitHub" link pointing to the repo', () => {
    render(<CTABanner />);
    const link = screen.getByRole('link', { name: /view on github/i });
    expect(link).toHaveAttribute('href', 'https://github.com/bridgelet-org/bridgelet');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders a "Read the Docs" link', () => {
    render(<CTABanner />);
    const link = screen.getByRole('link', { name: /read the docs/i });
    expect(link).toHaveAttribute('href', '/docs');
  });

  it('has an accessible section label', () => {
    render(<CTABanner />);
    expect(screen.getByRole('region', { name: /integrate bridgelet today/i })).toBeInTheDocument();
  });
});
