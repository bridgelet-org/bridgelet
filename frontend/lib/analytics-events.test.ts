import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ANALYTICS_SPEC_EVENT_NAMES,
  TOTAL_SPEC_EVENT_COUNT,
  isAnalyticsEventName,
} from './analytics-events';

describe('Analytics Spec Events Source of Truth (#890)', () => {
  it('defines exactly 34 canonical events in ANALYTICS_SPEC_EVENT_NAMES', () => {
    expect(ANALYTICS_SPEC_EVENT_NAMES.length).toBe(34);
    expect(TOTAL_SPEC_EVENT_COUNT).toBe(34);
  });

  it('contains no duplicate event names in the single source of truth', () => {
    const unique = new Set(ANALYTICS_SPEC_EVENT_NAMES);
    expect(unique.size).toBe(ANALYTICS_SPEC_EVENT_NAMES.length);
  });

  it('matches all 34 event names in docs/analytics-spec.md (§4–§6) with zero drift', () => {
    // Locate docs/analytics-spec.md relative to repo root
    const specPath = path.resolve(__dirname, '../../docs/analytics-spec.md');
    expect(fs.existsSync(specPath)).toBe(true);

    const specContent = fs.readFileSync(specPath, 'utf-8');

    // Extract headings matching `#### `Event Name`` under §4, §5, and §6
    // §4 starts at "## 4. Sender Journey Events"
    // §7 starts at "## 7. Conversion Funnel Definitions"
    const catalogMatch = specContent.match(
      /## 4\. Sender Journey Events[\s\S]*?(?=## 7\. Conversion Funnel Definitions)/
    );
    expect(catalogMatch).toBeTruthy();
    const catalogSection = catalogMatch![0];

    const headingRegex = /^#### `([^`]+)`/gm;
    const extractedEvents: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(catalogSection)) !== null) {
      if (match[1]) {
        extractedEvents.push(match[1]);
      }
    }

    // Expect exactly 34 catalog events in the spec
    expect(extractedEvents.length).toBe(34);

    // Assert strict bi-directional equivalence
    expect(new Set(extractedEvents)).toEqual(new Set(ANALYTICS_SPEC_EVENT_NAMES));

    // Verify ordering matches the spec catalog exactly
    expect(extractedEvents).toEqual([...ANALYTICS_SPEC_EVENT_NAMES]);
  });

  it('correctly validates event names with isAnalyticsEventName type guard', () => {
    expect(isAnalyticsEventName('Page Viewed')).toBe(true);
    expect(isAnalyticsEventName('Payment Created')).toBe(true);
    expect(isAnalyticsEventName('Claim Succeeded')).toBe(true);
    expect(isAnalyticsEventName('Error Displayed')).toBe(true);
    expect(isAnalyticsEventName('Retry Clicked')).toBe(true);

    // Non-existent or typo names must return false
    expect(isAnalyticsEventName('page_viewed')).toBe(false);
    expect(isAnalyticsEventName('Unknown Event')).toBe(false);
    expect(isAnalyticsEventName('')).toBe(false);
  });
});
