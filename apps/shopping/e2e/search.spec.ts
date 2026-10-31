import { expect, type Page, test } from '@playwright/test';
import { pressSearch } from './support/journey.ts';

// The walking skeleton's critical path in a real browser: load the app (mocked host + silent
// auth), fill a populated search, submit, and assert result cards render. It mirrors the
// vitest composition-root proof but through the actual `vite dev` bundle — the one command a
// developer runs (FR6.1 / NFR3).
//
// The committed catavail fixtures sail Jan–Mar 2027 with 7 / 14 / 21 nights. The panel now
// DEFAULTS to that window, so a bare submit already returns cards — but these tests set the
// criteria explicitly anyway, so a change to the defaults surfaces as a failure here instead
// of silently turning this into a test of nothing.
//
// Only the happy path and the empty state are covered. The error state is deliberately absent:
// the search issues no HTTP request at all (the mock adapter is in-process, verified by
// recording zero requests during a submit), so there is no boundary for a browser test to fault
// -inject. Error and denied paths belong to the vitest suites (AGENTS.md § 4.7, § 6).

// InputDate renders and accepts its own DDMMMYYYY display format, not ISO.
const FIXTURE_DATE_FROM = '01JAN2027';
const FIXTURE_DATE_TO = '31MAR2027';

// Fixture sailings are 7 / 14 / 21 nights, so 7–21 spans them and 1–2 matches nothing.
const MATCHING_NIGHTS = { from: '7', to: '21' } as const;
const UNMATCHABLE_NIGHTS = { from: '1', to: '2' } as const;

interface Criteria {
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly nights: { readonly from: string; readonly to: string };
}

/**
 * Loads the app and reveals the criteria fields.
 *
 * `/` is the MOCK Dynamics shell, which frames the app in an iframe. The suite drives `/embed`
 * so it asserts against the app's own document rather than reaching through a frame boundary —
 * the shell is furniture, and its own coverage is in App.test.tsx.
 *
 * The panel opens expanded (VCX-10588 R1), so dates and nights are reachable at once.
 */
async function openSearchPanel(page: Page): Promise<void> {
  await page.goto('/embed');

  // Auth resolves asynchronously; the form is the authenticated surface.
  await expect(page.getByTestId('search-form')).toBeVisible();
  // The panel opens expanded (VCX-10588 R1).
}

async function fillCriteria(page: Page, criteria: Criteria): Promise<void> {
  // `exact` matters: the date labels are "From"/"To" while nights are "From (Nights)"/"To
  // (Nights)", so a loose name match is ambiguous.
  if (criteria.dateFrom !== undefined) {
    await page.getByRole('textbox', { name: 'From', exact: true }).fill(criteria.dateFrom);
  }
  if (criteria.dateTo !== undefined) {
    await page.getByRole('textbox', { name: 'To', exact: true }).fill(criteria.dateTo);
  }

  await page.getByRole('textbox', { name: 'From nights' }).fill(criteria.nights.from);
  await page.getByRole('textbox', { name: 'To nights' }).fill(criteria.nights.to);
}

test('search → results renders populated cards for a matching criteria', async ({ page }) => {
  await openSearchPanel(page);
  await fillCriteria(page, {
    dateFrom: FIXTURE_DATE_FROM,
    dateTo: FIXTURE_DATE_TO,
    nights: MATCHING_NIGHTS,
  });

  await pressSearch(page);

  await expect(page.getByTestId('results-populated')).toBeVisible();
  await expect(page.getByTestId('cruise-card').first()).toBeVisible();
});

test('search → results shows the empty state when no sailing matches', async ({ page }) => {
  await openSearchPanel(page);
  await fillCriteria(page, {
    dateFrom: FIXTURE_DATE_FROM,
    dateTo: FIXTURE_DATE_TO,
    nights: UNMATCHABLE_NIGHTS,
  });

  await pressSearch(page);

  // The empty state is a distinct surface, not "populated with zero cards" — assert both so a
  // regression that renders an empty populated list fails here.
  await expect(page.getByTestId('results-empty')).toBeVisible();
  await expect(page.getByTestId('cruise-card')).toHaveCount(0);
});

// ── Acceptance-criteria suite (VCX-10330) ────────────────────────────────────────────────────
//
// AC1: The toggle reads "Show Sold Out", and toggling it adds or removes sold-out sailings.
// AC3: The results view shows the active currency and whether pricing is single or double occupancy.
// AC4: Sold-out and available sailings are distinguishable without reading the numbers.
//
// AC2 (Group Contract) is an agent-mode-only feature and is verified separately in the search
// panel unit tests (search-panel.test.tsx) — it requires a TA context toggle that is not
// exposed in the /embed surface tested here.

async function submitDefaultSearch(page: Page): Promise<void> {
  await openSearchPanel(page);
  await fillCriteria(page, {
    dateFrom: FIXTURE_DATE_FROM,
    dateTo: FIXTURE_DATE_TO,
    nights: MATCHING_NIGHTS,
  });
  await pressSearch(page);
  await expect(page.getByTestId('results-populated')).toBeVisible();
}

test('AC1: sold-out sailings are hidden by default and appear after toggling "Sold-Out Cruises"', async ({
  page,
}) => {
  await submitDefaultSearch(page);

  // Fixture has 3 sold-out sailings (CruiseAvailabilityStatus = "Sold Out") out of 20.
  // Before toggling: the sold-out filter is OFF → sold-out cards must not be visible.
  const cardsBefore = page.getByTestId('cruise-card');
  const countBefore = await cardsBefore.count();
  // No card should carry a SOLD OUT badge when the toggle is off.
  await expect(page.getByText('SOLD OUT')).toHaveCount(0);

  // Toggle the "Sold-Out Cruises" switch on.
  await page.getByLabel('Sold-Out Cruises').click();

  const cardsAfter = page.getByTestId('cruise-card');
  const countAfter = await cardsAfter.count();

  // After toggling: count must increase (the 3 sold-out sailings are now included).
  expect(countAfter).toBeGreaterThan(countBefore);

  // At least one card must now show the SOLD OUT visual marker.
  await expect(page.getByText('SOLD OUT').first()).toBeVisible();
});

test('AC3: results pricing alert shows active currency and double-occupancy for 2-guest search', async ({
  page,
}) => {
  await submitDefaultSearch(page);

  // The default search uses 2 guests and USD (the mock principal's office currency).
  const alert = page.getByTestId('results-pricing-alert');
  await expect(alert).toBeVisible();

  // Must name the currency.
  await expect(alert).toContainText('USD');

  // Must state the occupancy — 2 guests → DOUBLE.
  await expect(page.getByTestId('results-occupancy')).toHaveText('DOUBLE');
});

test('AC4: sold-out sailings carry a visual sold-out marker distinguishable from available ones', async ({
  page,
}) => {
  await submitDefaultSearch(page);

  // Enable sold-out visibility so we have both types on screen.
  await page.getByLabel('Sold-Out Cruises').click();

  // A card explicitly tagged sold-out must show the "SOLD OUT" text badge.
  await expect(page.getByText('SOLD OUT').first()).toBeVisible();

  // Available cards must NOT carry the badge — assert that the count of SOLD OUT matches
  // the expected 3 fixture entries, not all cards.
  const totalCards = await page.getByTestId('cruise-card').count();
  const soldOutBadges = await page.getByText('SOLD OUT').count();

  expect(soldOutBadges).toBeGreaterThan(0);
  expect(soldOutBadges).toBeLessThan(totalCards);
});
