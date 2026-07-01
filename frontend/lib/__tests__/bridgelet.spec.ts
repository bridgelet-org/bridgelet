import { setupServer } from 'msw/node';
import { handlers, setRetryCounter } from './msw-handlers';
import { executeBridgeletRequest } from '../bridgelet';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  setRetryCounter(0);
});
afterAll(() => server.close());

describe('Issue #65/#142: Bridgelet Frontend SDK Coverage Matrix', () => {
  it('should process standard happy paths accurately', async () => {
    const data = await executeBridgeletRequest('https://api.bridgelet.dev/v1/status');
    expect(data.status).toBe('operational');
  });

  it('should cleanly handle fatal server exceptions', async () => {
    await expect(
      executeBridgeletRequest('https://api.bridgelet.dev/v1/fail')
    ).rejects.toThrow('status code: 500');
  });

  it('should successfully run retry sequences on transient failures', async () => {
    const data = await executeBridgeletRequest('https://api.bridgelet.dev/v1/retry-target', { maxRetries: 3 });
    expect(data.success).toBe(true);
  });

  it('should abort cleanly on connection timeouts', async () => {
    await expect(
      executeBridgeletRequest('https://api.bridgelet.dev/v1/timeout', { timeoutMs: 200 })
    ).rejects.toThrow('timeout bounds');
  });
});