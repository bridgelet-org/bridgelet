import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { analytics, ERROR_TYPES, type ErrorType } from '@/lib/analytics';
import { installMockPlausible, type CapturedAnalyticsEvent } from '@/mocks/plausible';

/**
 * `docs/analytics-spec.md` §6 — the eight `error_type` values, each paired with
 * the user-facing message an error banner shows for it. Keep this in sync with
 * `ERROR_TYPES` in `lib/analytics.ts`; `AllErrorTypes` iterates the real set, so
 * a missing copy here shows up as an obvious placeholder rather than a blank.
 */
const ERROR_COPY: Record<ErrorType, string> = {
  invalid_token: 'This claim link is invalid or no longer exists.',
  expired_token: 'This claim link has expired.',
  already_claimed: 'These funds have already been claimed.',
  invalid_wallet_address: 'Enter a valid Stellar public key (starts with G, 56 characters).',
  transaction_failed: 'The transaction failed. Nothing was transferred — please try again.',
  network_unavailable: 'We could not reach the Stellar network. Check your connection and retry.',
  wallet_connection_failed: 'Your wallet refused the connection request.',
  unknown: 'Something went wrong. Please try again.',
};

interface ErrorDisplayedPreviewProps {
  /** §6 `error_type` to render and report. */
  errorType: ErrorType;
  journey?: 'sender' | 'recipient' | 'shared';
  claimId?: string | null;
  sourceScreen?: string;
}

/**
 * Renders the `Error Displayed` banner for one `error_type` and, in the same
 * mount, fires the tracking call through the mock Plausible and shows the
 * captured payload. This is exactly the "analytics-instrumented state" the
 * story exists to demonstrate: the UI the user sees and the event it produces,
 * side by side — without needing a real claim flow or the real Plausible script.
 */
function ErrorDisplayedPreview({
  errorType,
  journey = 'recipient',
  claimId = 'tok_demo',
  sourceScreen = 'claim_landing',
}: ErrorDisplayedPreviewProps) {
  const [captured, setCaptured] = useState<CapturedAnalyticsEvent | null>(null);

  useEffect(() => {
    const mock = installMockPlausible();
    analytics.errorDisplayed({ journey, claimId, errorType, sourceScreen });
    setCaptured(mock.events[0] ?? null);
    return () => mock.uninstall();
  }, [errorType, journey, claimId, sourceScreen]);

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          color: '#991b1b',
          fontSize: 14,
          padding: '12px 16px',
        }}
      >
        <p style={{ fontWeight: 600, margin: 0 }}>Something went wrong</p>
        <p style={{ margin: '4px 0 0' }}>{ERROR_COPY[errorType]}</p>
        <p style={{ color: '#dc2626', fontFamily: 'monospace', fontSize: 12, margin: '4px 0 0' }}>
          error_type: {errorType}
        </p>
      </div>
      <pre
        style={{
          background: '#0f172a',
          borderRadius: 8,
          color: '#e2e8f0',
          fontSize: 12,
          margin: 0,
          overflowX: 'auto',
          padding: 12,
        }}
      >
        {captured ? JSON.stringify(captured, null, 2) : 'waiting for track()…'}
      </pre>
    </div>
  );
}

const meta: Meta<typeof ErrorDisplayedPreview> = {
  title: 'Analytics/Error Displayed',
  component: ErrorDisplayedPreview,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Demonstrates the analytics-instrumented state of the `Error Displayed` banner for each `error_type` in `docs/analytics-spec.md` §6. Installing the mock Plausible captures the payload the component fires, so the UI and its tracking call can be confirmed together.',
      },
    },
  },
  argTypes: {
    errorType: { control: 'select', options: Object.keys(ERROR_TYPES) },
    journey: { control: 'select', options: ['sender', 'recipient', 'shared'] },
  },
};

export default meta;

type Story = StoryObj<typeof ErrorDisplayedPreview>;

export const InvalidToken: Story = { args: { errorType: 'invalid_token' } };

export const ExpiredToken: Story = { args: { errorType: 'expired_token' } };

export const AlreadyClaimed: Story = { args: { errorType: 'already_claimed' } };

export const InvalidWalletAddress: Story = { args: { errorType: 'invalid_wallet_address' } };

export const TransactionFailed: Story = { args: { errorType: 'transaction_failed' } };

export const NetworkUnavailable: Story = { args: { errorType: 'network_unavailable' } };

export const WalletConnectionFailed: Story = {
  args: {
    errorType: 'wallet_connection_failed',
    journey: 'sender',
    sourceScreen: 'send_form_connect',
  },
};

export const Unknown: Story = { args: { errorType: 'unknown' } };

/**
 * Every §6 `error_type` at once, for a single visual + tracking sweep. Each
 * panel installs its own mock and reports the payload it fired.
 */
export const AllErrorTypes: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gap: 24,
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
      }}
    >
      {(Object.keys(ERROR_TYPES) as ErrorType[]).map((errorType) => (
        <ErrorDisplayedPreview key={errorType} errorType={errorType} />
      ))}
    </div>
  ),
};
