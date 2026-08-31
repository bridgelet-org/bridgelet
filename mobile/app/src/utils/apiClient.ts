import { secureStorage } from './storage';
import { ApiError } from '../types/api';
import env from '../config/env';
import logger from '../../../services/logger';

const API_BASE_URL = env.apiUrl;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  skipAuth?: boolean;
}

/**
 * Custom error class for API failures
 */
export class ApiRequestError extends Error {
  status: number;
  data?: ApiError;

  constructor(status: number, message: string, data?: ApiError) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Wait for a specified duration
 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generic API request wrapper with retry logic and auth injection
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, skipAuth, ...fetchOptions } = options;
  
  // Construct URL with query params
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  // Set default headers
  const headers = new Headers(fetchOptions.headers || {});
  headers.set('Content-Type', 'application/json');

  // Inject auth token if available and not skipped
  if (!skipAuth) {
    const token = await secureStorage.getItem('auth_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // The Bridgelet SDK authenticates via an `X-API-Key` header (ApiKeyAuthGuard).
  // Attach it whenever an integrator key is configured.
  const apiKey = process.env.EXPO_PUBLIC_API_KEY;
  if (apiKey) {
    headers.set('X-API-Key', apiKey);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        logger.info('API', `Retrying ${endpoint} (attempt ${attempt}) in ${delay}ms...`);
        await wait(delay);
      }

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();

      if (!response.ok) {
        // Only retry on 5xx errors or network-like issues
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          lastError = new ApiRequestError(response.status, data.error?.message || 'Server Error', data.error);
          continue;
        }
        throw new ApiRequestError(response.status, data.error?.message || 'API Error', data.error);
      }

      return data.data || data; // Handle both wrapped and unwrapped responses
    } catch (error: any) {
      lastError = error;
      
      // If it's a network error (not an ApiRequestError), we should retry
      if (!(error instanceof ApiRequestError) && attempt < MAX_RETRIES) {
        continue;
      }
      
      throw error;
    }
  }

  throw lastError || new Error('Unknown API error');
}
