import { render, screen } from '@testing-library/react';
import { SharePrompt } from './share-prompt';

describe('SharePrompt', () => {
  it('renders WhatsApp share link with wa.me deep link format', () => {
    const testUrl = 'https://bridgelet.org/claim?token=123';
    render(<SharePrompt appUrl={testUrl} />);

    const whatsappLink = screen.getByRole('link', { name: /share on whatsapp/i });
    expect(whatsappLink).toBeInTheDocument();
    expect(whatsappLink).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/?text=')
    );
    expect(whatsappLink).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent(testUrl))
    );
  });
});
