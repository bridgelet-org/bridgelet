import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import type { SendFormState } from '@/components/send-form';

vi.mock('@/lib/xlm-price', () => ({
  getXlmUsdRate: vi.fn().mockResolvedValue(0.1),
  formatFiat: (xlm: number, rate: number) => `$${(xlm * rate).toFixed(2)}`,
}));

const TESTNET_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

function makeState(): SendFormState {
  return {
    publicKey: 'G' + 'A'.repeat(55),
    expiresInHours: 24,
    recipientName: '',
    recipientEmail: '',
    amountXlm: '5',
    assetCode: 'XLM',
    memo: '',
    expiresIn: 24 * 60 * 60,
  };
}

async function renderDetailsStep() {
  vi.resetModules();
  const { DetailsStep } = await import('@/components/send-form/steps/details-step');
  render(<DetailsStep state={makeState()} onChange={vi.fn()} onBack={vi.fn()} onNext={vi.fn()} />);
  await act(async () => {
    await Promise.resolve();
  });
  return screen.getByLabelText('Asset');
}

describe('DetailsStep asset allowlist (#977)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_CRYPTO_NETWORK', 'stellar-testnet');
    vi.stubEnv('NEXT_PUBLIC_SUPPORTED_ASSETS_TESTNET', '');
    vi.stubEnv('NEXT_PUBLIC_SUPPORTED_ASSETS_MAINNET', '');
    vi.stubEnv('NEXT_PUBLIC_SUPPORTED_ASSETS', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('offers only XLM when the SDK allowlist is empty', async () => {
    const select = await renderDetailsStep();

    expect(within(select).getAllByRole('option')).toHaveLength(1);
    expect(within(select).queryByRole('option', { name: /USDC/i })).not.toBeInTheDocument();
    expect(screen.getByText(/only XLM is available/i)).toBeInTheDocument();
  });

  it('offers an issued asset once the SDK allowlist includes it', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPPORTED_ASSETS_TESTNET', `USDC:${TESTNET_ISSUER}`);
    const select = await renderDetailsStep();

    expect(within(select).getByRole('option', { name: 'USDC' })).toBeInTheDocument();
    expect(screen.queryByText(/only XLM is available/i)).not.toBeInTheDocument();
  });
});
