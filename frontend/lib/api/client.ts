/**
 * `@/lib/api/client` is the path components should import from. It
 * re-exports from `@/lib/create-bridgelet-client`, which remains the single
 * canonical client for talking to bridgelet-sdk (see that file's docstring)
 */
export {
  BridgeletClient,
  RateLimitError,
  BridgeletApiError,
  getDefaultClient,
} from '@/lib/create-bridgelet-client';
export type { BridgeletClientOptions } from '@/lib/create-bridgelet-client';
