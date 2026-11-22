import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { analytics } from '@/lib/analytics';

const source = (relativePath: string) => readFileSync(resolve(__dirname, '..', relativePath), 'utf8');

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

describe('#981 Page Viewed', () => {
  it('is wired into the homepage entry point', () => {
    const tracker = source('components/page-view-tracker.tsx');
    const homepage = source('app/page.tsx');
    const emit = tracker.indexOf('analytics.pageViewed(');
    const effect = tracker.lastIndexOf('useEffect(', emit);

    expect(emit).toBeGreaterThan(-1);
    expect(tracker.indexOf('}, [page]);', effect)).toBeGreaterThan(emit);
    expect(homepage).toContain('<PageViewTracker page="homepage" />');
  });

  it('sends the spec payload', () => {
    const { name, props } = capture(() =>
      analytics.pageViewed({ page: 'homepage', entrySource: 'direct' }),
    );

    expect(name).toBe('Page Viewed');
    expect(props).toEqual(
      expect.objectContaining({
        journey: 'sender',
        page: 'homepage',
        entry_source: 'direct',
      }),
    );
  });
});

describe('#982 Send Form Viewed', () => {
  it('is emitted once on send form mount', () => {
    const form = source('components/send-form/index.tsx');
    const emit = form.indexOf('analytics.sendFormViewed()');
    const effect = form.lastIndexOf('useEffect(', emit);

    expect(emit).toBeGreaterThan(-1);
    expect(form.lastIndexOf('analytics.sendFormViewed()')).toBe(emit);
    expect(form.indexOf('}, []);', effect)).toBeGreaterThan(emit);
  });

  it('sends the spec payload', () => {
    const { name, props } = capture(() => analytics.sendFormViewed());

    expect(name).toBe('Send Form Viewed');
    expect(props).toEqual(expect.objectContaining({ journey: 'sender' }));
  });
});
