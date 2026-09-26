import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSessionIdWithInactivity,
  resolveSessionId,
  SESSION_ID_KEY,
  SESSION_INACTIVITY_MS,
  SESSION_LAST_ACTIVITY_KEY,
  type SessionStorageLike,
} from '@/lib/analytics-session';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const T0 = 1_760_000_000_000;

/** Minimal in-memory stand-in for `sessionStorage`. */
function fakeStorage(initial: Record<string, string> = {}): SessionStorageLike & {
  data: Record<string, string>;
} {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

/** Storage whose every call throws, as blocked storage does. */
function blockedStorage(): SessionStorageLike {
  const deny = () => {
    throw new Error('The operation is insecure.');
  };
  return { getItem: deny, setItem: deny };
}

/** Deterministic id generator so minted values are assertable. */
function countingIds(prefix: string): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

/** Fails the test if called — for paths that must not reach the generator. */
function neverMints(): () => string {
  return () => {
    throw new Error('an id must not be minted when storage is unavailable');
  };
}

describe('resolveSessionId (§9.3 inactivity window)', () => {
  it('defaults the threshold to the 30 minutes the spec requires', () => {
    expect(SESSION_INACTIVITY_MS).toBe(30 * 60 * 1000);
  });

  it('mints and persists an id when none is stored', () => {
    const storage = fakeStorage();

    const id = resolveSessionId({ storage, now: T0, generateId: countingIds('sess') });

    expect(id).toBe('sess-1');
    expect(storage.data[SESSION_ID_KEY]).toBe('sess-1');
    expect(storage.data[SESSION_LAST_ACTIVITY_KEY]).toBe(String(T0));
  });

  it('reuses the stored id before the threshold elapses', () => {
    const storage = fakeStorage({
      [SESSION_ID_KEY]: 'existing',
      [SESSION_LAST_ACTIVITY_KEY]: String(T0),
    });

    const id = resolveSessionId({
      storage,
      now: T0 + SESSION_INACTIVITY_MS - 1,
      generateId: countingIds('sess'),
    });

    expect(id).toBe('existing');
  });

  it('rotates the id once exactly the threshold has elapsed', () => {
    const storage = fakeStorage({
      [SESSION_ID_KEY]: 'existing',
      [SESSION_LAST_ACTIVITY_KEY]: String(T0),
    });

    const id = resolveSessionId({
      storage,
      now: T0 + SESSION_INACTIVITY_MS,
      generateId: countingIds('sess'),
    });

    expect(id).toBe('sess-1');
    expect(storage.data[SESSION_ID_KEY]).toBe('sess-1');
  });

  it('rotates the id well past the threshold', () => {
    const storage = fakeStorage({
      [SESSION_ID_KEY]: 'existing',
      [SESSION_LAST_ACTIVITY_KEY]: String(T0),
    });

    const id = resolveSessionId({
      storage,
      now: T0 + 4 * SESSION_INACTIVITY_MS,
      generateId: countingIds('sess'),
    });

    expect(id).toBe('sess-1');
  });

  it('extends the window on every call, so repeated activity keeps one session', () => {
    const storage = fakeStorage();
    const generateId = countingIds('sess');

    const first = resolveSessionId({ storage, now: T0, generateId });
    const at20Min = resolveSessionId({ storage, now: T0 + 20 * 60_000, generateId });
    const at40Min = resolveSessionId({ storage, now: T0 + 40 * 60_000, generateId });

    expect(at20Min).toBe(first);
    expect(at40Min).toBe(first);

    // 30 min after the *last* call at T0+40min, not after T0.
    const afterIdle = resolveSessionId({
      storage,
      now: T0 + 40 * 60_000 + SESSION_INACTIVITY_MS,
      generateId,
    });
    expect(afterIdle).toBe('sess-2');
  });

  it('adopts an id stored before this module existed and stamps it', () => {
    // Pre-#633 installs have the id but no activity marker. Rotating here
    // would split one in-flight session in two across a deploy.
    const storage = fakeStorage({ [SESSION_ID_KEY]: 'legacy' });

    const id = resolveSessionId({ storage, now: T0, generateId: countingIds('sess') });

    expect(id).toBe('legacy');
    expect(storage.data[SESSION_LAST_ACTIVITY_KEY]).toBe(String(T0));
  });

  it('reuses (does not rotate) when the stored marker is unparsable', () => {
    const storage = fakeStorage({
      [SESSION_ID_KEY]: 'existing',
      [SESSION_LAST_ACTIVITY_KEY]: 'not-a-timestamp',
    });

    const id = resolveSessionId({ storage, now: T0, generateId: countingIds('sess') });

    expect(id).toBe('existing');
  });

  it('reuses (does not rotate) when the stored marker is in the future', () => {
    const storage = fakeStorage({
      [SESSION_ID_KEY]: 'existing',
      [SESSION_LAST_ACTIVITY_KEY]: String(T0 + SESSION_INACTIVITY_MS),
    });

    const id = resolveSessionId({ storage, now: T0, generateId: countingIds('sess') });

    expect(id).toBe('existing');
  });

  it('honours an explicit inactivityMs override', () => {
    const storage = fakeStorage({
      [SESSION_ID_KEY]: 'existing',
      [SESSION_LAST_ACTIVITY_KEY]: String(T0),
    });

    const id = resolveSessionId({
      storage,
      now: T0 + 5_000,
      generateId: countingIds('sess'),
      inactivityMs: 1_000,
    });

    expect(id).toBe('sess-1');
  });

  it('returns an empty string when there is no storage at all', () => {
    expect(resolveSessionId({ storage: null, now: T0, generateId: countingIds('sess') })).toBe('');
  });

  it('returns an empty string when reading storage throws', () => {
    expect(
      resolveSessionId({ storage: blockedStorage(), now: T0, generateId: countingIds('sess') }),
    ).toBe('');
  });

  it('returns an empty string when a minted id cannot be persisted', () => {
    // Reads succeed, writes fail: an unpersisted id would be regenerated on
    // every event, so no id is the honest answer.
    const readOnly: SessionStorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };

    expect(resolveSessionId({ storage: readOnly, now: T0, generateId: countingIds('sess') })).toBe(
      '',
    );
  });

  it('returns the stored id when only the restamp write fails', () => {
    const storage = fakeStorage({
      [SESSION_ID_KEY]: 'existing',
      [SESSION_LAST_ACTIVITY_KEY]: String(T0),
    });
    const failing: SessionStorageLike = {
      getItem: (key) => storage.getItem(key),
      setItem: (key) => {
        if (key === SESSION_LAST_ACTIVITY_KEY) throw new Error('quota exceeded');
        storage.setItem(key, 'ignored');
      },
    };

    const id = resolveSessionId({ storage: failing, now: T0, generateId: countingIds('sess') });

    expect(id).toBe('existing');
  });
});

describe('getSessionIdWithInactivity (browser entry point)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    // Removes the throwing getter installed by the property-access test so
    // jsdom's prototype getter is visible again.
    Reflect.deleteProperty(globalThis, 'sessionStorage');
  });

  it('mints a UUID-shaped id and persists it under the expected keys', () => {
    const id = getSessionIdWithInactivity(() => crypto.randomUUID());

    expect(id).toMatch(UUID_V4);
    expect(sessionStorage.getItem(SESSION_ID_KEY)).toBe(id);
    expect(sessionStorage.getItem(SESSION_LAST_ACTIVITY_KEY)).not.toBeNull();
  });

  it('returns a stable id within the window and a new one after it', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(T0);
    const generateId = countingIds('sess');
    const first = getSessionIdWithInactivity(generateId);

    now.mockReturnValue(T0 + 10 * 60_000);
    expect(getSessionIdWithInactivity(generateId)).toBe(first);

    now.mockReturnValue(T0 + 10 * 60_000 + SESSION_INACTIVITY_MS);
    expect(getSessionIdWithInactivity(generateId)).toBe('sess-2');
  });

  it('passes the injected generator through instead of minting its own id', () => {
    const id = getSessionIdWithInactivity(() => 'injected-id');
    expect(id).toBe('injected-id');
    expect(sessionStorage.getItem(SESSION_ID_KEY)).toBe('injected-id');
  });

  it('no-ops in SSR where there is no window', () => {
    vi.stubGlobal('window', undefined);

    expect(getSessionIdWithInactivity(neverMints())).toBe('');
  });

  it('no-ops when sessionStorage methods throw', () => {
    vi.stubGlobal('sessionStorage', blockedStorage());

    expect(getSessionIdWithInactivity(neverMints())).toBe('');
  });

  it('no-ops when merely touching sessionStorage throws', () => {
    // Some private-browsing configurations throw on property access rather
    // than on the method calls, so the access needs its own guard.
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('The operation is insecure.');
      },
    });

    expect(getSessionIdWithInactivity(neverMints())).toBe('');
  });
});
