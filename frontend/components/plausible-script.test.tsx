import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlausibleScript } from './plausible-script';

function scriptTags(): HTMLScriptElement[] {
  return Array.from(document.head.querySelectorAll('script[data-domain]'));
}

describe('PlausibleScript', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete (window as unknown as { plausible?: unknown }).plausible;
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    document.head.innerHTML = '';
    delete (window as unknown as { plausible?: unknown }).plausible;
  });

  it('does not inject anything when the domain is not configured', () => {
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', '');

    render(<PlausibleScript />);

    expect(scriptTags()).toHaveLength(0);
  });

  it('injects the Plausible script with the configured domain and api host', async () => {
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', 'bridgelet.example');
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_API_HOST', 'https://stats.bridgelet.example');

    render(<PlausibleScript />);

    await vi.waitFor(() => expect(scriptTags()).toHaveLength(1));
    const script = scriptTags()[0]!;
    expect(script.src).toBe('https://stats.bridgelet.example/js/script.js');
    expect(script.dataset.domain).toBe('bridgelet.example');
    expect(script.dataset.api).toBe('https://stats.bridgelet.example');
    expect(script.defer).toBe(true);
  });

  it('defaults the api host to plausible.io', async () => {
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', 'bridgelet.example');
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST;

    render(<PlausibleScript />);

    await vi.waitFor(() => expect(scriptTags()).toHaveLength(1));
    expect(scriptTags()[0]!.src).toBe('https://plausible.io/js/script.js');
  });

  it('does not inject twice when window.plausible is already defined', () => {
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', 'bridgelet.example');
    (window as unknown as { plausible?: unknown }).plausible = vi.fn();

    render(<PlausibleScript />);

    expect(scriptTags()).toHaveLength(0);
  });
});
