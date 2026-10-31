import { expect, type Page, test } from '@playwright/test';
import { pressSearch } from './support/journey.ts';

/*
  The CRM launch (VCX-10480), in a real browser. Dynamics 365 frames the app with record ids on
  its URL; the app parses them once into its session. The unit and composition-root tests prove
  every rule; this spec proves what only a browser can: a real `location.search`, the mock D365
  shell forwarding it through a real iframe, real sessionStorage surviving a real reload, and
  `navigate()` driving the real router.

  The session's contact is read from `data-crm-contact` ("selected" | "unselected") on the app
  shell: the guest band does not show the CRM contact yet (ADR-0019), so there is nothing else
  on screen to assert against. The ids are the mock CRM adapters' fixtures.
*/

const MOCK_CONTACT_ID = '00000000-0000-0000-0000-0000000000c1';
const MOCK_AGENT_ID = '00000000-0000-0000-0000-0000000000a1';

/** Where the session's contact ended up, on the app document `page` shows. */
function crmContact(page: Page) {
  return page.locator('[data-crm-contact]');
}

test.describe('a CRM launch reaches the session', () => {
  test('the mock D365 shell forwards the launch into the app it frames', async ({ page }) => {
    // Uppercase, as CRM sends it, plus the standard D365 record pair.
    await page.goto(
      `/?contactId=${MOCK_CONTACT_ID.toUpperCase()}&userId=${MOCK_AGENT_ID}` +
        '&id=2e44aaca-3a8b-ef11-ac21-6045bded05b3&typename=opportunity&type=3',
    );
    const frame = page.frameLocator('[data-testid="app-frame"]');

    await expect(frame.locator('[data-crm-contact]')).toHaveAttribute(
      'data-crm-contact',
      'selected',
    );
  });

  test('a plain run carries no launch, so it starts with no contact', async ({ page }) => {
    await page.goto('/embed');

    await expect(crmContact(page)).toHaveAttribute('data-crm-contact', 'unselected');
  });

  test('a malformed contact id degrades to no contact, and search still works', async ({
    page,
  }) => {
    await page.goto('/embed?contactId=not-a-guid');

    await expect(crmContact(page)).toHaveAttribute('data-crm-contact', 'unselected');
    await expect(page.getByTestId('search-form')).toBeVisible();
  });

  // The dev server runs on mock CRM data, where the agent is a placeholder. A real CRM launch
  // carries the real agent's userId, so it must NOT be denied here — the userId check only
  // runs once the agent comes from the integration layer (the composition-root tests cover
  // the denied path with the `il` source).
  test("a real agent's launch is not denied while CRM data is mocked", async ({ page }) => {
    await page.goto(
      `/embed?contactId=${MOCK_CONTACT_ID}&userId=59080737-cdec-ec11-bb3d-000d3a13af0c`,
    );

    await expect(crmContact(page)).toHaveAttribute('data-crm-contact', 'selected');
    await expect(page.getByTestId('auth-denied')).toHaveCount(0);
  });
});

test('opening a cruise and reloading keeps the launch contact', async ({ page }) => {
  await page.goto(`/embed?contactId=${MOCK_CONTACT_ID}&userId=${MOCK_AGENT_ID}`);
  await expect(crmContact(page)).toHaveAttribute('data-crm-contact', 'selected');

  // Opening a cruise goes through the host seam's navigate(), and in-app navigation drops the
  // query string — so the reload below arrives with no launch on its URL.
  await pressSearch(page);
  await expect(page.getByTestId('results-populated')).toBeVisible();
  await page
    .getByRole('button', { name: /cruise details/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/embed\/cruise\/[^?]+$/);

  await page.reload();

  // Restored from the tab's sessionStorage, not re-read from the URL.
  await expect(crmContact(page)).toHaveAttribute('data-crm-contact', 'selected');
});
