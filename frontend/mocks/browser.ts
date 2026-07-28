import { setupWorker } from 'msw/browser';
import { accountHandlers } from './handlers/accounts';
import { claimsHandlers } from './handlers/claims';
import { horizonHandlers } from './handlers/horizon';

/**
 * MSW service worker for browser environments.
 *
 * Start this once in development to intercept fetch/XHR calls.
 * The worker is only initialised when this module is imported.
 */
export const worker = setupWorker(...accountHandlers, ...horizonHandlers, ...claimsHandlers);
