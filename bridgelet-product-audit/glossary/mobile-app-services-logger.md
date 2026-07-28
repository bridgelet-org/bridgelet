# `mobile/services/logger`

The single populated module under `mobile/services/` — the directory contains just
`logger/index.ts`. That makes it the de facto starting point for the mobile app's
observability story.

## Exported interface

```ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const logger = {
  debug(tag: string, message: string, ...args: unknown[]): void,
  info (tag: string, message: string, ...args: unknown[]): void,
  warn (tag: string, message: string, ...args: unknown[]): void,
  error(tag: string, message: string, ...args: unknown[]): void,
};

export default logger;
```

Both a named `logger` and a default export are available.

## Behaviour

**Level filtering.** Levels rank `debug(0) < info(1) < warn(2) < error(3)`, with
the minimum chosen from the environment:

```ts
const MIN_LEVEL: LogLevel = isProd ? 'warn' : 'debug';
```

`isProd` comes from `../../app/src/config/env`. Production emits only `warn` and
`error`; development emits everything.

**Formatting.** Every line is prefixed uniformly as `[LEVEL][tag] message`. The
`tag` is the caller's own label, giving log output a consistent, greppable shape
across modules.

**Transport.** None beyond the console — each method delegates to the matching
`console.*` call. No remote sink, no buffering, no structured/JSON output. Extra
`args` pass through to `console` unchanged.

## Why this is a starting point, not the finished story

Console-only logging means production diagnostics on mobile are only as good as
whatever captures the device console. Anyone extending mobile observability should
start here, since every existing call site already routes through this one module
— adding a transport is a single-file change. See the checklist entry on mobile
CI/observability gaps, and [`../runbooks/onboard-mobile-app-to-ci.md`](../runbooks/onboard-mobile-app-to-ci.md).
