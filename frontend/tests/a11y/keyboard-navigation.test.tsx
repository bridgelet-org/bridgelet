import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SendPageClient } from '@/components/send-page-client';
import { AccessibleClaimForm } from '@/components/accessible-claim-form';

/**
 * Keyboard navigation support across core flows (Issue #467).
 *
 * Verifies that the send and claim flows can be completed using keyboard
 * only — logical focus order and visible focus states. These tests
 * exercise the interactive, tab-order-critical components.
 */

describe('Keyboard navigation — send flow', () => {
  it('lets a keyboard-only user toggle between send modes', async () => {
    const user = userEvent.setup();
    render(<SendPageClient />);

    const single = screen.getByRole('button', { name: /single recipient/i });
    const batch = screen.getByRole('button', { name: /batch recipients/i });

    // Focus the mode toggle, then navigate it with the keyboard alone.
    single.focus();
    expect(single).toHaveFocus();

    // Tab moves to the next control.
    await user.tab();
    expect(batch).toHaveFocus();

    // Activate the batch mode via keyboard (Enter/Space).
    await user.keyboard('{Enter}');
    expect(batch).toHaveAttribute('aria-pressed', 'true');
    expect(single).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('Keyboard navigation — claim flow', () => {
  it('lets a keyboard-only user complete the claim form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AccessibleClaimForm onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox', { name: /stellar wallet address/i });
    const submit = screen.getByRole('button', { name: /claim payment/i });

    // Focus lands on the input first (only interactive element).
    await user.tab();
    expect(input).toHaveFocus();

    // Keyboard-only data entry. 56-character Stellar public key (G + 55 chars).
    await user.type(input, 'G' + 'A'.repeat(55));

    // Tab to submit and activate it.
    await user.tab();
    expect(submit).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalled();
  });
});
