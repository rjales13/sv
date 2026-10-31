import { expect, type Page, test } from '@playwright/test';

/*
  Extensions tab — the "Add this extension" control sits at the card's right edge whether
  or not the card has a description column.

  Only 10 of the 19 delivered extensions carry AEM copy (ADR-0016 § 11), so cards without
  bullets are common. The checkbox used to follow straight after the stays, which left it
  mid-card on those and at a different x on every card. HID shows both cases on one page:
  Milan has bullets, Paris Extension has none.
*/

const CRUISE = 'HID270322T';

function card(page: Page, title: string) {
  return page.locator('[data-slot="extensions-card"]').filter({ hasText: title });
}

async function checkboxOffsetFromRight(page: Page, title: string): Promise<number> {
  const cardBox = await card(page, title).boundingBox();
  const checkboxBox = await card(page, title).getByRole('checkbox').boundingBox();
  if (cardBox === null || checkboxBox === null) throw new Error(`${title} card is not visible`);
  return cardBox.x + cardBox.width - checkboxBox.x;
}

// 1500 fits every column at its designed width. 1280 and 1100 do not: there the description
// column must give up width, not push the checkbox out of line or off the card.
for (const width of [1500, 1280, 1100]) {
  test(`the include checkbox is pinned to the right, with or without bullets (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/embed/cruise/${CRUISE}/extensions`);
    await expect(card(page, 'Milan Extension').getByRole('listitem').first()).toBeVisible();
    await expect(card(page, 'Paris Extension').getByRole('listitem')).toHaveCount(0);

    const withBullets = await checkboxOffsetFromRight(page, 'Milan Extension');
    const withoutBullets = await checkboxOffsetFromRight(page, 'Paris Extension');

    expect(withBullets, 'same x on every card').toBeCloseTo(withoutBullets, 0);
    // The checkbox column is 199px plus the card's 16px padding; anything wider means it has
    // drifted left into the card.
    expect(withoutBullets).toBeLessThanOrEqual(216);
  });
}
