#!/usr/bin/env node
/**
 * #890: Analytics Spec Event Drift Checker
 *
 * Verifies that the TypeScript analytics event definitions in
 * `frontend/lib/analytics-events.ts` stay in 100% lockstep with the canonical
 * event catalog in `docs/analytics-spec.md` (§4–§6).
 *
 * Usage: node scripts/check-analytics-spec-drift.mjs
 * Exit code: 0 on match, 1 on divergence/drift.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const SPEC_FILE = path.join(ROOT_DIR, 'docs', 'analytics-spec.md');
const TS_FILE = path.join(ROOT_DIR, 'frontend', 'lib', 'analytics-events.ts');

if (!fs.existsSync(SPEC_FILE)) {
  console.error(`❌ Spec file not found: ${SPEC_FILE}`);
  process.exit(1);
}

if (!fs.existsSync(TS_FILE)) {
  console.error(`❌ TypeScript definitions file not found: ${TS_FILE}`);
  process.exit(1);
}

// 1. Extract event names from docs/analytics-spec.md
const specContent = fs.readFileSync(SPEC_FILE, 'utf-8');
const catalogMatch = specContent.match(
  /## 4\. Sender Journey Events[\s\S]*?(?=## 7\. Conversion Funnel Definitions)/
);

if (!catalogMatch) {
  console.error('❌ Could not locate sections §4–§6 in docs/analytics-spec.md');
  process.exit(1);
}

const headingRegex = /^#### `([^`]+)`/gm;
const specEvents = [];
let match;
while ((match = headingRegex.exec(catalogMatch[0])) !== null) {
  specEvents.push(match[1]);
}

// 2. Extract event names from frontend/lib/analytics-events.ts
const tsContent = fs.readFileSync(TS_FILE, 'utf-8');
const arrayMatch = tsContent.match(/export const ANALYTICS_SPEC_EVENT_NAMES = \[([\s\S]*?)\] as const;/);
if (!arrayMatch) {
  console.error('❌ Could not locate ANALYTICS_SPEC_EVENT_NAMES in analytics-events.ts');
  process.exit(1);
}

const tsEvents = [...arrayMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]);

console.log(`🔍 Checking analytics event catalog drift...`);
console.log(`   Spec events count (§4–§6): ${specEvents.length}`);
console.log(`   TypeScript event union count: ${tsEvents.length}`);

let hasDrift = false;

if (specEvents.length !== 34) {
  console.warn(`⚠️ Warning: Expected 34 events in spec, found ${specEvents.length}`);
}

const missingInTs = specEvents.filter(e => !tsEvents.includes(e));
if (missingInTs.length > 0) {
  hasDrift = true;
  console.error(`❌ Events in spec but missing from TypeScript union:`);
  for (const e of missingInTs) console.error(`   - "${e}"`);
}

const extraInTs = tsEvents.filter(e => !specEvents.includes(e));
if (extraInTs.length > 0) {
  hasDrift = true;
  console.error(`❌ Events in TypeScript union but not found in spec:`);
  for (const e of extraInTs) console.error(`   - "${e}"`);
}

if (hasDrift) {
  console.error(`\n❌ Drift detected between docs/analytics-spec.md and frontend/lib/analytics-events.ts!`);
  process.exit(1);
}

console.log(`✅ Zero drift: All ${specEvents.length} analytics events match exactly between spec and TypeScript types.\n`);
process.exit(0);
