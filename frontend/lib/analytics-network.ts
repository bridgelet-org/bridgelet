// §3.1 base payload field `network` ("testnet" | "mainnet"), used to exclude test traffic from
// production dashboards. Derived from NEXT_PUBLIC_CRYPTO_NETWORK (e.g. "stellar-testnet").

export type AnalyticsNetwork = 'testnet' | 'mainnet';

/** Anything that names mainnet/public maps to "mainnet"; everything else (including unset) is "testnet". */
export function analyticsNetwork(raw: string | undefined = process.env.NEXT_PUBLIC_CRYPTO_NETWORK): AnalyticsNetwork {
  return raw && /mainnet|public/i.test(raw) ? 'mainnet' : 'testnet';
}

/** Adds the `network` field to an event payload. */
export function withNetwork<T extends Record<string, unknown>>(props: T): T & { network: AnalyticsNetwork } {
  return { ...props, network: analyticsNetwork() };
}
