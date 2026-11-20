import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { analytics } from '@/lib/analytics';

const source = (relativePath: string) => readFileSync(resolve(__dirname, '..', relativePath), 'utf8');

const CONFIRM_STEP = 'components/send-form/steps/confirm-step.tsx';
const CONNECT_STEP = 'components/send-form/steps/connect-step.tsx';

function capture(emit: () => void): { name: string; props: Record<string, unknown> } {
  const plausible = vi.fn();
  (window as unknown as { plausible?: unknown }).plausible = plausible;
  emit();
  const [name, options] = plausible.mock.calls[0]! as [string, { props: Record<string, unknown> }];
  return { name, props: options.props };
}

afterEach(() => {
  delete (window as unknown as { plausible?: unknown }).plausible;
});

describe('#988 Wallet Connection Failed', () => {
  it('is emitted from the connect step when the connection attempt throws', () => {
    const step = source(CONNECT_STEP);
    const attempt = step.indexOf('await connectFreighter()');
    const catchBlock = step.indexOf('} catch (err) {', attempt);
    const failed = step.indexOf('analytics.walletConnectionFailed(');

    expect(attempt).toBeGreaterThan(-1);
    expect(failed).toBeGreaterThan(catchBlock);
    expect(step.lastIndexOf('analytics.walletConnectionFailed(')).toBe(failed);
  });

  it('names the wallet that was attempted', () => {
    expect(source(CONNECT_STEP)).toContain("walletType: 'Freighter'");
  });

  it('sends the spec event with the sender journey, wallet type and error code', () => {
    const { name, props } = capture(() =>
      analytics.walletConnectionFailed({ walletType: 'Freighter', errorCode: 'CONNECTION_DENIED' }),
    );

    expect(name).toBe('Wallet Connection Failed');
    expect(props).toEqual(
      expect.objectContaining({ journey: 'sender', wallet_type: 'Freighter', error_code: 'CONNECTION_DENIED' }),
    );
  });
});

describe('#989 Payment Confirmed', () => {
  it('is emitted when the sender confirms, before any account is created', () => {
    const step = source(CONFIRM_STEP);
    const confirmed = step.indexOf('analytics.paymentConfirmed(');
    const create = step.indexOf('executeCreateAccount(', confirmed);

    expect(confirmed).toBeGreaterThan(-1);
    expect(step.indexOf('function handleConfirm()')).toBeLessThan(confirmed);
    expect(create).toBeGreaterThan(confirmed);
  });

  it('sends the spec event name', () => {
    const { name, props } = capture(() =>
      analytics.paymentConfirmed({ assetType: 'XLM', expiryDays: 7, walletType: 'Freighter' }),
    );

    expect(name).toBe('Payment Confirmed');
    expect(props).toEqual(expect.objectContaining({ journey: 'sender', asset_type: 'XLM' }));
  });
});

describe('#990 Payment Created', () => {
  it('is emitted only after the funding payment has gone through', () => {
    const step = source(CONFIRM_STEP);
    const funded = step.indexOf('await fundEphemeralAccount(');
    const created = step.indexOf('analytics.paymentCreated(');

    expect(funded).toBeGreaterThan(-1);
    expect(created).toBeGreaterThan(funded);
    expect(step.lastIndexOf('analytics.paymentCreated(')).toBe(created);
  });

  it('is emitted in the success path, not the failure path', () => {
    const step = source(CONFIRM_STEP);

    expect(step.indexOf('analytics.paymentCreated(')).toBeLessThan(step.indexOf('} catch (err) {', step.indexOf('await fundEphemeralAccount(')));
  });

  it('sends the claim id, asset, expiry and confirmation time', () => {
    const { name, props } = capture(() =>
      analytics.paymentCreated({ claimId: 'acct-1', assetType: 'XLM', expiryDays: 7, confirmationTimeMs: 900 }),
    );

    expect(name).toBe('Payment Created');
    expect(props).toEqual(expect.objectContaining({ journey: 'sender', claim_id: 'acct-1' }));
    expect(Object.values(props)).toContain(900);
  });
});

describe('#991 Payment Creation Failed', () => {
  it('is emitted from the failure path of the account creation', () => {
    const step = source(CONFIRM_STEP);
    const funded = step.indexOf('await fundEphemeralAccount(');
    const catchBlock = step.indexOf('} catch (err) {', funded);
    const failed = step.indexOf('analytics.paymentCreationFailed(');

    expect(failed).toBeGreaterThan(catchBlock);
    expect(step.lastIndexOf('analytics.paymentCreationFailed(')).toBe(failed);
  });

  it('is limited to failures of the Stellar transaction, not to a rejected signature', () => {
    const step = source(CONFIRM_STEP);
    const failed = step.indexOf('analytics.paymentCreationFailed(');
    const guard = step.lastIndexOf('if (', failed);

    expect(step.slice(guard, failed)).toContain('AccountCreationErrorCode.STELLAR_CREATION_FAILURE');
  });

  it('sends the spec event with asset type and error code', () => {
    const { name, props } = capture(() =>
      analytics.paymentCreationFailed({ assetType: 'XLM', errorCode: 'SUBMIT_FAILED' }),
    );

    expect(name).toBe('Payment Creation Failed');
    expect(props).toEqual(
      expect.objectContaining({ journey: 'sender', asset_type: 'XLM', error_code: 'SUBMIT_FAILED' }),
    );
  });
});
