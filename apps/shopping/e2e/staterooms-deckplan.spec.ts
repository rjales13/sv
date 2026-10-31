import { expect, type Page, test } from '@playwright/test';

/*
  VCX-10332 R4.4 / R4.5 — the deck plan and the legend beneath it describe the deck on screen.

  The legend used to be hand-authored per deck beside the drawings, and had drifted from them:
  the Vesta's deck 8 legend named Fitness Center and Hair Salon while its plan draws Explorers'
  Lounge. Both legends are now read off the displayed SVG, so these tests assert the property
  that matters — the legend changes with the deck, and names what that deck actually holds.
*/

const CRUISE = 'OVS270325C';

async function openStaterooms(page: Page): Promise<void> {
  await page.goto(`/embed/cruise/${CRUISE}/stateroom`);
  await expect(page.getByTestId('staterooms-tab')).toBeVisible();
}

async function pickDeck(page: Page, label: string): Promise<void> {
  await page.getByLabel('Select deck').click();
  await page.getByRole('option', { name: label, exact: true }).click();
}

function legendItems(page: Page) {
  return page.locator('[data-slot="staterooms-deckplan-conventions"] li');
}

async function legendLabels(page: Page): Promise<string[]> {
  return legendItems(page).allInnerTexts();
}

test('the venue legend names the venues on the selected deck, and follows the deck', async ({
  page,
}) => {
  await openStaterooms(page);

  await pickDeck(page, 'Deck 1');
  const deck1 = await legendLabels(page);
  await pickDeck(page, 'Deck 8');
  const deck8 = await legendLabels(page);

  expect(deck1.length).toBeGreaterThan(1);
  expect(deck8).not.toEqual(deck1);

  // Deck 1 carries the Vesta's restaurants and services; deck 8 carries the Explorers' Lounge.
  expect(deck1).toContain("Manfredi's Italian Restaurant®");
  expect(deck8).toContain("Explorers' Lounge");
  expect(deck8, 'deck 8 draws no Fitness Center — the old legend claimed one').not.toContain(
    'Fitness Center',
  );
});

test('selecting a category switches the legend to the codes present on that deck', async ({
  page,
}) => {
  await openStaterooms(page);
  await page.locator('[data-slot="price-line"]:not([data-status="soldout"])').first().click();
  await expect(page.locator('[data-slot="price-line"][data-selected="true"]')).toHaveCount(1);

  await pickDeck(page, 'Deck 7');
  const deck7 = await legendLabels(page);
  await pickDeck(page, 'Deck 5');
  const deck5 = await legendLabels(page);

  // R4.5: "every category code present on the displayed deck", not every code on the ship.
  for (const entry of [...deck5, ...deck7]) {
    expect(entry, `"${entry}" is not a category entry`).toMatch(/^[A-Z]+\d*: \S/);
  }
  expect(deck5).not.toEqual(deck7);
  // The Owner's Suite is a deck 7 cabin; it must not appear in deck 5's legend.
  expect(deck7.some((e) => e.startsWith('OS:'))).toBe(true);
  expect(deck5.some((e) => e.startsWith('OS:'))).toBe(false);
});

test('every swatch is painted, and the plan renders as inline SVG', async ({ page }) => {
  await openStaterooms(page);
  await pickDeck(page, 'Deck 7');

  // The plan must be inline, not an <img>: that is what makes its layers addressable.
  await expect(page.locator('[data-slot="deckplan-floorplan"] svg')).toHaveCount(1);

  const swatches = page.locator('[data-slot="deckplan-swatch"]');
  const count = await swatches.count();
  expect(count).toBeGreaterThan(0);

  const colors = await swatches.evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).backgroundColor),
  );
  for (const color of colors) {
    expect(color, 'a swatch with no colour describes nothing').not.toBe('rgba(0, 0, 0, 0)');
  }
  expect(new Set(colors).size, 'the deck draws more than one colour').toBeGreaterThan(1);
});

/*
  The three panels describe one choice, so they move together (VCX-10332 R3/R4): the fare the
  agent picks fills the stateroom list, and the plan follows the cabins to their deck. EVO
  states the deck on every cabin, so the join is exact rather than inferred from the number.
*/

/** Picks the fare row whose EVO abbreviation is `code`, and waits for its cabins to arrive. */
async function pickFare(page: Page, code: string): Promise<void> {
  const rows = page.locator('[data-slot="price-line"]:not([data-status="soldout"])');
  for (let i = 0; i < (await rows.count()); i += 1) {
    await rows.nth(i).click();
    await expect(page).toHaveURL(/[?&]cat=[^&]*/);
    if (new URL(page.url()).searchParams.get('cat') === code) break;
  }
  expect(new URL(page.url()).searchParams.get('cat')).toBe(code);
  // The header echoes the category once the port has answered for it.
  await expect(page.locator('[data-slot="staterooms-selection"]')).toContainText(code);
}

function deckSelector(page: Page) {
  return page.getByLabel('Select deck');
}

function stateroomNumbers(page: Page) {
  return page.locator('[data-slot="staterooms-table"] [aria-label^="Select stateroom"]');
}

test('picking a fare fills the stateroom list and brings the plan to that deck', async ({
  page,
}) => {
  await openStaterooms(page);
  await pickFare(page, 'V1');

  // EVO reports 12 open V1 cabins; the Vesta draws every Veranda V1 on deck 3 (3002-3023).
  await expect(stateroomNumbers(page)).toHaveCount(12);
  await expect(stateroomNumbers(page).first()).toHaveAttribute('aria-label', /3002/);
  await expect(deckSelector(page)).toHaveText(/Deck 3/);
});

test('a category spanning several decks follows the cabin the agent picks', async ({ page }) => {
  await openStaterooms(page);
  await pickFare(page, 'DV2');

  // DV2 runs across decks 5 and 6. The list opens on its first cabin, so the plan does too.
  await expect(deckSelector(page)).toHaveText(/Deck 5/);

  // Choosing a cabin further down the list moves the plan to THAT cabin's deck.
  const last = stateroomNumbers(page).last();
  await last.click();
  await expect(deckSelector(page)).toHaveText(/Deck 6/);
});

test('browsing other decks afterwards is not undone by the selection', async ({ page }) => {
  await openStaterooms(page);
  await pickFare(page, 'V1');
  await expect(deckSelector(page)).toHaveText(/Deck 3/);

  // The jump is a starting point, not a lock: the agent can still look elsewhere.
  await pickDeck(page, 'Deck 7');
  await expect(deckSelector(page)).toHaveText(/Deck 7/);
  await expect(stateroomNumbers(page)).toHaveCount(12);
});

/*
  Pointing at a cabin picks it out on the plan, matched on cabin number AND category. Every
  cabin list now names rooms the drawing holds in that category — Viking's delivered lists do,
  and the derived ones are built from the drawings (scripts/derive-cabin-fixtures.mjs) — so
  every row can be found. The guard against a number the drawing gives to ANOTHER category
  stays unit-tested in deck-plan-highlight.test.ts.
*/

/** Shapes the plan has outlined as "this exact cabin". */
function outlinedShapes(page: Page) {
  return page.locator('[data-slot="deckplan-floorplan"] svg :is(rect, polygon, path, polyline)');
}

async function countOutlined(page: Page): Promise<number> {
  return outlinedShapes(page).evaluateAll(
    (els) => els.filter((el) => getComputedStyle(el).strokeWidth === '2.5px').length,
  );
}

async function hoverCabin(page: Page, cabin: string): Promise<void> {
  await page.getByLabel(`Select stateroom ${cabin}`).hover();
}

test('hovering a cabin outlines it on the plan when the drawing holds it', async ({ page }) => {
  await openStaterooms(page);
  await pickFare(page, 'PV1');

  // PV1 is one of the three pairs whose numbering matches the artwork.
  await expect(stateroomNumbers(page).first()).toBeVisible();
  const first = (await stateroomNumbers(page).first().getAttribute('aria-label')) ?? '';
  await hoverCabin(page, first.replace('Select stateroom ', ''));

  await expect.poll(() => countOutlined(page)).toBe(1);
});

test('every cabin in the list is found on the plan, not just the first', async ({ page }) => {
  await openStaterooms(page);
  await pickFare(page, 'V1');
  await expect(stateroomNumbers(page)).toHaveCount(12);

  // The synthetic V1 list once named cabins 3101-3112, which the drawing gives to a PS3, so
  // hovering them outlined nothing. Each listed cabin must now outline exactly its own room.
  for (const index of [0, 5, 11]) {
    const label = (await stateroomNumbers(page).nth(index).getAttribute('aria-label')) ?? '';
    await hoverCabin(page, label.replace('Select stateroom ', ''));
    await expect.poll(() => countOutlined(page)).toBe(1);
  }

  // …and the rest of the plan keeps the colours Viking drew — nothing is faded.
  const faded = await page
    .locator('[data-slot="deckplan-floorplan"] svg [id^="room-"]')
    .evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity !== '1').length);
  expect(faded).toBe(0);
});

test("the deck plan sits at the top of the panel without the artwork's blank band", async ({
  page,
}) => {
  await openStaterooms(page);
  for (const deck of ['Deck 3', 'Deck 5']) {
    await pickDeck(page, deck);
    // The drawings reserve ~119px above the ship; the panel crops it to a few pixels.
    await expect
      .poll(() =>
        page
          .locator('[data-slot="deckplan-floorplan"] svg')
          .first()
          .evaluate((svg: SVGSVGElement) => {
            const [, y = 0, w = 1] = (svg.getAttribute('viewBox') ?? '')
              .split(/[\s,]+/)
              .map(Number);
            const scale = svg.getBoundingClientRect().width / w;
            return Math.round((svg.getBBox().y - y) * scale);
          }),
      )
      .toBeLessThanOrEqual(16);
  }
});

test('a selected cabin stays outlined after the pointer leaves', async ({ page }) => {
  await openStaterooms(page);
  await pickFare(page, 'PV1');

  // Picking the fare holds its first cabin — no click needed, and a click would untick it.
  await expect(stateroomNumbers(page).first()).toBeChecked();

  // Move the pointer well away: selection, not hover, is what should hold it.
  await page.getByTestId('staterooms-tab').hover({ position: { x: 5, y: 5 } });
  await expect.poll(() => countOutlined(page)).toBe(1);
});

/*
  The expand dialog (R4.6). Deck plans are 3.4:1 to 7.4:1 strips, so the old dialog — capped
  narrower than the panel behind it — rendered the drawing 26% SMALLER than the one the agent
  was already looking at. It now opens filling the frame and can be magnified and moved.
*/

function planInDialog(page: Page) {
  return page.locator('[data-slot="deck-plan-content"] svg');
}

async function openExpandDialog(page: Page): Promise<void> {
  await page.locator('[data-slot="staterooms-deckplan"] button[aria-label="expand"]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(planInDialog(page)).toBeVisible();
}

test('the expand dialog shows the plan larger than the panel it came from', async ({ page }) => {
  await openStaterooms(page);
  await pickDeck(page, 'Deck 3');

  const inPanel = await page.locator('[data-slot="deckplan-floorplan"] svg').boundingBox();
  await openExpandDialog(page);
  const inDialog = await planInDialog(page).boundingBox();

  expect(inPanel).not.toBeNull();
  expect(inDialog).not.toBeNull();
  // The whole point of the control: expanding must not shrink the drawing.
  expect(inDialog?.width ?? 0).toBeGreaterThan(inPanel?.width ?? 0);
  expect(inDialog?.height ?? 0).toBeGreaterThan(inPanel?.height ?? 0);
});

test('the plan can be magnified, moved, and returned to the whole deck', async ({ page }) => {
  await openStaterooms(page);
  await pickDeck(page, 'Deck 3');
  await openExpandDialog(page);

  const opened = await planInDialog(page).boundingBox();
  await page.getByLabel('Zoom in').click();
  await expect
    .poll(async () => (await planInDialog(page).boundingBox())?.width ?? 0)
    .toBeGreaterThan(opened?.width ?? 0);

  // Dragging moves the drawing rather than selecting it.
  const transform = () =>
    page.locator('[data-slot="deck-plan-content"]').evaluate((el) => el.style.transform);
  const before = await transform();
  const frame = await page.locator('[data-slot="deck-plan-viewport"]').boundingBox();
  await page.mouse.move((frame?.x ?? 0) + 400, (frame?.y ?? 0) + 200);
  await page.mouse.down();
  await page.mouse.move((frame?.x ?? 0) + 150, (frame?.y ?? 0) + 200, { steps: 8 });
  await page.mouse.up();
  await expect.poll(transform).not.toBe(before);

  // Fit returns to the whole deck, which is where the readout reads 100%.
  await page.getByRole('button', { name: 'Fit' }).click();
  await expect(page.locator('[data-slot="deck-plan-zoom"]')).toHaveText('100%');
});

test('the dialog shows the plan in full colour and dismisses without changing selection', async ({
  page,
}) => {
  await openStaterooms(page);
  await pickFare(page, 'V1');
  // The deck follows the cabins, and the cabins arrive from the port — so wait for the list
  // before opening the dialog, or it opens on Deck A, which draws no cabins at all.
  await expect(stateroomNumbers(page).first()).toBeVisible();
  await expect(page.getByLabel('Select deck')).toHaveText(/Deck 3/);
  const deckBefore = await page.getByLabel('Select deck').innerText();

  await openExpandDialog(page);
  // The detail view shows the drawing as the panel does: in the colours Viking drew.
  const rooms = await planInDialog(page).evaluate((svg) => {
    const all = [...svg.querySelectorAll('[id^="room-"]')];
    return {
      total: all.length,
      faded: all.filter((el) => getComputedStyle(el).opacity !== '1').length,
    };
  });
  expect(rooms.total).toBeGreaterThan(0);
  expect(rooms.faded).toBe(0);

  await page.getByLabel('Close deck plan').click();
  await expect(page.getByRole('dialog')).toBeHidden();

  // R4.6: dismissing must not disturb category, stateroom or deck.
  expect(new URL(page.url()).searchParams.get('cat')).toBe('V1');
  await expect(page.getByLabel('Select deck')).toHaveText(deckBefore);
});
