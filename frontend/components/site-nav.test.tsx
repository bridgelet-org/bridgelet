import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ThemeProvider } from './theme-provider';
import { SiteNav } from './site-nav';

const mockPathname = vi.fn(() => '/');
vi.mock('next/navigation', () => ({ usePathname: () => mockPathname() }));

function renderNav(pathname = '/') {
  mockPathname.mockReturnValue(pathname);
  return render(
    <ThemeProvider>
      <SiteNav />
    </ThemeProvider>,
  );
}

describe('SiteNav', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    );
  });

  it('renders the four nav links and the home logo link', () => {
    renderNav();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const label of ['Home', 'Send', 'Docs', 'GitHub']) {
      expect(within(nav).getAllByRole('link', { name: label }).length).toBeGreaterThan(0);
    }
    expect(within(nav).getByRole('link', { name: 'Bridgelet home' })).toBeInTheDocument();
  });

  it('marks the link matching the current route as the active page', () => {
    renderNav('/send');
    const [send] = screen.getAllByRole('link', { name: 'Send' });
    const [home] = screen.getAllByRole('link', { name: 'Home' });
    expect(send).toHaveAttribute('aria-current', 'page');
    expect(home).not.toHaveAttribute('aria-current');
  });

  it('opens external links safely in a new tab', () => {
    renderNav();
    const [docs] = screen.getAllByRole('link', { name: 'Docs' });
    expect(docs).toHaveAttribute('target', '_blank');
    expect(docs).toHaveAttribute('rel', 'noopener noreferrer');
    expect(docs).not.toHaveAttribute('aria-current');
  });

  it('toggles the mobile menu from the hamburger button', () => {
    renderNav();
    const button = screen.getByRole('button', { name: 'Open menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
  });

  it('closes the mobile menu when Escape is pressed', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
  });

  it('closes the mobile menu on a click outside the nav', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
  });

  it('keeps the menu open when clicking inside the nav', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.mouseDown(screen.getByTestId('mobile-menu'));
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
  });

  it('closes the mobile menu after following a link', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const menu = screen.getByTestId('mobile-menu');
    fireEvent.click(within(menu).getByRole('link', { name: 'Send' }));
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
  });
});
