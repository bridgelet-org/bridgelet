import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  it('renders a footer landmark', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders the project name', () => {
    render(<SiteFooter />);
    expect(screen.getByText('bridgelet')).toBeInTheDocument();
  });

  it('renders the MIT license note', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/released under the mit license/i)).toBeInTheDocument();
  });

  it('renders the Stellar ecosystem tagline', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/built for the stellar ecosystem/i)).toBeInTheDocument();
  });

  it('renders a GitHub link pointing to the repo', () => {
    render(<SiteFooter />);
    const link = screen.getByRole('link', { name: /github/i });
    expect(link).toHaveAttribute('href', 'https://github.com/bridgelet-org/bridgelet');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders a Docs link', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: /docs/i })).toHaveAttribute('href', '/docs');
  });

  it('renders a Security Policy link', () => {
    render(<SiteFooter />);
    const link = screen.getByRole('link', { name: /security policy/i });
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/bridgelet-org/bridgelet/blob/main/SECURITY.md',
    );
  });

  it('renders a Contributing link', () => {
    render(<SiteFooter />);
    const link = screen.getByRole('link', { name: /contributing/i });
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/bridgelet-org/bridgelet/blob/main/CONTRIBUTING.md',
    );
  });
});
