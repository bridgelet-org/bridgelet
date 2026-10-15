#!/usr/bin/env node
/**
 * Issue #762 — sanity-check critical environment variables before starting or
 * building the frontend, so a misconfiguration fails loudly at build/start
 * instead of on the first request.
 */

import { fileURLToPath } from 'node:url';

const REQUIRED = ['BRIDGELET_SDK_URL', 'BRIDGELET_SDK_TOKEN'];
const EMAIL_RELATED = ['RESEND_API_KEY', 'EMAIL_FROM'];

/** All variables validated before the app is allowed to run. */
export const REQUIRED_ENV_VARS = [...REQUIRED, ...EMAIL_RELATED];

/**
 * Returns the names of any required variables that are missing or blank in the
 * supplied environment (defaults to the process environment).
 */
export function validateEnv(env = process.env) {
  return REQUIRED_ENV_VARS.filter((name) => !env[name] || String(env[name]).trim() === '');
}

/** Runs the CLI only when executed directly (`node scripts/check-env.mjs`). */
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const missing = validateEnv();
  if (missing.length > 0) {
    console.error('[check-env] Missing required environment variables:');
    missing.forEach((m) => console.error(`  - ${m}`));
    console.error(
      '\nCreate a .env.local (or set env in your shell) before running the app.',
    );
    process.exit(1);
  }
  console.log('[check-env] All required environment variables are set.');
  process.exit(0);
}
