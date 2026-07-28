#!/usr/bin/env node
/**
 * Generates TypeScript types from the Bridgelet SDK's OpenAPI spec.
 *
 * Prerequisites:
 *   npm install -D openapi-typescript   (already in devDependencies)
 *
 * Usage:
 *   BRIDGELET_API_URL=http://localhost:4000 npm run generate:types
 *   # or with defaults from .env:
 *   npm run generate:types
 *
 * The SDK must expose GET /api/docs-json returning a valid OpenAPI 3.x document.
 * Generated output overwrites frontend/lib/bridgelet.ts.
 */

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve API URL from env, falling back to local dev default
const apiUrl =
  process.env.BRIDGELET_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

const specUrl = `${apiUrl}/api/docs-json`;
const outFile = resolve(__dirname, '../lib/bridgelet.ts');

console.log(`Fetching OpenAPI spec from: ${specUrl}`);
console.log(`Writing types to:           ${outFile}`);

try {
  execSync(`npx openapi-typescript "${specUrl}" -o "${outFile}"`, { stdio: 'inherit' });
  console.log('\nType generation complete.');
  console.log('Tip: commit the updated lib/bridgelet.ts so types stay in sync with the API.');
} catch (err) {
  console.error('\nGeneration failed:', err instanceof Error ? err.message : err);
  console.error(
    'Ensure the SDK is running and GET /api/docs-json returns a valid OpenAPI 3.x spec.',
  );
  process.exit(1);
}
