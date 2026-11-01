#!/usr/bin/env node

/**
 * Automated Analytics Event Spec-vs-Code Drift Verification (#875)
 *
 * Extracts event names from:
 * 1. docs/analytics-spec.md (#### `Event Name` headings)
 * 2. frontend/lib/analytics.ts (ClaimEvent union string literals)
 * 3. mobile/app/src/analytics/analytics.ts & mobile/services/analytics/index.ts (AnalyticsEvent discriminators)
 *
 * Fails with exit code 1 if any drift exists (spec-only or code-only events).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const specPath = path.join(rootDir, 'docs/analytics-spec.md');
const frontendPath = path.join(rootDir, 'frontend/lib/analytics.ts');
const mobileAppPath = path.join(rootDir, 'mobile/app/src/analytics/analytics.ts');
const mobileServicesPath = path.join(rootDir, 'mobile/services/analytics/index.ts');

function extractSpecEvents() {
  const content = fs.readFileSync(specPath, 'utf8');
  const regex = /^#### `([^`]+)`/gm;
  const events = new Set();
  let match;
  while ((match = regex.exec(content)) !== null) {
    events.add(match[1].trim());
  }
  return events;
}

function extractFrontendEvents() {
  const content = fs.readFileSync(frontendPath, 'utf8');
  const unionMatch = content.match(/type ClaimEvent\s*=([\s\S]+?);/);
  const events = new Set();
  if (unionMatch) {
    const rawUnion = unionMatch[1];
    const itemRegex = /'([^']+)'/g;
    let match;
    while ((match = itemRegex.exec(rawUnion)) !== null) {
      events.add(match[1].trim());
    }
  }
  return events;
}

function extractMobileEvents() {
  const events = new Set();
  const candidates = [mobileServicesPath, mobileAppPath];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      const itemRegex = /name:\s*"([^"]+)"/g;
      let match;
      while ((match = itemRegex.exec(content)) !== null) {
        events.add(match[1].trim());
      }
    }
  }
  return events;
}

function run() {
  const specEvents = extractSpecEvents();
  const frontendEvents = extractFrontendEvents();
  const mobileEvents = extractMobileEvents();

  const codeEvents = new Set([...frontendEvents, ...mobileEvents]);

  const specOnly = [...specEvents].filter((e) => !codeEvents.has(e)).sort();
  const codeOnly = [...codeEvents].filter((e) => !specEvents.has(e)).sort();

  console.log(`Audited ${specEvents.size} spec events against ${codeEvents.size} code events.`);
  console.log(`- Frontend ClaimEvent entries: ${frontendEvents.size}`);
  console.log(`- Mobile AnalyticsEvent entries: ${mobileEvents.size}`);

  const hasDrift = specOnly.length > 0 || codeOnly.length > 0;

  // Build GitHub Actions step summary if running in CI
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    let summary = `## Analytics Spec vs Code Drift Audit (#875)\n\n`;
    summary += `Audited **${specEvents.size}** spec events against **${codeEvents.size}** code events.\n\n`;
    if (!hasDrift) {
      summary += `✅ **Zero drift detected.** All event names in \`docs/analytics-spec.md\` and codebase are 100% synchronized.\n`;
    } else {
      summary += `❌ **Drift detected between spec and implementation:**\n\n`;
      if (specOnly.length > 0) {
        summary += `### In Spec but Not in Code (${specOnly.length})\n`;
        specOnly.forEach((e) => (summary += `- \`${e}\`\n`));
      }
      if (codeOnly.length > 0) {
        summary += `\n### In Code but Not in Spec (${codeOnly.length})\n`;
        codeOnly.forEach((e) => (summary += `- \`${e}\`\n`));
      }
    }
    fs.appendFileSync(summaryFile, summary);
  }

  if (hasDrift) {
    console.error(`\n❌ Error: Analytics spec drift detected!`);
    if (specOnly.length > 0) {
      console.error(`Spec only (${specOnly.length}):`, specOnly);
    }
    if (codeOnly.length > 0) {
      console.error(`Code only (${codeOnly.length}):`, codeOnly);
    }
    process.exit(1);
  }

  console.log('✅ Spec-vs-code drift check passed cleanly: 0 spec-only, 0 code-only.');
}

run();
