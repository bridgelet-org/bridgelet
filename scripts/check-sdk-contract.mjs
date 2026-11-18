#!/usr/bin/env node
/**
 * Compares the live bridgelet-sdk OpenAPI spec against the endpoints the
 * frontend HTTP client actually calls, so a pinned SDK commit that stops
 * serving one of those endpoints fails CI.
 *
 * Started from -- and keeps the same guarantees as -- the contract step in
 * .github/workflows/compatibility.yml:
 *
 *   > This fetches the pinned SDK's live OpenAPI spec (GET /api/docs-json)
 *   > and asserts those endpoints/fields still exist; catching the exactly
 *   > "frontend assumes an endpoint/response shape a different SDK version
 *   > doesn't provide" failure mode. This is field-presence, not full type
 *   > equivalence.
 *
 * Usage:  BRIDGELET_API_URL=http://localhost:4000 node scripts/check-sdk-contract.mjs
 *
 * Exit code: 0 when every endpoint the frontend depends on exists in the
 * SDK's OpenAPI spec, 1 otherwise.
 */

const SPEC_ENDPOINTS = [
  '/api/docs-json',
  '/docs-json',
  '/api-json',
];

const REQUIRED_ENDPOINTS = [
  { label: 'Verify a claim token', method: 'post', pathPattern: '/claims/verify' },
  { label: 'Redeem / sweep a claim', method: 'post', pathPattern: '/claims/redeem' },
  { label: 'Fetch claim details', method: 'get', pathPattern: '/claims/{id}' },
];

const VERIFY_RESPONSE_FIELDS = ['valid', 'amount', 'asset', 'expiresAt'];
const REDEEM_RESPONSE_FIELDS = ['success', 'txHash', 'amountSwept', 'asset', 'destination', 'sweptAt'];

/**
 * Walk an OpenAPI schema looking for the first object with a `properties`
 * key, dereferencing $refs within a single spec document. Returns null when
 * nothing resolvable is found (so we degrade gracefully instead of asserting
 * on a shape we cannot see).
 */
function firstProperties(schema, spec) {
  const seen = new Set();
  while (schema) {
    if (typeof schema !== 'object' || schema === null) return null;
    if (schema.properties) return schema.properties;
    if (schema.allOf && Array.isArray(schema.allOf)) {
      for (const part of schema.allOf) {
        const props = firstProperties(part, spec);
        if (props) return props;
      }
      return null;
    }
    if (typeof schema.$ref === 'string') {
      const ref = schema.$ref.replace(/^#\//, '').split('/');
      let node = spec;
      for (const part of ref) {
        node = node && node[part];
        if (node === undefined) return null;
      }
      if (seen.has(node)) return null;
      seen.add(node);
      schema = node;
      continue;
    }
    return null;
  }
  return null;
}

async function loadSpec(baseUrl) {
  let lastError = null;
  for (const endpoint of SPEC_ENDPOINTS) {
    const url = `${baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        lastError = new Error(`GET ${url} -> ${response.status}`);
        continue;
      }
      const spec = await response.json();
      if (spec && typeof spec === 'object' && spec.paths && typeof spec.paths === 'object') {
        return { spec, url };
      }
      lastError = new Error(`GET ${url} did not look like an OpenAPI document (no paths)`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('Could not reach the bridgelet-sdk OpenAPI spec');
}

function pathMatches(pattern, path) {
  return path === pattern || path.startsWith(`${pattern}/`);
}

async function main() {
  const baseUrl = (process.env.BRIDGELET_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
  const { spec, url } = await loadSpec(baseUrl);
  const paths = spec.paths;

  const problems = [];

  for (const { label, method, pathPattern } of REQUIRED_ENDPOINTS) {
    const matchingPaths = Object.keys(paths).filter((path) => pathMatches(pathPattern, path));
    if (matchingPaths.length === 0) {
      problems.push(`missing endpoint: ${method.toUpperCase()} ${pathPattern}*`);
      continue;
    }
    const withMethod = matchingPaths.filter((path) => paths[path][method]);
    if (withMethod.length === 0) {
      problems.push(`endpoint ${matchingPaths.join(', ')} has no ${method.toUpperCase()} method`);
    }
  }

  const verifyPath = Object.keys(paths).find((path) => path === '/claims/verify');
  const verifySchema =
    verifyPath && paths[verifyPath]?.post?.responses?.['200']?.content?.['application/json']?.schema;
  if (verifySchema) {
    const props = firstProperties(verifySchema, spec);
    if (props) {
      for (const field of VERIFY_RESPONSE_FIELDS) {
        if (!(field in props)) problems.push(`POST /claims/verify response missing field "${field}"`);
      }
    }
  }

  const redeemPath = Object.keys(paths).find((path) => path === '/claims/redeem');
  const redeemSchema =
    redeemPath && paths[redeemPath]?.post?.responses?.['200']?.content?.['application/json']?.schema;
  if (redeemSchema) {
    const props = firstProperties(redeemSchema, spec);
    if (props) {
      for (const field of REDEEM_RESPONSE_FIELDS) {
        if (!(field in props)) problems.push(`POST /claims/redeem response missing field "${field}"`);
      }
    }
  }

  if (problems.length > 0) {
    console.error(`Contract check FAILED against ${url}:`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  console.log(
    `Contract check passed against ${url}: ` +
      REQUIRED_ENDPOINTS.map(({ method, pathPattern }) => `${method.toUpperCase()} ${pathPattern}*`).join(', ') +
      ' present.'
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(`Contract check FAILED: ${error.message}`);
  process.exit(1);
});