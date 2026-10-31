import { expect, type Page, test } from '@playwright/test';
import { openSearchPanel, parseMoney, readResultIds, submitSearch } from './support/journey.ts';

/*
  VCX-10323 (Search Engine) and VCX-10330 (Search Results) — every criterion driven on its own.

  One filter per test, against an otherwise-default panel, so a failure names the control that
  broke rather than "the search is wrong". The committed fixture holds 23 sailings, 3 of them
  sold out, so the default result set is 20.

  The date range is the minimum search: the panel seeds it and submits without any other input,
  which is the first test below.
*/

/** Sailings in the committed fixture, less the 3 whose CruiseAvailabilityStatus is "Sold Out". */
const DEFAULT_RESULT_COUNT = 20;

/** The 3 sold-out sailings the "Sold-Out Cruises" toggle opts into. */
const SOLD_OUT_IDS = ['VRA270222T', 'OVS270225B', 'OSR270313T'];

const PRODUCTS = ['River', 'Ocean', 'Expedition', 'Mississippi'];

/** All products locks the four types (VCX-10483): release them, then untick all but one. */
async function selectOnlyProduct(page: Page, product: string): Promise<void> {
  const rail = page.getByTestId('sp-products');
  await rail.getByRole('checkbox', { name: 'All products' }).click();
  for (const other of PRODUCTS.filter((name) => name !== product)) {
    await rail.getByRole('checkbox', { name: other }).click();
  }
}

/** Headline "Starting at" price of the first card, used to prove pricing criteria bite. */
async function firstCardPrice(page: Page): Promise<number> {
  const amount = page
    .locator('[data-testid="cruise-card"] [data-slot="price-currency-amount"]')
    .first();
  return parseMoney(await amount.innerText());
}

// ── The minimum search ───────────────────────────────────────────────────────────────────────

test('SEARCH waits for input, and a term alone searches the seeded window', async ({ page }) => {
  await page.goto('/embed');
  await expect(page.getByTestId('search-form')).toBeVisible();

  // VCX-10588 AC 6 / AC 8: the seeded dates are not input, so an untouched panel cannot search.
  await expect(page.getByTestId('search-submit')).toBeDisabled();
  await submitSearch(page);
  expect(await readResultIds(page)).toHaveLength(DEFAULT_RESULT_COUNT);
});

// ── Panel criteria, one at a time ────────────────────────────────────────────────────────────

test.describe('search panel criteria', () => {
  test('products narrows to the selected brand', async ({ page }) => {
    await openSearchPanel(page);
    await selectOnlyProduct(page, 'River');
    await submitSearch(page);
    const river = await readResultIds(page);

    // Ocean first: unchecking River while it is the only type left would empty the rail, which
    // checks All products again and locks Ocean (VCX-10483).
    await openSearchPanel(page);
    await page.getByTestId('sp-products').getByRole('checkbox', { name: 'Ocean' }).click();
    await page.getByTestId('sp-products').getByRole('checkbox', { name: 'River' }).click();
    await submitSearch(page);
    const ocean = await readResultIds(page);

    expect(river.length).toBeGreaterThan(0);
    expect(ocean.length).toBeGreaterThan(0);
    expect(river.length + ocean.length).toBeLessThan(DEFAULT_RESULT_COUNT);
    // The two brands must not overlap — a sailing has exactly one Brand.
    expect(river.filter((id) => ocean.includes(id))).toEqual([]);
  });

  test('the sailing-date window narrows to sailings inside it', async ({ page }) => {
    await openSearchPanel(page);
    await page.getByRole('textbox', { name: 'From', exact: true }).fill('01MAR2027');
    await page.getByRole('textbox', { name: 'To', exact: true }).fill('31MAR2027');
    await submitSearch(page);

    const ids = await readResultIds(page);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThan(DEFAULT_RESULT_COUNT);
    // Every voyage code carries its sailing date as YYMMDD, so the window is checkable from it.
    for (const id of ids) {
      expect(id, `${id} sails outside the requested March window`).toMatch(/^[A-Z]{3}2703/);
    }
  });

  test('the nights range narrows to sailings of that length', async ({ page }) => {
    await openSearchPanel(page);
    await page.getByRole('textbox', { name: 'From nights' }).fill('7');
    await page.getByRole('textbox', { name: 'To nights' }).fill('7');
    await submitSearch(page);

    const ids = await readResultIds(page);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThan(DEFAULT_RESULT_COUNT);

    const nights = await page
      .locator('[data-testid="cruise-card"]')
      .evaluateAll((cards) =>
        cards.map((c) => Number((c.textContent ?? '').match(/(\d+)\s*Nights/)?.[1] ?? NaN)),
      );
    expect(
      nights.every((n) => n === 7),
      `got ${nights.join(',')}`,
    ).toBe(true);
  });

  test('guests=1 re-prices to the single-occupancy fare', async ({ page }) => {
    await openSearchPanel(page);
    await submitSearch(page);
    const double = await firstCardPrice(page);

    await openSearchPanel(page);
    // The stepper labels its own buttons "Decrease"/"Increase", so scope to the Guests field.
    await page.locator('[aria-label="Guests"]').getByRole('button', { name: 'Decrease' }).click();
    await submitSearch(page);
    const single = await firstCardPrice(page);

    // Solo travellers cannot take the double-occupancy fare, so the figure must rise.
    expect(single).toBeGreaterThan(double);
    expect(await readResultIds(page)).toHaveLength(DEFAULT_RESULT_COUNT);
  });

  test('currency converts the advertised price and relabels it', async ({ page }) => {
    await openSearchPanel(page);
    await submitSearch(page);
    const usd = await firstCardPrice(page);

    await openSearchPanel(page);
    await page.getByLabel('Currency').click();
    await page.getByRole('option', { name: 'GBP' }).click();
    await submitSearch(page);

    const gbp = await firstCardPrice(page);
    expect(gbp).not.toBeCloseTo(usd, 2);
    await expect(page.getByTestId('cruise-card').first()).toContainText('GBP');
    // Currency is a pricing concern, never a filter.
    expect(await readResultIds(page)).toHaveLength(DEFAULT_RESULT_COUNT);
  });

  test('a promo code discounts the advertised price without narrowing the set', async ({
    page,
  }) => {
    await openSearchPanel(page);
    await submitSearch(page);
    const list = await firstCardPrice(page);

    await openSearchPanel(page);
    // Free text (VCX-10484): no promotion list, the code is typed whole.
    await page.getByRole('textbox', { name: 'Promo Code' }).fill('VIKING10');
    await submitSearch(page);

    // VIKING10 is documented as 10% off in the mock's PROMO_DISCOUNTS table.
    expect(await firstCardPrice(page)).toBeCloseTo(list * 0.9, 0);
    expect(await readResultIds(page)).toHaveLength(DEFAULT_RESULT_COUNT);
  });

  test('the free-text search bar is carried but does not narrow (FR2.3)', async ({ page }) => {
    await openSearchPanel(page);
    await page.getByRole('textbox', { name: 'Natural language search' }).fill('paris');
    await submitSearch(page);

    // Documented behaviour, not a defect: the mock adapter states outright that
    // naturalLanguageQuery "is carried on the request but is NOT consulted here", and the
    // results view passes a hardcoded empty query to its client-side filter. Pinned so that
    // wiring it up later is a deliberate change that breaks this test, rather than a silent one.
    expect(
      await readResultIds(page),
      'FR2.3: free text is carried on the request but narrows nothing today',
    ).toHaveLength(DEFAULT_RESULT_COUNT);
  });

  test('port and hotel cities are reachable in their dropdowns', async ({ page }) => {
    await openSearchPanel(page);

    for (const field of ['Port cities', 'Hotel cities'] as const) {
      await page.getByRole('combobox', { name: field }).click();
      const option = page.getByRole('option', { name: 'Paris', exact: true });
      await expect(option, `${field}: "Paris" must be offered`).toHaveCount(1);

      // Both lists render all 71 cities at full height inside a container whose scrollHeight
      // equals its height — so there is nothing to scroll, no filter input, and no working
      // type-ahead. Every option past the fold is unreachable by mouse AND keyboard.
      await expect(
        option,
        `${field}: "Paris" must be clickable, not rendered outside the viewport`,
      ).toBeInViewport();
      await page.keyboard.press('Escape');
    }
  });
});

// ── Results-bar filters and sorting ──────────────────────────────────────────────────────────

test.describe('results filters and sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/embed');
    await expect(page.getByTestId('search-form')).toBeVisible();
    await page.getByTestId('search-submit').click();
    await expect(page.getByTestId('results-populated')).toBeVisible();
  });

  async function sortBy(page: Page, label: string): Promise<void> {
    await page.getByRole('combobox', { name: 'Sort by' }).click();
    await page.getByRole('option', { name: label }).click();
    await expect(page.getByTestId('cruise-card').first()).toBeVisible();
  }

  test('sorting by cruise name orders the cards alphabetically', async ({ page }) => {
    await sortBy(page, 'Cruise Name');
    const names = await page
      .locator('[data-testid="cruise-card"] [data-slot="card-header-title"]')
      .allInnerTexts();

    expect(names.length).toBe(DEFAULT_RESULT_COUNT);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  test('sorting by nights orders the cards shortest first', async ({ page }) => {
    await sortBy(page, 'Nights');
    const nights = await page
      .locator('[data-testid="cruise-card"]')
      .evaluateAll((cards) =>
        cards.map((c) => Number((c.textContent ?? '').match(/(\d+)\s*Nights/)?.[1] ?? NaN)),
      );

    expect(nights).toEqual([...nights].sort((a, b) => a - b));
  });

  test('sorting by embarkation date orders the cards earliest first', async ({ page }) => {
    await sortBy(page, 'Embarkation Date (Ascending)');
    // The voyage code embeds the sailing date as YYMMDD, so lexical order IS date order.
    const dates = (await readResultIds(page)).map((id) => id.slice(3, 9));
    expect(dates).toEqual([...dates].sort());
  });

  test('the stateroom-type filter returns only sailings offering that category', async ({
    page,
  }) => {
    // A SELECTIVE category on purpose. 22 of the 23 fixture sailings carry an Explorer Suite,
    // so filtering on that one correctly returns everything and proves nothing — a test that
    // used it would pass whether the filter worked or not.
    const CATEGORY = 'Dlx French Balcony';
    const before = await readResultIds(page);

    await page.getByRole('combobox', { name: 'Filter by stateroom type' }).click();
    await page.getByRole('option', { name: CATEGORY, exact: true }).click();

    const after = await readResultIds(page);
    expect(after.length).toBeGreaterThan(0);
    expect(after.length).toBeLessThan(before.length);

    // The property that actually matters: every surviving card offers the chosen category.
    const cards = page.getByTestId('cruise-card');
    for (let i = 0; i < (await cards.count()); i += 1) {
      const titles = await cards
        .nth(i)
        .locator('[data-slot="category-column-title"]')
        .allInnerTexts();
      expect(titles, `a result without a ${CATEGORY} category survived the filter`).toContain(
        CATEGORY,
      );
    }
  });

  test('the stateroom-type list offers each category once', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Filter by stateroom type' }).click();
    const options = await page.getByRole('option').allInnerTexts();

    // EVO ships the same category with different punctuation across sailings ("OWNER'S SUITE"
    // and "OWNERS SUITE"). The view model title-cases without normalising, so the agent is
    // offered two entries for one category — and one of them reads "Owner'S Suite".
    const normalised = options.map((o) => o.toLowerCase().replace(/[^a-z]/g, ''));
    expect(
      new Set(normalised).size,
      `duplicate categories after normalising: ${options.join(' | ')}`,
    ).toBe(options.length);
    for (const option of options) {
      expect(option, 'a category name must not carry a mid-word capital').not.toMatch(/[a-z]'S\b/);
    }
  });

  test('the Sold-Out Cruises toggle reveals exactly the sold-out sailings', async ({ page }) => {
    const before = await readResultIds(page);
    expect(before).toHaveLength(DEFAULT_RESULT_COUNT);

    await page.getByLabel('Sold-Out Cruises').click();
    const after = await readResultIds(page);

    expect(after.filter((id) => !before.includes(id)).sort()).toEqual([...SOLD_OUT_IDS].sort());
  });

  // Skipped while the two toggles are hidden in the filters bar: neither reaches the results
  // filter yet, which is exactly what this spec catches. Unskip when they are wired and shown.
  test.skip('the Sold-Out Packages and Hotels toggles change the result set', async ({ page }) => {
    for (const label of ['Sold-Out Packages', 'Sold-Out Hotels'] as const) {
      const before = await readResultIds(page);
      await page.getByLabel(label).click();
      const after = await readResultIds(page);

      // Both switches are rendered, are keyboard-reachable and hold their own state, but
      // search-results-view only consumes `showSoldOutCruises` — neither of these reaches the
      // filter pipeline, so each is an inert control the agent can toggle to no effect.
      expect(after, `"${label}" is wired to nothing`).not.toEqual(before);
      await page.getByLabel(label).click();
    }
  });
});
