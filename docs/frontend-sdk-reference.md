# Frontend SDK Reference

## Overview

The Bridgelet frontend SDK provides a client-side abstraction over the Bridgelet API. It exposes account creation, account transaction preparation, account lookup, claim verification, claim redemption, health checks, and request cancellation.

The primary client is `BridgeletClient`, available from:

```ts
import { BridgeletClient } from '@/lib/create-bridgelet-client';
```

Convenience functions are also exported from:

```ts
import {
  createEphemeralAccount,
  redeemClaim,
} from '@/lib/bridgelet';
```

The frontend SDK handles request configuration, JSON serialization, timeouts, retries, rate-limit responses, API errors, and request cancellation.

---

## Creating the Client

### `new BridgeletClient(options?)`

Creates a Bridgelet API client.

#### Parameters

`options` is optional and has the following shape:

```ts
interface BridgeletClientOptions {
  baseUrl?: string;
  internalBaseUrl?: string;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  requestInterceptor?: (
    url: string,
    init: RequestInit
  ) => RequestInit | Promise<RequestInit>;
  responseInterceptor?: (
    response: Response
  ) => Response | Promise<Response>;
}
```

| Parameter             | Type     |                            Default | Description                                                              |
| --------------------- | -------- | ---------------------------------: | ------------------------------------------------------------------------ |
| `baseUrl`             | `string` | `NEXT_PUBLIC_API_BASE_URL` or `''` | Base URL for public API requests such as claim operations.               |
| `internalBaseUrl`     | `string` |                               `''` | Base URL for internal account routes.                                    |
| `maxRetries`          | `number` |                                `5` | Maximum number of retries for transient failures and HTTP 5xx responses. |
| `baseDelayMs`         | `number` |                              `500` | Base delay used for exponential backoff.                                 |
| `maxDelayMs`          | `number` |                            `30000` | Maximum backoff delay.                                                   |
| `timeoutMs`           | `number` |                            `15000` | Request timeout in milliseconds.                                         |
| `requestInterceptor`  | function |                        `undefined` | Allows callers to modify a request before it is sent.                    |
| `responseInterceptor` | function |                        `undefined` | Allows callers to inspect or modify a response before processing.        |

### Example

```ts
const client = new BridgeletClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeoutMs: 10000,
});
```

---

## `createAccount(data)`

Creates an ephemeral Bridgelet account.

```ts
createAccount(
  data: CreateAccountRequest
): Promise<AccountResponse>
```

### Parameters

```ts
interface CreateAccountRequest {
  fundingSource: string;
  recovery_address: string;
  amount: string;
  asset_code?: string;
  asset_issuer?: string;
  expiresIn: number;
  metadata?: Record<string, unknown>;
  signedTxXdr?: string;
  signerAddress?: string;
  networkPassphrase?: string;
  signingMode?: 'backend' | 'freighter-client';
}
```

### Returns

```ts
interface AccountResponse {
  accountId: string;
  publicKey: string;
  claimUrl: string | null;
  txHash?: string;
  amount: string;
  asset: string;
  status: AccountStatus;
  expiresAt: string;
  createdAt: string;
  claimedAt?: string | null;
  destination?: string;
  metadata?: Record<string, unknown>;
}
```

### Example

```ts
const account = await client.createAccount({
  fundingSource: 'G...',
  recovery_address: 'G...',
  amount: '100',
  expiresIn: 3600,
});

console.log(account.accountId);
console.log(account.claimUrl);
```

---

## `prepareAccountTransaction(data)`

Prepares an account transaction without submitting the transaction.

```ts
prepareAccountTransaction(
  data: CreateAccountRequest
): Promise<PreparedAccountTransaction>
```

### Parameters

Uses the same `CreateAccountRequest` shape as `createAccount()`.

### Returns

```ts
interface PreparedAccountTransaction {
  unsignedTxXdr: string;
  networkPassphrase?: string;
  expiresAt?: string;
}
```

### Example

```ts
const prepared = await client.prepareAccountTransaction({
  fundingSource: 'G...',
  recovery_address: 'G...',
  amount: '100',
  expiresIn: 3600,
});

console.log(prepared.unsignedTxXdr);
```

---

## `getAccount(accountId)`

Retrieves an account by its ID.

```ts
getAccount(
  accountId: string
): Promise<AccountResponse>
```

### Parameters

| Parameter   | Type     | Description                    |
| ----------- | -------- | ------------------------------ |
| `accountId` | `string` | ID of the account to retrieve. |

The account ID is URL encoded before being included in the request.

### Returns

`Promise<AccountResponse>`.

### Example

```ts
const account = await client.getAccount('account-id');

console.log(account.status);
```

---

## `redeemClaim(claimToken, destinationAddress)`

Redeems a claim token to a destination address.

```ts
redeemClaim(
  claimToken: string,
  destinationAddress: string
): Promise<RedeemClaimResponse>
```

### Parameters

| Parameter            | Type     | Description                                   |
| -------------------- | -------- | --------------------------------------------- |
| `claimToken`         | `string` | Token identifying the claim to redeem.        |
| `destinationAddress` | `string` | Stellar address receiving the redeemed funds. |

### Returns

```ts
interface RedeemClaimResponse {
  success: boolean;
  txHash?: string;
  amountSwept: string;
  asset: string;
  destination: string;
  sweptAt?: string;
  message?: string;
  isPartial?: boolean;
  contractAuthHash?: string;
  error?: string;
}
```

### Example

```ts
const result = await client.redeemClaim(
  claimToken,
  destinationAddress,
);

if (result.success) {
  console.log(result.txHash);
}
```

---

## `verifyClaim(claimToken)`

Verifies a claim token.

```ts
verifyClaim(
  claimToken: string
): Promise<ClaimView>
```

### Parameters

| Parameter    | Type     | Description                            |
| ------------ | -------- | -------------------------------------- |
| `claimToken` | `string` | Token identifying the claim to verify. |

### Returns

A `Promise<ClaimView>`.

The exact `ClaimView` shape is defined by the frontend claim model in `@/lib/claim-view`.

### Example

```ts
const claim = await client.verifyClaim(claimToken);

console.log(claim);
```

---

## `cancelAll()`

Cancels all currently in-flight requests made through the client.

```ts
cancelAll(): void
```

### Parameters

None.

### Returns

`void`.

### Example

```ts
client.cancelAll();
```

This can be useful when a component unmounts or when the application needs to cancel outstanding SDK requests.

---

## `healthCheck()`

Checks whether the Bridgelet API is reachable and responding successfully.

```ts
healthCheck(): Promise<boolean>
```

### Parameters

None.

### Returns

* `true` when the health endpoint responds successfully.
* `false` when the request fails or the response is not successful.

The health check uses a fixed 5-second timeout.

### Example

```ts
const healthy = await client.healthCheck();

if (!healthy) {
  console.log('Bridgelet API is unavailable');
}
```

Unlike other SDK requests, `healthCheck()` catches request failures and returns `false` instead of throwing the underlying error.

---

# Default Client

## `getDefaultClient()`

Returns a lazily-created singleton `BridgeletClient`.

```ts
getDefaultClient(): BridgeletClient
```

### Parameters

None.

### Returns

The shared default `BridgeletClient` instance.

### Example

```ts
const client = getDefaultClient();

const account = await client.getAccount(accountId);
```

---

# Convenience Functions

The frontend also exports convenience functions that use the default client.

## `createEphemeralAccount(data)`

Creates an ephemeral account using the default SDK client.

```ts
createEphemeralAccount(
  data: CreateAccountRequest
): Promise<EphemeralAccount>
```

`EphemeralAccount` is an alias of `AccountResponse`.

### Example

```ts
const account = await createEphemeralAccount({
  fundingSource: 'G...',
  recovery_address: 'G...',
  amount: '100',
  expiresIn: 3600,
});
```

---

## `redeemClaim(token, destinationAddress)`

Redeems a claim using the default SDK client.

```ts
redeemClaim(
  token: string,
  destinationAddress: string
): Promise<RedeemClaimResponse>
```

### Parameters

| Parameter            | Type     | Description                  |
| -------------------- | -------- | ---------------------------- |
| `token`              | `string` | Claim token.                 |
| `destinationAddress` | `string` | Destination Stellar address. |

### Example

```ts
const result = await redeemClaim(
  claimToken,
  destinationAddress,
);
```

---

# Error Handling

SDK requests can fail with several different error types.

## `RateLimitError`

A `RateLimitError` is thrown when the API returns HTTP `429`.

```ts
class RateLimitError extends Error {
  readonly retryAfter: number | null;
}
```

### Properties

| Property     | Type             | Description                                                                   |
| ------------ | ---------------- | ----------------------------------------------------------------------------- |
| `message`    | `string`         | Human-readable rate-limit message.                                            |
| `retryAfter` | `number \| null` | Number of seconds supplied by the API's `Retry-After` header, when available. |

### Example

```ts
try {
  await client.createAccount(data);
} catch (error) {
  if (error instanceof RateLimitError) {
    if (error.retryAfter !== null) {
      console.log(`Retry in ${error.retryAfter} seconds`);
    }
  }
}
```

A `429` response is not automatically retried.

---

## `BridgeletApiError`

A `BridgeletApiError` is thrown for non-successful API responses other than HTTP `429`.

```ts
class BridgeletApiError extends Error {
  readonly statusCode: number;
  readonly error: string | undefined;
}
```

### Properties

| Property     | Type                  | Description                                                         |
| ------------ | --------------------- | ------------------------------------------------------------------- |
| `message`    | `string`              | Error message returned by the API, or a generated fallback message. |
| `statusCode` | `number`              | HTTP status code.                                                   |
| `error`      | `string \| undefined` | API error code when supplied.                                       |

### Example

```ts
try {
  const account = await client.getAccount(accountId);
} catch (error) {
  if (error instanceof BridgeletApiError) {
    console.error(error.statusCode);
    console.error(error.error);
    console.error(error.message);
  }
}
```

The client supports both nested and flat API error formats when parsing the response.

---

## Network and Timeout Errors

Transient request failures are automatically retried when they are:

* `RequestTimeoutError`
* `TypeError` network failures

The default configuration allows up to 5 retries.

Retries use exponential backoff with jitter:

```text
delay = min(baseDelayMs × 2^attempt, maxDelayMs)
```

A random jitter value is added to the calculated delay.

The defaults are:

```text
maxRetries: 5
baseDelayMs: 500ms
maxDelayMs: 30 seconds
timeoutMs: 15 seconds
```

If all retry attempts fail, the final underlying error is thrown to the consumer.

---

## HTTP 5xx Errors

HTTP `5xx` responses are treated as transient failures and are retried according to the configured retry policy.

If all retry attempts fail, the final response is converted into a `BridgeletApiError`.

HTTP `4xx` responses other than `429` are not automatically retried.

---

# Error Handling Pattern

Consumers should distinguish between rate-limit errors, API errors, and unexpected/network errors.

```ts
try {
  const account = await client.createAccount(data);

  console.log('Account created:', account.accountId);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Rate limited:', error.retryAfter);
  } else if (error instanceof BridgeletApiError) {
    console.log('API error:', error.statusCode);
    console.log('Code:', error.error);
    console.log('Message:', error.message);
  } else {
    console.log('Unexpected or network error:', error);
  }
}
```

---

# Request and Response Interceptors

The client supports optional request and response interceptors.

### Request interceptor

A request interceptor can modify the URL or `RequestInit` before the request is sent.

```ts
const client = new BridgeletClient({
  requestInterceptor: async (url, init) => {
    return {
      ...init,
      headers: {
        ...Object.fromEntries(new Headers(init.headers)),
        'X-Custom-Header': 'value',
      },
    };
  },
});
```

### Response interceptor

A response interceptor can inspect or transform the response before the SDK processes it.

```ts
const client = new BridgeletClient({
  responseInterceptor: async (response) => {
    return response;
  },
});
```

---

# API Types

The primary request and response types exposed by the frontend SDK are:

```ts
CreateAccountRequest
AccountResponse
EphemeralAccount
PreparedAccountTransaction
VerifyClaimRequest
RedeemClaimRequest
RedeemClaimResponse
ApiError
AccountStatus
```

`AccountResponse` represents the account returned by the SDK.

`EphemeralAccount` is an alias of `AccountResponse`.

`AccountStatus` represents the account lifecycle status exposed by the frontend API types.

---

# Keeping This Reference in Sync

This document describes the public frontend SDK wrapper implemented in:

```text
frontend/lib/create-bridgelet-client.ts
frontend/lib/bridgelet.ts
```

When the wrapper's public methods, parameters, return types, error classes, or retry behavior change, this reference must be updated in the same change.

The documentation should describe the frontend wrapper API rather than directly documenting the lower-level `bridgelet-sdk` backend API.
