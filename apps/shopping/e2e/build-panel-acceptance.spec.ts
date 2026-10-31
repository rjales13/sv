import { expect, type Page, test } from '@playwright/test';
import {
  CRUISE_TAB_LABELS,
  closeBreakdown,
  expandedPanel,
  expectFareBilled,
  gotoTab,
  grossTotalBlock,
  openBreakdown,
  openCruiseFromResults,
  parseMoney,
  readGrossTotal,
  readGuestColumns,
  runWideSearch,
  selectCheapestFare,
  selectFirstStateroom,
  WALKABLE_CRUISES,
} from './support/journey.ts';

/*
  VCX-10335 — the Build Panel's acceptance criteria, asserted once rather than per sailing.

  The per-sailing walk lives in prototype-journey.spec.ts; what is here is sailing-independent:
  the panel's states, its controls, its header composition and its per-guest structure. One
  sailing is enough to prove them, so these run against the first walkable cruise.

  Where an assertion encodes an AC the prototype does not yet meet, it is left FAILING on
  purpose and annotated with the criterion it comes from. Weakening it to match the current
  behaviour would delete the only record that the gap exists.
*/

const CRUISE = WALKABLE_CRUISES[0];

/** The Travel Protection Plan's per-guest price (mock, per the Figma annotation). */
const TPP_PRICE = 749;

/** Opens the sailing with a cabin held, which is the state most of these AC describe. */
async function openCruiseWithCabin(page: Page): Promise<void> {
  await runWideSearch(page);
  await openCruiseFromResults(page, CRUISE.id);
  await gotoTab(page, 'Staterooms');
  const fare = await selectCheapestFare(page);
  await selectFirstStateroom(page);
  await expectFareBilled(page, fare);
}

test.describe('R1–R2 — where the panel renders, and how', () => {
  test('the panel is absent from search and collapsed on arrival at a cruise', async ({ page }) => {
    await runWideSearch(page);
    await expect(
      page.getByRole('button', { name: /breakdown/i }),
      'R1: the Build Panel must not render on the search screens',
    ).toBeHidden();

    await openCruiseFromResults(page, CRUISE.id);

    // R2: collapsed by default, showing BREAKDOWN, GROSS TOTAL, the value and the currency.
    await expect(expandedPanel(page)).toBeHidden();
    await expect(page.getByRole('button', { name: /breakdown/i })).toBeVisible();
    await expect(grossTotalBlock(page)).toContainText('Gross total', { ignoreCase: true });
    await expect(grossTotalBlock(page)).toContainText('USD');
  });

  test('the collapsed bar names the search currency exactly once', async ({ page }) => {
    await runWideSearch(page);
    await openCruiseFromResults(page, CRUISE.id);

    // R2 draws the total as a figure plus the search currency ("$49,680.00 USD"). The figure
    // and the code are separate elements, so the amount itself must not repeat the code.
    const amount = await grossTotalBlock(page)
      .locator('[data-slot="price-currency-amount"]')
      .innerText();

    expect(amount, 'the gross-total figure must not carry its own currency suffix').not.toMatch(
      /[A-Z]{3}\s*$/,
    );
  });
});

test.describe('R3 — the expanded breakdown', () => {
  test('expands from any tab, dims the content above it, and collapses again', async ({ page }) => {
    await runWideSearch(page);
    await openCruiseFromResults(page, CRUISE.id);

    for (const tab of CRUISE_TAB_LABELS) {
      await gotoTab(page, tab);
      const panel = await openBreakdown(page);

      // R3.1: a dimmed backdrop overlays the content above the drawer.
      await expect(page.locator('div.bg-black\\/50')).toBeVisible();
      await expect(panel.getByRole('button', { name: /collapse/i })).toBeVisible();

      await closeBreakdown(page);
    }
  });

  test('R3.2 — the header identifies the sailing and the held stateroom', async ({ page }) => {
    await openCruiseWithCabin(page);
    const panel = await openBreakdown(page);
    const header = (await panel.locator('header').innerText()).replace(/\s+/g, ' ');

    expect(header).toContain(CRUISE.name);
    expect(header).toContain(CRUISE.ship);
    expect(header).toContain(CRUISE.id);
    // Dates carry their day of week, e.g. "22MAR2027(MON)".
    expect(header).toMatch(/\d{2}[A-Z]{3}\d{4}\((MON|TUE|WED|THU|FRI|SAT|SUN)\)/);
    expect(header, 'the header must name the selected stateroom category and cabin').toMatch(
      /Cat\./i,
    );
  });

  test('R3.2 — the header shows cruise nights AND total nights', async ({ page }) => {
    await openCruiseWithCabin(page);
    const panel = await openBreakdown(page);
    const header = (await panel.locator('header').innerText()).replace(/\s+/g, ' ');

    // HID270322T sails 7 cruise nights inside an 11-night package: the AC asks for both, so a
    // hotel extension's nights are visible in the summary the agent reads aloud.
    expect(header).toMatch(/7 CRUISE NIGHTS/i);
    expect(header, 'R3.2: the header must also carry the package total nights').toMatch(
      /11 (TOTAL )?NIGHTS/i,
    );
  });

  test('R3.3 — one column per guest, each headed with its label and full name', async ({
    page,
  }) => {
    await openCruiseWithCabin(page);
    await openBreakdown(page);
    const columns = await readGuestColumns(page);

    // The default search is for two guests.
    expect(columns).toHaveLength(2);
    expect(columns[0]?.label).toMatch(/guest 1/i);
    expect(columns[1]?.label).toMatch(/guest 2/i);
    for (const column of columns) {
      expect(column.name, "each column must carry the guest's full name").not.toBe('');
    }
  });

  test('R3.4 — an eligible guest can add TPP; an ineligible one is told why', async ({ page }) => {
    await openCruiseWithCabin(page);
    const panel = await openBreakdown(page);
    const columns = panel.locator('fieldset');

    // Guest 1 is modelled as US-resident and therefore eligible.
    const tppCheckbox = columns.nth(0).getByRole('checkbox');
    await expect(tppCheckbox).toBeVisible();
    await expect(columns.nth(0)).toContainText('Travel Protection Plan');
    await expect(columns.nth(0)).toContainText(String(TPP_PRICE));

    // Guest 2 is not, so the reason stands in place of the control.
    await expect(columns.nth(1)).toContainText('TPP Non eligible guest (Non US Resident)');
    await expect(columns.nth(1).getByRole('checkbox')).toHaveCount(0);
  });

  test('R3.5/R3.6 — adding TPP bills it as its own line, not as an unexplained jump', async ({
    page,
  }) => {
    await openCruiseWithCabin(page);
    await openBreakdown(page);

    const before = await readGuestColumns(page);
    const beforeTotal = before[0]?.total.value ?? 0;

    await expandedPanel(page).locator('fieldset').nth(0).getByRole('checkbox').click();

    const after = await readGuestColumns(page);
    const afterTotal = after[0]?.total.value ?? 0;

    // The charge itself is right…
    expect(afterTotal - beforeTotal).toBeCloseTo(TPP_PRICE, 2);

    // …but R3.5 requires it to be ITEMISED, and R3.6 requires the column total to stay equal to
    // the sum of its subtotals. A total that moves without a line to explain it is exactly the
    // discrepancy an agent cannot defend on a call.
    const tppLine = after[0]?.rows.find((row) => /travel protection|TPP/i.test(row.label));
    expect(
      tppLine,
      'R3.5: an included Travel Protection Plan must render its own price line',
    ).toBeDefined();

    const subtotalSum = (after[0]?.subtotals ?? []).reduce((sum, row) => sum + row.value, 0);
    expect(
      afterTotal,
      'R3.6: the guest total must remain the sum of that guest column’s subtotals',
    ).toBeCloseTo(subtotalSum, 2);
  });

  test('R3.6 — the gross total equals the sum of the guest totals', async ({ page }) => {
    await openCruiseWithCabin(page);
    await openBreakdown(page);

    const gross = await readGrossTotal(page);
    const columns = await readGuestColumns(page);
    const sum = columns.reduce((total, column) => total + column.total.value, 0);

    expect(gross).toBeCloseTo(sum, 2);
  });
});

test.describe('R5 — the three actions', () => {
  test('all three render, in both states, and are visibly inert', async ({ page }) => {
    await runWideSearch(page);
    await openCruiseFromResults(page, CRUISE.id);

    // Collapsed, the primary CTA reads "Review Booking"; it becomes "Book Now" once expanded.
    const collapsedActions = ['Save Opportunity', 'Save Search', 'Review Booking'] as const;

    for (const name of collapsedActions) {
      await expect(page.getByRole('button', { name })).toBeVisible();
    }

    // R5: "present and visibly non-actionable, neither hidden nor wired" — no booking or save
    // can complete without the integrations that are out of scope, so an enabled control here
    // promises something the prototype cannot do.
    for (const name of collapsedActions) {
      await expect(
        page.getByRole('button', { name }),
        `R5: "${name}" must render visibly disabled in the prototype`,
      ).toBeDisabled();
    }

    const panel = await openBreakdown(page);
    const expandedActions = ['Save Opportunity', 'Save Search', 'Book Now'] as const;
    for (const name of expandedActions) {
      await expect(panel.getByRole('button', { name })).toBeVisible();
    }
  });
});

test.describe('R6 — recalculating', () => {
  test.fixme('a change that moves the gross total shows the "Recalculating…" loader', async ({
    page,
  }) => {
    // R6: "a loader must be displayed accompanied with the text 'Recalculating…', in place of
    // the gross total value", and the three actions must be disabled while it runs.
    //
    // PanelFooter implements this as its `recalculating` variant, but BuildPanel never
    // selects that variant — it renders `direct-collapsed` unconditionally — so no
    // recalculating state is reachable in the app today. Marked fixme rather than deleted:
    // the criterion stands, and this is the test that will cover it.
    await openCruiseWithCabin(page);
    await gotoTab(page, 'Extensions');

    await page
      .locator('[data-slot="extensions-card"] [role="checkbox"]:not([disabled])')
      .first()
      .click();

    await expect(
      page.locator('[data-slot="price-currency"][data-variant="recalculating"]'),
    ).toBeVisible();
    // Recalculating is a collapsed state, so the primary CTA reads "Review Booking".
    await expect(page.getByRole('button', { name: 'Review Booking' })).toBeDisabled();
  });

  test('the total settles on the new figure after a change, with no manual recalculate', async ({
    page,
  }) => {
    await openCruiseWithCabin(page);
    const before = await readGrossTotal(page);

    await gotoTab(page, 'Extensions');
    const card = page
      .locator('[data-slot="extensions-card"]')
      .filter({ has: page.locator('[role="checkbox"]:not([disabled])') })
      .first();
    const price = parseMoney(
      await card.locator('[data-slot="price-currency-amount"]').first().innerText(),
    );
    await card.locator('[role="checkbox"]:not([disabled])').click();

    // R6: no manual control, and no need to re-run the search to get an accurate total.
    await expect(page.getByRole('button', { name: /recalculate$/i })).toHaveCount(0);
    await expect.poll(() => readGrossTotal(page)).toBeCloseTo(before + price * 2, 2);
  });
});

test.describe('R4 — one panel per open cruise', () => {
  test('switching cruises swaps the panel, and a change in one leaves the other alone', async ({
    page,
  }) => {
    const [first, second] = WALKABLE_CRUISES;

    await runWideSearch(page);
    await openCruiseFromResults(page, first.id);
    await gotoTab(page, 'Staterooms');
    const fare = await selectCheapestFare(page);
    await selectFirstStateroom(page);
    await expectFareBilled(page, fare);
    const firstTotal = await readGrossTotal(page);

    // Open a second cruise from the results list — the workspace holds both.
    await page.goto('/embed');
    await runWideSearch(page);
    await openCruiseFromResults(page, second.id);
    const secondTotal = await readGrossTotal(page);

    const secondPanel = await openBreakdown(page);
    await expect(secondPanel.locator('header')).toContainText(second.id);
    await closeBreakdown(page);

    // Returning to the first cruise must restore ITS build, not the second's.
    await page.goto(`/embed/cruise/${first.id}/itinerary`);
    await expect(page.getByTestId('cruise-details')).toBeVisible();
    await expect
      .poll(() => readGrossTotal(page), {
        message: 'each open cruise must retain its own selections and pricing',
      })
      .toBeCloseTo(firstTotal, 2);

    expect(firstTotal, 'the two sailings must not be quoting the same figure by accident').not.toBe(
      secondTotal,
    );
  });
});
