import { RequestTimeoutError } from '@/lib/fetch-with-timeout';
import { BridgeletApiError, RateLimitError } from '@/lib/create-bridgelet-client';

export enum AccountCreationErrorCode {
  NETWORK_FAILURE = 'NETWORK_FAILURE',
  STELLAR_CREATION_FAILURE = 'STELLAR_CREATION_FAILURE',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AccountCreationErrorInfo {
  code: AccountCreationErrorCode;
  userMessage: string;
  retryable: boolean;
  suggestion: string;
}

export function classifyAccountCreationError(err: unknown): AccountCreationErrorInfo {
  if (err instanceof RequestTimeoutError) {
    return {
      code: AccountCreationErrorCode.NETWORK_FAILURE,
      userMessage: 'The request timed out.',
      retryable: true,
      suggestion: 'Check your internet connection and try again.',
    };
  }

  if (err instanceof TypeError) {
    return {
      code: AccountCreationErrorCode.NETWORK_FAILURE,
      userMessage: 'Network error. Please check your connection and try again.',
      retryable: true,
      suggestion: 'Check your internet connection and try again.',
    };
  }

  if (err instanceof RateLimitError) {
    return {
      code: AccountCreationErrorCode.RATE_LIMITED,
      userMessage: err.message,
      retryable: true,
      suggestion: 'Please wait before retrying.',
    };
  }

  if (err instanceof BridgeletApiError) {
    const apiCode = extractApiErrorCode(err);
    const mapped = mapApiCodeToCreationInfo(apiCode, err.statusCode);
    if (mapped) return mapped;
  }

  if (err instanceof Error) {
    const message = err.message.toLowerCase();
    if (message.includes('timeout') || message.includes('network') || message.includes('fetch')) {
      return {
        code: AccountCreationErrorCode.NETWORK_FAILURE,
        userMessage: 'Network error. Please check your connection and try again.',
        retryable: true,
        suggestion: 'Check your internet connection and try again.',
      };
    }
  }

  return unknownErrorInfo;
}

function extractApiErrorCode(err: BridgeletApiError): string | undefined {
  if (typeof err.error === 'string') {
    return err.error;
  }
  if (err.error && typeof err.error === 'object' && 'code' in err.error) {
    return (err.error as { code?: string }).code;
  }
  return undefined;
}

function mapApiCodeToCreationInfo(
  code: string | undefined,
  statusCode: number,
): AccountCreationErrorInfo | undefined {
  const normalized = code?.toUpperCase();

  if (normalized === 'INSUFFICIENT_BALANCE' || normalized === 'INSUFFICIENT_FUNDS') {
    return {
      code: AccountCreationErrorCode.INSUFFICIENT_FUNDS,
      userMessage: "Your wallet doesn't have enough funds to complete this payment.",
      retryable: false,
      suggestion: 'Add funds to your wallet and try again.',
    };
  }

  if (normalized === 'NETWORK_ERROR' || normalized === 'STELLAR_NETWORK_UNAVAILABLE') {
    return {
      code: AccountCreationErrorCode.NETWORK_FAILURE,
      userMessage: 'Network temporarily unavailable.',
      retryable: true,
      suggestion: 'Check your connection and retry.',
    };
  }

  if (
    normalized?.includes('STELLAR') ||
    normalized === 'TX_FAILED' ||
    normalized === 'ACCOUNT_CREATION_FAILED'
  ) {
    return {
      code: AccountCreationErrorCode.STELLAR_CREATION_FAILURE,
      userMessage: "We couldn't create the payment on the Stellar network.",
      retryable: true,
      suggestion: 'This is usually temporary. Please try again in a moment.',
    };
  }

  if (normalized === 'RATE_LIMIT_EXCEEDED') {
    return {
      code: AccountCreationErrorCode.RATE_LIMITED,
      userMessage: 'Too many requests. Please wait a moment.',
      retryable: true,
      suggestion: 'Wait a few seconds and try again.',
    };
  }

  if (statusCode === 401) {
    return {
      code: AccountCreationErrorCode.UNAUTHORIZED,
      userMessage: 'Please reconnect your wallet.',
      retryable: false,
      suggestion: 'Reconnect your wallet to continue.',
    };
  }

  if (statusCode === 402) {
    return {
      code: AccountCreationErrorCode.INSUFFICIENT_FUNDS,
      userMessage: "Your wallet doesn't have enough funds to complete this payment.",
      retryable: false,
      suggestion: 'Add funds to your wallet and try again.',
    };
  }

  if (statusCode === 400) {
    return {
      code: AccountCreationErrorCode.INVALID_REQUEST,
      userMessage: 'Invalid request. Please check your input.',
      retryable: false,
      suggestion: 'Double-check the form details and try again.',
    };
  }

  if (statusCode >= 500) {
    return {
      code: AccountCreationErrorCode.SERVER_ERROR,
      userMessage: 'Something went wrong on our end.',
      retryable: true,
      suggestion: 'Please try again shortly or contact support.',
    };
  }

  return undefined;
}

const unknownErrorInfo: AccountCreationErrorInfo = {
  code: AccountCreationErrorCode.UNKNOWN_ERROR,
  userMessage: 'Something went wrong.',
  retryable: true,
  suggestion: 'Please try again or contact support.',
};
