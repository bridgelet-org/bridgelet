import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopyToClipboard } from './copy-to-clipboard';

const CLAIM_URL = 'https://bridgelet.org/claim/secret-token-abc123';

describe('CopyToClipboard (Issue #422)', () => {
  it('copies the value to the clipboard on click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<CopyToClipboard value={CLAIM_URL} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(CLAIM_URL));
  });

  it('shows a "Copied!" confirmation after a successful copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<CopyToClipboard value={CLAIM_URL} />);
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText(/copied!/i)).toBeInTheDocument();
  });

  it('falls back to document.execCommand when the Clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('not allowed')) },
      configurable: true,
    });
    const execCommandSpy = vi.fn().mockReturnValue(true);
    // jsdom doesn't implement execCommand — define it before spying is possible.
    document.execCommand = execCommandSpy;

    render(<CopyToClipboard value={CLAIM_URL} />);

    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
    await waitFor(() => expect(execCommandSpy).toHaveBeenCalledWith('copy'));
  });

  it('exposes an accessible label that names the copied value', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    render(<CopyToClipboard value={CLAIM_URL} />);
    expect(screen.getByRole('button', { name: new RegExp(CLAIM_URL) })).toBeInTheDocument();
  });
});
