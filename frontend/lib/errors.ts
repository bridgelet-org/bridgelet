export class BridgeletApiError extends Error {
  readonly status: number;
  readonly userMessage: string;

  constructor(status: number, message: string, userMessage?: string) {
    super(message);
    this.name = 'BridgeletApiError';
    this.status = status;
    this.userMessage = userMessage ?? defaultUserMessage(status);
  }

  static async fromResponse(res: Response): Promise<BridgeletApiError> {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
    } catch {
      // non-JSON body — keep statusText
    }
    return new BridgeletApiError(res.status, message);
  }
}

function defaultUserMessage(status: number): string {
  if (status === 401) return 'You are not authorised. Please reconnect your wallet.';
  if (status === 404) return 'The requested resource was not found.';
  if (status === 409) return 'This claim has already been redeemed.';
  if (status === 410) return 'This claim has expired.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our end. Please try again shortly.';
  return 'An unexpected error occurred.';
}
