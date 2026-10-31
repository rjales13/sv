import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion } from '@vikings/ui/components/accordion';
import { expect, userEvent, within } from 'storybook/test';
import { ItineraryDetail, type ItineraryDetailProps } from './itinerary-detail';

/*
  ItineraryDetail — ShoppingApp_UX-VD node 906:118908.

  Figma's five variants are reproduced here by combining `day`, `through` and the
  parent accordion's open set rather than by a variant prop — see the note at the
  top of itinerary-detail.tsx. Each story below names the Figma variant it stands
  in for.

  Every story wraps the row in an Accordion because the row is an AccordionItem:
  the root owns the open state, exactly as TabsBar needs a Tabs root.
*/

const OVERVIEW =
  'Arrive and check in to your hotel. Long a hub of French culture and cuisine, Paris is one of the most romantic destinations in the world. Over the centuries, Parisian culture has been built on the wings of inspiration. Music, film, architecture, literature, dance and the visual arts all have their brilliant place in the museums, theaters, bookstores and remarkably preserved buildings of this magnificent city. At the center of it all is the Champs-Élysées. With its inviting riverside promenade, graceful bridges and splendid views of all things Parisian, from the Eiffel Tower to the Louvre Museum.';

/** Renders the row closed. */
const closed = (args: ItineraryDetailProps) => (
  <Accordion type="multiple">
    <ItineraryDetail {...args} />
  </Accordion>
);

/** Renders the row with the parent accordion already naming it open. */
const opened = (args: ItineraryDetailProps) => (
  <Accordion type="multiple" defaultValue={[args.value]}>
    <ItineraryDetail {...args} />
  </Accordion>
);

const meta = {
  title: 'Shopping/ItineraryDetail',
  component: ItineraryDetail,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  // Only the always-present props live on meta. `day`, `through` and `overview`
  // are added per story, because `exactOptionalPropertyTypes` makes clearing one
  // with an explicit `undefined` a type error.
  args: {
    value: 'paris',
    port: 'Paris, France (PAR)',
    variant: 'hotel',
    label: 'Paris Hotel',
    tags: ['Board 3:00 PM', 'Overnight', 'Attribute'],
    summary:
      'Admire iconic landmarks, such as the Eiffel Tower and Arc de Triomphe, or browse the Louvre.',
  },
  render: closed,
} satisfies Meta<typeof ItineraryDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

const DAY = { ordinal: 'DAY 1', date: '01 JUL (MON)' };
const THROUGH = { ordinal: 'DAY 5', date: '05 JUL (MON)' };

/** Figma "Expanded" — a multi-day stop open on its overview, tinted and navy-belled. */
export const Expanded: Story = {
  args: { day: DAY, through: THROUGH, overview: OVERVIEW },
  render: opened,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Arrive and check in to your hotel/)).toBeVisible();
    await expect(canvas.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  },
};

/** Figma "Collapsed" — same stop closed: no tint, slate bullet, overview withheld. */
export const Collapsed: Story = {
  args: { day: DAY, through: THROUGH, overview: OVERVIEW },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(/Arrive and check in to your hotel/)).toBeNull();
    await expect(canvas.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  },
};

/** Figma "Single day" — one calendar stamp, so the rule and closing stamp collapse away. */
export const SingleDay: Story = {
  args: { day: DAY, overview: OVERVIEW },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('DAY 1')).toBeVisible();
    await expect(canvas.queryByText('DAY 5')).toBeNull();
  },
};

/** Figma "singleday-expanded" — the single-day stop opened. */
export const SingleDayExpanded: Story = {
  args: { day: DAY, overview: OVERVIEW },
  render: opened,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Arrive and check in to your hotel/)).toBeVisible();
    await expect(canvas.queryByText('DAY 5')).toBeNull();
  },
};

/** Figma "Variant4" — a continuation stop sharing the day above; bullet gutter kept, no chevron. */
export const Continuation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('DAY 1')).toBeNull();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

/** The day row drives the disclosure — open and close it through the real control. */
export const Toggles: Story = {
  args: { day: DAY, through: THROUGH, overview: OVERVIEW },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button');

    await userEvent.click(trigger);
    await expect(canvas.getByText(/Arrive and check in to your hotel/)).toBeVisible();

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};

/** Two stops in one accordion — arrow keys move between their day headers. */
export const StopSequence: Story = {
  args: { day: DAY, through: THROUGH, overview: OVERVIEW },
  render: (args) => (
    <Accordion type="multiple" className="flex flex-col">
      <ItineraryDetail {...args} />
      <ItineraryDetail
        value="rouen"
        variant="sailing"
        port="Rouen, France (URO)"
        label="Viking Herja"
        tags={['Depart 6:00 PM']}
        summary="Sail the Seine past the chalk cliffs of Normandy."
      />
    </Accordion>
  ),
};
