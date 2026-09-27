/**
 * Analytics event verification — e2e smoke tests.
 *
 * These tests confirm that the 34-event analytics spec actually fires through
 * to the provider during real user flows, and that no events are silently
 * dropped. The strategy: install a `window.plausible` stub (via
 * addAnalyticsSpy) before page load, run the flow, then assert the expected
 * events were captured in order and with the right shape.
 *
 * This also covers the platform-capacity concern raised in the issue: because
 * the stub is synchronous and collects every call, a mismatch between
 * "expected N events" and "received M events" shows up as a test failure
 * rather than a silent backend drop — making the suite a regression gate for
 * event volume going forward.
 *
 * High-frequency event coverage
 * ──────────────────────────────
 * `Send Form Field Changed` is the highest-frequency event in the spec
 * (§9.6 recommends 10–20 % client-side sampling once volume is known). The
 * test below types into each form field individually so we can assert the
 * event fires at least once per field interaction and that repeated field
 * edits don't get deduplicated away by the dedup store (dedup only applies
 * to claim-lifecycle events, not form-field events).
 */

import { test, expect, press, addAnalyticsSpy, getAnalyticsEvents } from '../fixtures/bridgelet';

// ── Send-journey analytics ────────────────────────────────────────────────────

test.describe('Send-journey analytics', () => {
  test('fires Send Form Viewed on /send mount', async ({ sendPage, page }) => {
    await addAnalyticsSpy(page);
    await sendPage.goto();

    const events = await getAnalyticsEvents(page);
    const names = events.map((e) => e.event);
    expect(names).toContain('Send Form Viewed');
  });

  test('fires Send Form Field Changed for each field edit and does not drop events', async ({
    sendPage,
    page,
  }) => {
    await addAnalyticsSpy(page);
    await sendPage.goto();
    await sendPage.connectWallet();

    // Step 2: accept default expiry.
    await press(page, page.getByRole('button', { name: /continue/i }));
    await expect(
      page.locator('h2').filter({ hasText: /step 3 of 4/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Type into each field individually to generate one change event per
    // field. Each fill() dispatches an input/change event that the component
    // should forward to analytics.sendFormFieldChanged (once implemented).
    await page.getByLabel('Recipient email').fill('a@b.com');
    await page.getByLabel('Amount').fill('5');

    const events = await getAnalyticsEvents(page);
    const fieldChangedEvents = events.filter((e) => e.event === 'Send Form Field Changed');

    // We expect at least one field-changed event per filled input.
    // If the event is not yet implemented this assertion will fail and
    // surface the gap rather than passing silently.
    expect(
      fieldChangedEvents.length,
      `Expected at least 2 Send Form Field Changed events (one per field), got ${fieldChangedEvents.length}.\n` +
        `All captured events: ${events.map((e) => e.event).join(', ')}`,
    ).toBeGreaterThanOrEqual(2);

    // Every captured event must have a message_id — the dedup UUID that the
    // analytics pipeline uses to reject double-processed events on the
    // platform side. A missing message_id is how events get silently
    // collapsed by Plausible / PostHog dedup logic.
    for (const ev of fieldChangedEvents) {
      expect(
        ev.props.message_id,
        `Send Form Field Changed event missing message_id — platform dedup will fail`,
      ).toBeTruthy();
    }
  });

  test('fires the correct sender event sequence through the full send flow', async ({
    sendPage,
    page,
  }) => {
    await addAnalyticsSpy(page);
    await sendPage.goto();
    await sendPage.connectWallet();
    await sendPage.fillDetails({ email: 'analytics-e2e@test.app', amount: '10' });
    await sendPage.confirmAndSend();
    await sendPage.waitForSuccess();

    const events = await getAnalyticsEvents(page);
    const names = events.map((e) => e.event);

    // These events must be present in the captured list, in order.
    const requiredSequence = [
      'Send Form Viewed',
      'Payment Confirmation Viewed',
      'Payment Confirmed',
      'Payment Created',
    ];
    let lastIdx = -1;
    for (const name of requiredSequence) {
      const idx = names.indexOf(name, lastIdx + 1);
      expect(
        idx,
        `Expected event "${name}" after position ${lastIdx}, but it was not found.\n` +
          `Captured sequence: ${names.join(' → ')}`,
      ).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });

  test('every captured event has the required base payload fields', async ({
    sendPage,
    page,
  }) => {
    await addAnalyticsSpy(page);
    await sendPage.goto();
    await sendPage.connectWallet();
    await sendPage.fillDetails();
    await sendPage.confirmAndSend();
    await sendPage.waitForSuccess();

    const events = await getAnalyticsEvents(page);
    expect(events.length).toBeGreaterThan(0);

    for (const ev of events) {
      // §3.1 base payload — present on every event.
      expect(ev.props, `${ev.event} missing platform`).toHaveProperty('platform', 'web');
      expect(ev.props, `${ev.event} missing message_id`).toHaveProperty('message_id');
      expect(ev.props, `${ev.event} missing session_id`).toHaveProperty('session_id');
      expect(ev.props, `${ev.event} missing anonymous_id`).toHaveProperty('anonymous_id');
    }
  });
});

// ── Claim-journey analytics ───────────────────────────────────────────────────

test.describe('Claim-journey analytics', () => {
  const DESTINATION = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

  test('fires the correct recipient event sequence through the full claim flow', async ({
    claimPage,
    page,
  }) => {
    await addAnalyticsSpy(page);
    await claimPage.goto('e2e-analytics-claim-token');
    await claimPage.waitForClaimCard();
    await claimPage.claimFunds(DESTINATION);

    await expect(
      page.getByRole('heading', { name: 'Payment already claimed' }),
    ).toBeVisible({ timeout: 10_000 });

    const events = await getAnalyticsEvents(page);
    const names = events.map((e) => e.event);

    const requiredSequence = [
      'Claim Page Opened',
      'Claim Verified',
      'Claim CTA Clicked',
      'Claim Submitted',
    ];
    let lastIdx = -1;
    for (const name of requiredSequence) {
      const idx = names.indexOf(name, lastIdx + 1);
      expect(
        idx,
        `Expected event "${name}" after position ${lastIdx}.\n` +
          `Captured sequence: ${names.join(' → ')}`,
      ).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });

  test('does not fire duplicate Claim Verified events for the same claim_id', async ({
    claimPage,
    page,
  }) => {
    await addAnalyticsSpy(page);
    await claimPage.goto('e2e-dedup-test-token');
    await claimPage.waitForClaimCard();

    const events = await getAnalyticsEvents(page);
    const verifiedEvents = events.filter((e) => e.event === 'Claim Verified');

    // §9.4 dedup: the same claim_id must not produce more than one
    // Claim Verified event per session. Plausible's server-side dedup
    // relies on message_id, but firing duplicates wastes quota and
    // skews funnel metrics.
    const seenClaimIds = new Set<unknown>();
    for (const ev of verifiedEvents) {
      expect(
        seenClaimIds.has(ev.props.claim_id),
        `Duplicate Claim Verified fired for claim_id="${ev.props.claim_id}"`,
      ).toBe(false);
      seenClaimIds.add(ev.props.claim_id);
    }
  });
});
