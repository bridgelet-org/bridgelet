import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SharePrompt } from './share-prompt';

vi.mock('./nfc-share-button', () => ({
  NfcShareButton: ({ claimUrl }: { claimUrl: string }) => (
    <button data-testid="nfc-share-button" data-url={claimUrl}>
      NFC Share
    </button>
  ),
}));

const APP_URL = 'https://bridgelet.org/claim?token=abc123';

describe('SharePrompt', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when appUrl is missing, empty, or "not-configured"', () => {
    const { container: c1 } = render(<SharePrompt appUrl={undefined} />);
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(<SharePrompt appUrl="" />);
    expect(c2).toBeEmptyDOMElement();

    const { container: c3 } = render(<SharePrompt appUrl="not-configured" />);
    expect(c3).toBeEmptyDOMElement();
    expect(document.body.textContent).not.toContain('not-configured');
  });

  it('renders the app URL in the code block when valid', () => {
    render(<SharePrompt appUrl={APP_URL} />);
    expect(screen.getByText(APP_URL)).toBeInTheDocument();
  });

  it('renders the promotional heading and description', () => {
    render(<SharePrompt appUrl={APP_URL} />);
    expect(screen.getByText(/do you send payments to your team/i)).toBeInTheDocument();
    expect(screen.getByText(/claim directly from a link/i)).toBeInTheDocument();
  });

  it('renders the Copy link button', () => {
    render(<SharePrompt appUrl={APP_URL} />);
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  it('shows "Copied!" after clicking copy and reverts after 2 s', async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    render(<SharePrompt appUrl={APP_URL} />);
    fireEvent.click(screen.getByRole('button', { name: /copy link/i }));

    await vi.waitFor(() =>
      expect(screen.getByRole('button', { name: /copied!/i })).toBeInTheDocument(),
    );

    vi.advanceTimersByTime(2000);
    await vi.waitFor(() =>
      expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument(),
    );
  });

  it('does not throw when the clipboard API is unavailable', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('not allowed')) },
      configurable: true,
    });
    render(<SharePrompt appUrl={APP_URL} />);

    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /copy link/i })),
    ).not.toThrow();

    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  it('renders a WhatsApp share link with the correct wa.me deep-link', () => {
    render(<SharePrompt appUrl={APP_URL} />);
    const link = screen.getByRole('link', { name: /share on whatsapp/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/?text='));
    expect(link).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(APP_URL)));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders a Share on X link pointing to twitter.com/intent/tweet', () => {
    render(<SharePrompt appUrl={APP_URL} />);
    const link = screen.getByRole('link', { name: /share on x/i });
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('https://twitter.com/intent/tweet'),
    );
    expect(link).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(APP_URL)));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders a Share on LinkedIn link', () => {
    render(<SharePrompt appUrl={APP_URL} />);
    const link = screen.getByRole('link', { name: /share on linkedin/i });
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('linkedin.com/sharing/share-offsite'),
    );
    expect(link).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(APP_URL)));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('passes the appUrl to the NfcShareButton', () => {
    render(<SharePrompt appUrl={APP_URL} />);
    expect(screen.getByTestId('nfc-share-button')).toHaveAttribute('data-url', APP_URL);
  });

  it('opens every external link in a new tab with noopener noreferrer', () => {
    render(<SharePrompt appUrl={APP_URL} />);
    const externalLinks = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('target') === '_blank');
    externalLinks.forEach((link) => {
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    });
  });
});
