import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { NfcShareButton } from './nfc-share-button';

describe('NfcShareButton', () => {
  it('renders NFC share button and unsupported notice when NDEFReader is not present', () => {
    render(<NfcShareButton claimUrl="https://bridgelet.org/claim?token=456" />);

    const button = screen.getByRole('button', { name: /Share via NFC Tap/i });
    expect(button).toBeInTheDocument();

    const notice = screen.getByText(/NFC sharing requires Web NFC \(Android Chrome\)/i);
    expect(notice).toBeInTheDocument();
  });
});
