import { http, HttpResponse } from 'msw';

let retryCounter = 0;
export const setRetryCounter = (val: number) => { retryCounter = val; };

export const handlers = [
  // Happy Path
  http.get('https://api.bridgelet.dev/v1/status', () => {
    return HttpResponse.json({ status: 'operational', network: 'mainnet' });
  }),

  // Error boundary
  http.get('https://api.bridgelet.dev/v1/fail', () => {
    return new HttpResponse(null, { status: 500 });
  }),

  // Transient retry simulation
  http.get('https://api.bridgelet.dev/v1/retry-target', () => {
    if (retryCounter < 2) {
      retryCounter++;
      return new HttpResponse(null, { status: 503 });
    }
    return HttpResponse.json({ success: true });
  }),

  // Timeout simulation
  http.get('https://api.bridgelet.dev/v1/timeout', async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return HttpResponse.json({ status: 'delayed' });
  }),
];