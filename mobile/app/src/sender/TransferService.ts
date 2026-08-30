import { apiClient } from '../utils/apiClient';
import { CreateAccountRequest, CreateAccountResponse, SupportedAsset } from '../types/api';

const DEFAULT_ASSETS: SupportedAsset[] = [
  {
    code: 'XLM',
    issuer: 'native',
    name: 'Stellar Lumens',
  },
  {
    code: 'USDC',
    issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    name: 'USD Coin',
  },
];

/**
 * Service to handle transfer operations and ephemeral account management.
 * Talks to the Bridgelet SDK's `POST /accounts` endpoint.
 */
export class TransferService {
  /**
   * Create a new ephemeral account and initiate a transfer
   */
  static async createEphemeralAccount(
    request: CreateAccountRequest
  ): Promise<CreateAccountResponse> {
    try {
      const response = await apiClient<CreateAccountResponse>('/accounts', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response;
    } catch (error) {
      console.error('[TransferService] Failed to create ephemeral account:', error);
      throw error;
    }
  }

  /**
   * Fetch supported assets for transfers.
   * The Bridgelet SDK does not currently expose an `/assets` endpoint, so
   * assets are resolved client-side (with a documented default set).
   */
  static async getSupportedAssets(): Promise<SupportedAsset[]> {
    return DEFAULT_ASSETS;
  }
}
