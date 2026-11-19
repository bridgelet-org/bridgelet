// `Error Displayed` emitters for the network/wallet/unclassified §6 error_type values.
import { analytics } from './analytics';

export type NetworkErrorTrigger = 'network_unavailable' | 'wallet_connection_failed' | 'unknown';

/** §6 trigger conditions, plus the journey each one normally belongs to. */
export const NETWORK_ERROR_TRIGGERS: Record<
  NetworkErrorTrigger,
  { trigger: string; journey: 'sender' | 'recipient' | 'shared' }
> = {
  network_unavailable: { trigger: 'Cannot reach Stellar network or Bridgelet API', journey: 'shared' },
  wallet_connection_failed: { trigger: "Sender's wallet refused connection", journey: 'sender' },
  unknown: { trigger: 'Unclassified error', journey: 'shared' },
};

/** Call from any UI error surface whose condition matches `NETWORK_ERROR_TRIGGERS[errorType]`. */
export function emitNetworkErrorDisplayed(
  errorType: NetworkErrorTrigger,
  sourceScreen: string,
  errorCode?: string,
): void {
  analytics.errorDisplayed({
    journey: NETWORK_ERROR_TRIGGERS[errorType].journey,
    errorType,
    errorCode,
    sourceScreen,
  });
}
