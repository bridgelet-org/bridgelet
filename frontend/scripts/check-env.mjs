#!/usr/bin/env node
/**
 * Fail-fast environment variable check for bridgelet-frontend.
 * Verifies required server-side and browser-facing environment variables in production.
 */

const isProd = process.env.NODE_ENV === 'production';
const errors = [];

// Server-only required in production
if (isProd && process.env.E2E_USE_MOCKS !== 'true') {
  if (!process.env.BRIDGELET_SDK_URL) {
    errors.push('Missing BRIDGELET_SDK_URL: server-side Route Handlers require the bridgelet-sdk backend URL.');
  }
  if (!process.env.BRIDGELET_SDK_TOKEN) {
    errors.push('Missing BRIDGELET_SDK_TOKEN: server-side Route Handlers require a JWT signed with the SDK JWT_SECRET.');
  }
}

// Token format check: ensure single unbroken line
if (process.env.BRIDGELET_SDK_TOKEN) {
  const token = process.env.BRIDGELET_SDK_TOKEN.trim();
  if (token.includes('\n') || token.includes('\r')) {
    errors.push('BRIDGELET_SDK_TOKEN must be a single unbroken line without newline characters.');
  }
}

// Public API Base URL format check
if (process.env.NEXT_PUBLIC_API_BASE_URL) {
  try {
    new URL(process.env.NEXT_PUBLIC_API_BASE_URL);
  } catch {
    errors.push(Invalid NEXT_PUBLIC_API_BASE_URL: "" is not a valid URL.);
  }
}

// Secret leakage guard: ensure no server secrets have NEXT_PUBLIC_ prefix
for (const key of Object.keys(process.env)) {
  if (key.startsWith('NEXT_PUBLIC_') && (key.includes('SECRET') || key.includes('TOKEN') || key.includes('PRIVATE_KEY'))) {
    errors.push(CRITICAL SECURITY LEAK: "" contains sensitive keyword under client-exposed NEXT_PUBLIC_ prefix.);
  }
}

if (errors.length > 0) {
  console.error('\nâŒ Environment Validation Failed:');
  for (const err of errors) {
    console.error(  - );
  }
  console.error('\nPlease verify your environment variables against frontend/.env.example and docs.\n');
  process.exit(1);
} else {
  console.log('âœ… Environment configuration validated successfully.');
  process.exit(0);
}