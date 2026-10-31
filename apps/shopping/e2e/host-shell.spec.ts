import { expect, type FrameLocator, type Page, test } from '@playwright/test';
import { pressSearch } from './support/journey.ts';

/*
  The app as the agent actually meets it: `/`, the mock D365 shell, with the prototype in its
  iframe. Every other spec drives `/embed` directly — which is why neither of the defects below
  was caught before an agent hit them on the VDI.

  Both are regression tests for fixes, and both are written against BEHAVIOUR rather than
  measurements, because the measurements lie in this environment: headless Chromium draws
  overlay scrollbars, so scrollbar gutters read 0 whether or not a scrollbar exists, and
  `scrollHeight` keeps reporting full content extent on an `overflow: hidden` box. A wheel
  gesture is the one signal that means what it says.
*/

/** The prototype's own document, inside the host shell's iframe. */
function app(page: Page): FrameLocator {
  return page.frameLocator('[data-testid="app-frame"]');
}

async function searchFromShell(page: Page): Promise<FrameLocator> {
  await page.goto('/');
  const frame = app(page);
  await expect(frame.getByTestId('search-form')).toBeVisible();
  await pressSearch(frame);
  await expect(frame.getByTestId('results-populated')).toBeVisible();
  return frame;
}

/** Wheels over `target` and reports how far the app document itself moved. */
async function wheelOver(page: Page, frame: FrameLocator, testId: string): Promise<number> {
  const strip = frame.getByTestId('workspace-tab-strip');
  const topOf = async () => (await strip.boundingBox().then((b) => b?.y)) ?? Number.NaN;

  const box = await frame.getByTestId(testId).boundingBox();
  if (box === null) throw new Error(`${testId} has no box to wheel over`);

  const before = await topOf();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(400);
  return before - (await topOf());
}

test.describe('the app document owns no scroll of its own', () => {
  for (const expanded of [false, true]) {
    test(`a wheel over the chrome never scrolls the page — More Options ${
      expanded ? 'expanded' : 'collapsed'
    }`, async ({ page }) => {
      const frame = await searchFromShell(page);
      if (expanded) await frame.getByTestId('sp-toggle').click();
      await page.waitForTimeout(400);

      // The chrome is fixed furniture. Wheeling over it used to drag the whole app — panel,
      // tab strip and all — up and off the top of the frame, which is the "double scroll" the
      // agents reported. Expanding the panel made it sharper: the results pane shrank to
      // ~511px inside a ~9000px scrolling document.
      expect(
        await wheelOver(page, frame, 'workspace-tab-strip'),
        'the app document must not scroll; only its panes do',
      ).toBe(0);
    });
  }

  test('the wheel reaches the results pane instead', async ({ page }) => {
    const frame = await searchFromShell(page);
    const pane = frame.locator('[data-testid="search-results"]').locator('xpath=ancestor::div[1]');
    const box = await frame.getByTestId('cruise-card').first().boundingBox();
    if (box === null) throw new Error('no result card to wheel over');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(400);

    // With the document eating the gesture, this used to stay at 0 — the pane's own scroll was
    // unreachable by wheel even though it was the only thing that should have moved.
    const paneScrollTop = await pane.evaluate((el) => el.scrollTop);
    expect(paneScrollTop, 'the results pane must receive the wheel').toBeGreaterThan(0);
  });
});

test('closing every cruise tab returns to Search instead of blanking the app', async ({ page }) => {
  const crashes: string[] = [];
  page.on('pageerror', (error) => crashes.push(error.message.split('\n')[0] ?? ''));

  const frame = await searchFromShell(page);

  for (const cruiseId of ['HID270322T', 'OVS270325C', 'XPO271113T']) {
    await frame.getByTestId('workspace-tab-strip').getByLabel('Search').click();
    await expect(frame.getByTestId('results-populated')).toBeVisible();
    await frame
      .getByTestId('cruise-card')
      .filter({ hasText: cruiseId })
      .getByRole('button', { name: 'Cruise details' })
      .click();
    await expect(frame.getByTestId('cruise-details')).toBeVisible();
  }

  const closeButtons = frame.locator(
    '[data-testid="workspace-tab-strip"] button[aria-label^="Close"]',
  );
  await expect(closeButtons).toHaveCount(3);

  // Closing the LAST open cruise deletes its choices slice while the detail container is still
  // mounted. The container's store selector then fell to a fresh object literal on every call;
  // `useSyncExternalStore` compares snapshots by reference, so React re-rendered until it gave
  // up with "Maximum update depth exceeded" and unmounted the entire tree — leaving an empty
  // iframe inside the host shell, which is exactly what the agents saw.
  while ((await closeButtons.count()) > 0) {
    await closeButtons.first().click();
    await page.waitForTimeout(400);
    await expect(
      frame.getByTestId('workspace-tab-strip'),
      'the app must stay mounted while tabs are closed',
    ).toBeVisible();
  }

  await expect(frame.getByTestId('search-form')).toBeVisible();
  expect(crashes, 'closing tabs must not throw').toEqual([]);
});
