import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GlobalError from './global-error';
import { analytics } from '@/lib/analytics';

vi.mock('@/lib/analytics', () => ({
  analytics: {
    errorDisplayed: vi.fn(),
  },
}));

describe('GlobalError', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fires Error Displayed with error_type unknown (§6)', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123' });

    render(<GlobalError error={error} reset={() => {}} />);

    expect(analytics.errorDisplayed).toHaveBeenCalledWith({
      journey: 'shared',
      errorType: 'unknown',
      errorCode: 'abc123',
      sourceScreen: 'app_error_boundary',
    });
  });

  it('falls back to RENDER_CRASH when the error has no digest', () => {
    render(<GlobalError error={new Error('boom')} reset={() => {}} />);

    expect(analytics.errorDisplayed).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'RENDER_CRASH' }),
    );
  });

  it('offers a retry button wired to reset', async () => {
    const reset = vi.fn();
    render(<GlobalError error={new Error('boom')} reset={reset} />);

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
