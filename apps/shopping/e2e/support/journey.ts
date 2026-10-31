import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';

/*
  Shared driving helpers for the VCX-10322 prototype-journey suites.

  Everything here is deliberately RELATIONAL rather than hard-coded: the helpers read what a
  screen actually shows and hand it back, so the specs assert that two surfaces agree instead
  of asserting against a fixture number copied into the test. A fixture edit then changes what
  the assertions compare, never whether they hold — which is the only way a suite can keep
  catching "the Build Panel disagrees with the tab" after the mock data moves.
*/

/**
 * The three sailings that are walkable end to end (ADR-0011, VCX-10322 epic comment).
 *
 * Search returns all 20 fixture records, but only these three carry itinerary, stateroom,
 * extension and air data. The AC for the four cruise-detail tabs scopes to them; the other 17
 * legitimately land on an empty state.
 */
export const WALKABLE_CRUISES = [
  { id: 'HID270322T', name: 'Paris to the Swiss Alps', ship: 'VIKING HILD' },
  { id: 'OVS270325C', name: "Mediterranean's Iconic Shores", ship: 'VIKING VESTA' },
  { id: 'XPO271113T', name: 'Antarctic Explorer', ship: 'VIKING POLARIS' },
] as const;

export type CruiseTabLabel = 'Itinerary' | 'Staterooms' | 'Extensions' | 'Viking Air';

export const CRUISE_TAB_LABELS: readonly CruiseTabLabel[] = [
  'Itinerary',
  'Staterooms',
  'Extensions',
  'Viking Air',
];

/** Nights wide enough to span every fixture sailing (7 through 28). */
const ALL_NIGHTS = { from: '1', to: '40' } as const;

// ── Money ────────────────────────────────────────────────────────────────────────────────────

/**
 * Parses a rendered money string to a number.
 *
 * Discount rows are drawn with an en-dash prefix on BOTH the label and the amount
 * ("– $700.00"), which is the only signal that the figure reduces the line above it — so it
 * has to survive parsing as a sign rather than being stripped with the rest of the furniture.
 * A trailing currency code ("$14,398.00 USD") is ignored: it carries no digits.
 */
export function parseMoney(text: string): number {
  const negative = /^\s*[-–—]/.test(text);
  const digits = text.replace(/[^0-9.]/g, '');
  const value = Number.parseFloat(digits);
  if (Number.isNaN(value)) {
    throw new Error(`Expected a money value, got ${JSON.stringify(text)}`);
  }
  return negative ? -value : value;
}

// ── Search → cruise ──────────────────────────────────────────────────────────────────────────

/**
 * Loads the app and runs a search wide enough to return all three walkable sailings.
 *
 * `/embed` is the app's own document; `/` is the mock Dynamics shell that frames it in an
 * iframe. Driving the embed keeps every assertion below on this side of a frame boundary.
 *
 * The dev harness already defaults the window to the fixture year, but the nights range
 * defaults to 0–0 — whose meaning is an open question (AGENTS.md § 10.4) — so the range is set
 * explicitly here rather than relied upon.
 */
export async function runWideSearch(page: Page): Promise<void> {
  await page.goto('/embed');
  await expect(page.getByTestId('search-form')).toBeVisible();

  await page.getByTestId('sp-toggle').click();
  await page.getByRole('spinbutton', { name: 'From nights' }).fill(ALL_NIGHTS.from);
  await page.getByRole('spinbutton', { name: 'To nights' }).fill(ALL_NIGHTS.to);
  await page.getByTestId('search-submit').click();

  await expect(page.getByTestId('results-populated')).toBeVisible();
}

/**
 * Expands the search panel without submitting.
 *
 * Dates and every other filter live behind "More Options", so nothing below the search bar is
 * reachable until the panel is open.
 */
export async function openSearchPanel(page: Page): Promise<void> {
  await page.goto('/embed');
  await expect(page.getByTestId('search-form')).toBeVisible();
  // The panel opens expanded (VCX-10588 R1), so every filter is already in reach.
}

/**
 * Presses SEARCH. It stays disabled until the panel holds input (VCX-10588 R7), so an empty
 * search bar gets a term first. These specs run on the mock provider, which does not consult
 * the term (FR2.3), so it narrows nothing.
 */
export async function pressSearch(scope: Page | FrameLocator): Promise<void> {
  const bar = scope.getByLabel('Natural language search');
  if ((await bar.inputValue()) === '') await bar.fill('nile');
  await scope.getByTestId('search-submit').click();
}

/** Submits the panel and waits for the populated results surface. */
export async function submitSearch(page: Page): Promise<void> {
  await pressSearch(page);
  await expect(page.getByTestId('results-populated')).toBeVisible();
}

/**
 * The voyage code of every rendered result card, in display order.
 *
 * The code embeds the sailing date as YYMMDD, which is what lets the date-window and
 * embarkation-sort assertions check ordering without re-parsing the rendered dates.
 */
export async function readResultIds(page: Page): Promise<string[]> {
  return page
    .getByTestId('cruise-card')
    .evaluateAll((cards) =>
      cards.map((card) => (card.textContent ?? '').match(/[A-Z]{3}\d{6}[A-Z]?/)?.[0] ?? '?'),
    );
}

/** The result card for one sailing, found by the voyage code its header renders. */
export function cruiseCard(page: Page, cruiseId: string): Locator {
  return page.getByTestId('cruise-card').filter({ hasText: cruiseId });
}

/**
 * The "Starting at" price a sailing's result card advertises.
 *
 * This is the cheapest category on the sailing — the figure the agent has just read to the
 * customer when they click through. Everything the cruise-detail screens quote before a cabin
 * is chosen has to be reconcilable with it.
 */
export async function readStartingAtPrice(page: Page, cruiseId: string): Promise<number> {
  const amount = cruiseCard(page, cruiseId)
    .locator('[data-slot="card-header"] [data-slot="price-currency-amount"]')
    .first();
  return parseMoney(await amount.innerText());
}

/** Opens a sailing from the results list via its "Cruise details" CTA (FR3.1: a navigation). */
export async function openCruiseFromResults(page: Page, cruiseId: string): Promise<void> {
  await cruiseCard(page, cruiseId).getByRole('button', { name: 'Cruise details' }).click();
  await expect(page).toHaveURL(new RegExp(`/cruise/${cruiseId}/itinerary`));
  await expect(page.getByTestId('cruise-details')).toBeVisible();
}

/** Moves between the four cruise-detail tabs. They are tabs, not steps — any order is legal. */
export async function gotoTab(page: Page, label: CruiseTabLabel): Promise<void> {
  await page.getByTestId('cruise-details-tabs').getByRole('link', { name: label }).click();
}

// ── Build Panel ──────────────────────────────────────────────────────────────────────────────

/** The collapsed bar's gross-total block, or the expanded drawer's when it is open. */
export function grossTotalBlock(page: Page): Locator {
  return page.locator('[data-slot="price-currency"][data-variant="total"]').last();
}

/** The gross total as a number, read from whichever bar is currently on screen. */
export async function readGrossTotal(page: Page): Promise<number> {
  const amount = grossTotalBlock(page).locator('[data-slot="price-currency-amount"]');
  return parseMoney(await amount.innerText());
}

export function expandedPanel(page: Page): Locator {
  return page.locator('[data-slot="build-panel-expanded"]');
}

/** Opens the breakdown drawer from the collapsed bar (R3.1). */
export async function openBreakdown(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: /breakdown/i }).click();
  const panel = expandedPanel(page);
  await expect(panel).toBeVisible();
  return panel;
}

export async function closeBreakdown(page: Page): Promise<void> {
  await expandedPanel(page)
    .getByRole('button', { name: /collapse/i })
    .click();
  await expect(expandedPanel(page)).toBeHidden();
}

/** One rendered price row: its label, the amount as drawn, and that amount as a number. */
export interface PriceRow {
  label: string;
  amount: string;
  value: number;
}

/** Every price row inside a scope, in document order. */
export async function readPriceRows(scope: Locator): Promise<PriceRow[]> {
  const raw = await scope.locator('[data-slot="price-line-item"]').evaluateAll((els) =>
    els.map((el) => ({
      label: (el.children[0]?.textContent ?? '').trim(),
      amount: (el.children[1]?.textContent ?? '').trim(),
    })),
  );
  return raw.map((row) => ({ ...row, value: parseMoney(row.amount) }));
}

/** One guest's column in the expanded breakdown. */
export interface GuestColumn {
  /** "Guest 1" / "Guest 2". */
  label: string;
  name: string;
  rows: PriceRow[];
  /** Rows whose label ends in "Subtotal" — one per priced category (R3.6). */
  subtotals: PriceRow[];
  /** The column's closing total row (R3.6). */
  total: PriceRow;
  /** Charge and discount rows — everything that is not a subtotal or the column total. */
  lines: PriceRow[];
}

/** Reads every guest column out of the expanded breakdown. */
export async function readGuestColumns(page: Page): Promise<GuestColumn[]> {
  const columns = expandedPanel(page).locator('fieldset');
  const count = await columns.count();
  const result: GuestColumn[] = [];

  for (let i = 0; i < count; i += 1) {
    const column = columns.nth(i);
    const rows = await readPriceRows(column);
    const subtotals = rows.filter((row) => /subtotal$/i.test(row.label));
    const total = rows.find((row) => /(?<!sub)total$/i.test(row.label));
    if (total === undefined) {
      throw new Error(`Guest column ${i} rendered no total row`);
    }
    result.push({
      label: (await column.locator('p').first().innerText()).trim(),
      name: (await column.locator('p').nth(1).innerText()).trim(),
      rows,
      subtotals,
      total,
      lines: rows.filter((row) => row !== total && !subtotals.includes(row)),
    });
  }

  return result;
}

// ── Staterooms ───────────────────────────────────────────────────────────────────────────────

/** A fare option as the Staterooms grid draws it. */
export interface FareOption {
  /** The category badge — EVO's own code, e.g. "DV3". */
  badge: string;
  /** Per-passenger price for the option, in the active currency. */
  price: number;
}

/**
 * Options an agent can actually pick.
 *
 * R3.5 gives four states across two axes: `available` and `limited` are both bookable (limited
 * just means one cabin left), while `soldout` and `disabled` render muted and refuse a click.
 * Selecting on the negative keeps a sailing whose whole grid is down to its last cabins —
 * XPO271113T is one — inside the suite instead of failing it for having nothing "available".
 */
const SELECTABLE_FARE =
  '[data-slot="price-line"]:not([data-status="soldout"]):not([data-status="disabled"])';

/**
 * Every selectable fare option on the Staterooms grid, in display order.
 *
 * The row's children are read by position — chip, price, inventory pair — rather than by
 * regex over its text. Adjacent spans have no whitespace between them, so "$21,796" and the
 * "01" inventory cell concatenate into "$21,79601" in `textContent`; a regex over that reads a
 * plausible but entirely invented price.
 */
export async function readSelectableFares(page: Page): Promise<FareOption[]> {
  // The grid is the tab's own render, not the container's, so wait for it before reading —
  // otherwise an empty result reads as "this sailing has nothing bookable" when it only means
  // the fare card has not mounted yet.
  await expect(page.getByTestId('staterooms-tab')).toBeVisible();
  await page.locator('[data-slot="price-line"]').first().waitFor();

  const options = await page.locator(SELECTABLE_FARE).evaluateAll((els) =>
    els.map((el) => {
      // The chip carries a visually-hidden status word for WCAG 1.4.1; strip it to leave the
      // badge, which is the option's identity ("DV3").
      const badge = (el.children[0]?.textContent ?? '')
        .replace(/available|limited|sold out|unavailable/gi, '')
        .trim();
      const price = Number.parseFloat((el.children[1]?.textContent ?? '').replace(/[^0-9.]/g, ''));
      return { badge, price };
    }),
  );

  if (options.length === 0) {
    throw new Error(
      'The Staterooms grid offered no selectable fare option. VCX-10332 R3.5 reserves the ' +
        'sold-out state for a category with no available AND no GTY cabin, so a sailing whose ' +
        'inventory is guarantee-only must still be bookable through its GTY option.',
    );
  }
  return options;
}

/**
 * Picks the cheapest selectable fare option — the one an agent quotes first.
 *
 * Clicks by POSITION, not by badge text. Badges nest as substrings across columns ("V1" is
 * inside "PV1" and "DV1"), so a text filter can select a different, pricier option than the
 * one whose price the caller is about to assert against.
 */
export async function selectCheapestFare(page: Page): Promise<FareOption> {
  const options = await readSelectableFares(page);

  let index = 0;
  options.forEach((option, i) => {
    const best = options[index];
    if (best !== undefined && option.price < best.price) index = i;
  });

  const cheapest = options[index];
  if (cheapest === undefined) {
    throw new Error('No fare option to select');
  }

  await page.locator(SELECTABLE_FARE).nth(index).click();

  // The grid marks the chosen row before the panel, the URL and the Build Panel catch up.
  // Waiting on the mark keeps every later read from racing that re-render.
  await expect(page.locator('[data-slot="price-line"][data-selected="true"]')).toHaveCount(1);

  return cheapest;
}

/** The "Category Selection" summary panel's rendered text (R3.1). */
export async function readCategorySelection(page: Page): Promise<string> {
  return (await page.locator('[data-slot="staterooms-category-selection"]').innerText()).replace(
    /\s+/g,
    ' ',
  );
}

/**
 * Waits for the first stateroom offered for the selected category to be held.
 *
 * Picking a category selects its first cabin automatically once the list arrives, so this
 * waits for that selection rather than clicking — a click would UNtick the cabin.
 *
 * Returns the stateroom number, which is "GTY" where the category has no physical
 * availability — the designed Guarantee-Only surface, not an error (ADR-0015 § 5).
 */
export async function selectFirstStateroom(page: Page): Promise<string> {
  const first = page.locator('[data-slot="staterooms-table"] [role="checkbox"]').first();
  await expect(first).toBeVisible();
  const label = (await first.getAttribute('aria-label')) ?? '';
  await expect(first).toBeChecked();

  await expect(page).toHaveURL(/[?&]room=/);

  return label.replace(/^Select stateroom\s*/i, '');
}

/**
 * Waits for the Build Panel to bill the fare the agent just picked, and asserts that it does.
 *
 * Doubles as a barrier and as a check of VCX-10332 R6, "the gross total must update as
 * stateroom selections change". The URL gains `?cat=`/`?room=` on the click, but the tab only
 * writes the held cabin into the workspace store from an effect that runs afterwards — and the
 * panel bills the chosen category only once BOTH halves are in that store. Reading the total
 * on the URL change alone races that write and silently returns the pre-selection $0.00.
 */
export async function expectFareBilled(page: Page, fare: FareOption, guests = 2): Promise<void> {
  await expect
    .poll(() => readGrossTotal(page), {
      message: `R6: the gross total must follow the selected fare (${fare.badge})`,
    })
    .toBeCloseTo(fare.price * guests, 2);
}

// ── Extensions ───────────────────────────────────────────────────────────────────────────────

/** An optional extension as its card draws it. */
export interface ExtensionCard {
  title: string;
  price: number;
}

/**
 * Ticks the first selectable optional extension and returns what its card advertised.
 *
 * The Included Land Package is skipped: it carries no checkbox because it is part of the fare
 * (R4.1), and a sold-out card carries none either (R5.4).
 */
export async function selectFirstExtension(page: Page): Promise<ExtensionCard> {
  const card = page
    .locator('[data-slot="extensions-card"]')
    .filter({ has: page.locator('[role="checkbox"]:not([disabled])') })
    .first();
  await expect(card).toBeVisible();

  const title = (await card.locator('[data-slot="card-header-title"]').innerText()).trim();
  const priceText = await card.locator('[data-slot="price-currency-amount"]').first().innerText();

  await card.locator('[role="checkbox"]:not([disabled])').click();

  return { title, price: parseMoney(priceText) };
}

// ── Viking Air ───────────────────────────────────────────────────────────────────────────────

export function airGuestCard(page: Page, index: number): Locator {
  return page.locator('[data-slot="viking-air-guest-card"]').nth(index);
}

/**
 * Configures one guest's round-trip airfare: the same gateway on both legs, one service class.
 *
 * Both legs need a gateway AND a class before the summary leaves its awaiting-selection state
 * (R5.1), so all four fields are set here rather than leaving a half-configured card behind.
 */
export async function configureRoundTripAir(
  page: Page,
  guestIndex: number,
  options: { gateway: RegExp; serviceClass: RegExp },
): Promise<void> {
  const card = airGuestCard(page, guestIndex);

  for (const leg of ['Origin Gateway', 'Return Gateway'] as const) {
    await card.getByLabel(leg).click();
    await page.getByRole('option', { name: options.gateway }).first().click();
  }

  // Both legs' class fields are labelled "Class"; the first belongs to the origin leg.
  const classFields = card.getByLabel('Class', { exact: true });
  for (let i = 0; i < 2; i += 1) {
    await classFields.nth(i).click();
    await page.getByRole('option', { name: options.serviceClass }).first().click();
  }
}

/** One guest's Airfare Summary panel (R5). */
export function airSummary(page: Page, guestIndex: number): Locator {
  return airGuestCard(page, guestIndex).locator('[data-slot="viking-air-summary"]');
}

/** Waits for a guest's airfare to settle, then reads the summary's three rows. */
export async function readAirSummary(page: Page, guestIndex: number): Promise<PriceRow[]> {
  const summary = airSummary(page, guestIndex);
  await expect(summary).toContainText('Airfare Total');
  return readPriceRows(summary);
}
