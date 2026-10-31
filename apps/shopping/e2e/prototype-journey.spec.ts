import { expect, type Page, test } from '@playwright/test';
import {
  CRUISE_TAB_LABELS,
  closeBreakdown,
  configureRoundTripAir,
  expectFareBilled,
  gotoTab,
  openBreakdown,
  openCruiseFromResults,
  readAirSummary,
  readCategorySelection,
  readGrossTotal,
  readGuestColumns,
  runWideSearch,
  selectCheapestFare,
  selectFirstExtension,
  selectFirstStateroom,
  WALKABLE_CRUISES,
} from './support/journey.ts';

/*
  VCX-10322 — the prototype walked end to end, once per walkable sailing.

  Scope: the epic's seven surfaces from Search through Viking Air, with the Build Panel
  (VCX-10335) checked at every step. Only the three sailings in WALKABLE_CRUISES carry
  itinerary / stateroom / extension / air data, so the AC for those four tabs scopes to them
  (epic comment, ADR-0011).

  The assertions are deliberately CROSS-SURFACE. Each step reads the price a tab advertises and
  then requires the Build Panel to itemise that exact figure — because the defect class this
  suite exists to catch is a panel that totals something the agent never chose. Asserting
  against fixture constants instead would go green on precisely that bug.

  Two arithmetic invariants are re-checked after every mutation, per VCX-10335 R3.6:
    · every guest total equals the sum of that guest's category subtotals
    · the gross total equals the sum of the guest totals
*/

/** The gateway and class used for every air selection — present in all three air payloads. */
const AIR_SELECTION = { gateway: /Albany International Airport - ALB/, serviceClass: /Business/ };

/** Floating-point money: compare to the cent, not to the bit. */
const CENTS = 2;

interface Totals {
  gross: number;
  guests: { label: string; total: number; subtotalSum: number }[];
}

/**
 * Opens the breakdown, reads every figure out of it, and closes it again.
 *
 * Closing matters: the drawer overlays the tab content with a dimmed backdrop (R3.1), so a
 * step that left it open would find the next tab's controls unclickable.
 */
async function readTotals(page: Page): Promise<Totals> {
  await openBreakdown(page);
  const gross = await readGrossTotal(page);
  const columns = await readGuestColumns(page);
  await closeBreakdown(page);

  return {
    gross,
    guests: columns.map((column) => ({
      label: column.label,
      total: column.total.value,
      subtotalSum: column.subtotals.reduce((sum, row) => sum + row.value, 0),
    })),
  };
}

/**
 * R3.6: every guest total is the sum of its subtotals, and the gross is the sum of those.
 *
 * Soft, like every value assertion in this walk. A journey test that stopped at the first
 * mismatch would report one discrepancy per run and hide the rest behind it; soft assertions
 * walk the whole journey and fail the test at the end with every disagreement listed — which
 * is what makes one run a usable defect report rather than a single breadcrumb.
 */
function expectTotalsAddUp(totals: Totals, step: string): void {
  for (const guest of totals.guests) {
    expect
      .soft(guest.total, `${step}: ${guest.label} total must equal the sum of its subtotals`)
      .toBeCloseTo(guest.subtotalSum, CENTS);
  }

  const sumOfGuests = totals.guests.reduce((sum, guest) => sum + guest.total, 0);
  expect
    .soft(totals.gross, `${step}: gross total must equal the sum of the guest totals`)
    .toBeCloseTo(sumOfGuests, CENTS);
}

for (const cruise of WALKABLE_CRUISES) {
  test.describe(`${cruise.id} — ${cruise.name}`, () => {
    test('search → itinerary → staterooms → extensions → Viking Air keeps the Build Panel accurate', async ({
      page,
    }) => {
      // ── Search → Results → the sailing ─────────────────────────────────────────────────────
      await runWideSearch(page);
      await openCruiseFromResults(page, cruise.id);

      // ── Itinerary: the panel is present and consistent before anything is chosen ───────────
      await expect(page.getByTestId('cruise-details')).toContainText(cruise.id);
      expectTotalsAddUp(await readTotals(page), 'itinerary, nothing selected');

      // ── Staterooms: the quoted fare must reach the breakdown ───────────────────────────────
      await gotoTab(page, 'Staterooms');
      await expect(page.getByTestId('staterooms-tab')).toBeVisible();

      const fare = await selectCheapestFare(page);

      // VCX-10332 R3.1: the summary panel echoes the option the agent picked — "the full
      // category name followed by its category acronym followed by the price option number
      // (e.g. 'Deluxe Veranda DV3')". The badge on the row IS that identity, so the panel and
      // the row must name the same option.
      expect
        .soft(
          await readCategorySelection(page),
          `the Category Selection panel must name the option the agent picked (${fare.badge})`,
        )
        .toContain(fare.badge);

      const cabin = await selectFirstStateroom(page);
      await expectFareBilled(page, fare);

      const afterStateroom = await readTotals(page);
      expectTotalsAddUp(afterStateroom, 'stateroom selected');

      // The fare the grid advertised is per passenger, so it lands once in each guest column.
      await openBreakdown(page);
      const stateroomColumns = await readGuestColumns(page);
      for (const column of stateroomColumns) {
        const cruiseFare = column.lines.find((row) => /cruise .*fare/i.test(row.label));
        expect.soft(cruiseFare, `${column.label} must itemise a cruise fare line`).toBeDefined();
        expect
          .soft(
            cruiseFare?.value,
            `${column.label}: the breakdown must bill the fare the agent picked (${fare.badge})`,
          )
          .toBeCloseTo(fare.price, CENTS);
      }

      // R3.2: the header names the stateroom the agent holds.
      expect
        .soft(await expandedPanelHeader(page), 'the header must name the held cabin')
        .toContain(cabin);
      await closeBreakdown(page);

      // ── Extensions: a selected card must appear as its own line at its own price ───────────
      await gotoTab(page, 'Extensions');
      await expect(page.getByTestId('extensions-tab')).toBeVisible();

      const beforeExtension = await readGrossTotal(page);
      const extension = await selectFirstExtension(page);

      await openBreakdown(page);
      const extensionColumns = await readGuestColumns(page);
      for (const column of extensionColumns) {
        const line = column.lines.find((row) => row.value === extension.price);
        expect
          .soft(line, `${column.label} must itemise the selected extension at its card price`)
          .toBeDefined();
      }
      await closeBreakdown(page);

      const afterExtension = await readTotals(page);
      expectTotalsAddUp(afterExtension, 'extension selected');
      // Priced per person, so one selection moves the gross by its price times the guest count.
      expect
        .soft(
          afterExtension.gross - beforeExtension,
          'selecting an extension must move the gross by its per-person price for every guest',
        )
        .toBeCloseTo(extension.price * afterExtension.guests.length, CENTS);

      // ── Viking Air: the tab's Airfare Total must be the panel's Viking Air Subtotal ────────
      await gotoTab(page, 'Viking Air');
      await expect(page.getByTestId('viking-air-tab')).toBeVisible();

      // A cabin category is already chosen, so the gate is open and the controls are live (R3).
      await expect(page.getByTestId('viking-air-cabin-banner')).toBeHidden();

      await configureRoundTripAir(page, 0, AIR_SELECTION);

      const summaryRows = await readAirSummary(page, 0);
      const airTotal = summaryRows.find((row) => /airfare total/i.test(row.label));
      expect(airTotal, 'the Airfare Summary must settle on a priced total').toBeDefined();

      // R5.3: the summary's own arithmetic — total equals base less the discounts shown.
      // The discount row parses negative, so the check is an addition.
      const base = summaryRows.find((row) => /origin - return airfare/i.test(row.label));
      const discount = summaryRows.find((row) => /discount/i.test(row.label));
      expect
        .soft(airTotal?.value, 'R5.3: the Airfare Total must equal the base less its discounts')
        .toBeCloseTo((base?.value ?? 0) + (discount?.value ?? 0), CENTS);

      await openBreakdown(page);
      const airColumns = await readGuestColumns(page);
      const airSubtotal = airColumns[0]?.subtotals.find((row) => /viking air/i.test(row.label));
      expect
        .soft(airSubtotal, 'Guest 1 must carry a Viking Air subtotal once their airfare is priced')
        .toBeDefined();
      expect
        .soft(
          airSubtotal?.value,
          'the Build Panel must bill the same airfare the Viking Air tab quoted',
        )
        .toBeCloseTo(airTotal?.value ?? 0, CENTS);
      await closeBreakdown(page);

      expectTotalsAddUp(await readTotals(page), 'airfare selected');

      // ── Every selection survives a round trip through all four tabs ────────────────────────
      const beforeRoundTrip = await readTotals(page);
      await gotoTab(page, 'Itinerary');
      await gotoTab(page, 'Staterooms');
      await gotoTab(page, 'Extensions');
      await gotoTab(page, 'Viking Air');
      const afterRoundTrip = await readTotals(page);

      expect
        .soft(afterRoundTrip.gross, 'moving between tabs must not change what the agent has built')
        .toBeCloseTo(beforeRoundTrip.gross, CENTS);
      expectTotalsAddUp(afterRoundTrip, 'after a full tab round trip');
    });

    test('the Build Panel rides every cruise-detail tab and shows one figure throughout', async ({
      page,
    }) => {
      await runWideSearch(page);

      // R1: it must NOT be on the search screens.
      await expect(page.getByRole('button', { name: /breakdown/i })).toBeHidden();

      await openCruiseFromResults(page, cruise.id);

      const totals: number[] = [];
      for (const tab of CRUISE_TAB_LABELS) {
        await gotoTab(page, tab);
        // R2: collapsed, fixed to the foot, and carrying the gross total on every tab.
        const breakdown = page.getByRole('button', { name: /breakdown/i });
        await expect(breakdown, `${tab} must render the collapsed Build Panel`).toBeVisible();
        await expect(page.locator('[data-slot="build-panel-expanded"]')).toBeHidden();
        totals.push(await readGrossTotal(page));
      }

      expect(new Set(totals).size, 'the gross total must not change as tabs change').toBe(1);
    });

    test('the panel opens at zero until a cabin is selected', async ({ page }) => {
      await runWideSearch(page);
      await openCruiseFromResults(page, cruise.id);

      // VCX-10332: no cabin is pre-selected, so there is nothing to price yet. The old default
      // billed the first EVO category, which is the sailing's MOST expensive cabin.
      await expect(page.locator('footer[data-variant="zero"]')).toBeVisible();
      expect(await readGrossTotal(page)).toBe(0);
    });
  });
}

/** The expanded drawer's header run — cruise name, dates, ship, voyage, nights, stateroom. */
async function expandedPanelHeader(page: Page): Promise<string> {
  return (await page.locator('[data-slot="build-panel-expanded"] header').innerText()).replace(
    /\s+/g,
    ' ',
  );
}
