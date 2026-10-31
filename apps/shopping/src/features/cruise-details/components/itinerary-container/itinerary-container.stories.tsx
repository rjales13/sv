import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ItineraryContainer, type ItineraryContainerStop } from './itinerary-container';

/*
  ItineraryContainer — ShoppingApp_UX-VD nodes 2222:422764 (all collapsed) and
  2222:422854 (first day open). Both frames are instances of the same component;
  the stories below mirror them with the Rhine itinerary the design uses.
*/

const PARIS_OVERVIEW =
  'Arrive and check in to your hotel. Long a hub of French culture and cuisine, Paris is one of the most romantic destinations in the world. Over the centuries, Parisian culture has been built on the wings of inspiration. Music, film, architecture, literature, dance and the visual arts all have their brilliant place in the museums, theaters, bookstores and remarkably preserved buildings of this magnificent city. At the center of it all is the Champs-Élysées. With its inviting riverside promenade, graceful bridges and splendid views of all things Parisian, from the Eiffel Tower to the Louvre Museum.';

/** The 13 stops of the Paris-to-Swiss-Alps sailing, exactly as the design lists them. */
const FROM_FIGMA: ItineraryContainerStop[] = [
  {
    id: 'paris',
    day: { ordinal: 'DAY 1', date: '01 JUL (MON)' },
    through: { ordinal: 'DAY 2', date: '02 JUL (MON)' },
    port: 'Paris, France (PAR)',
    variant: 'hotel',
    label: 'Paris Hotel',
    tags: ['Included Land Package', 'Overnight'],
    summary:
      'Admire iconic landmarks, such as the Eiffel Tower and Arc de Triomphe, or browse the Louvre.',
    overview: PARIS_OVERVIEW,
  },
  {
    id: 'trier-departure',
    day: { ordinal: 'DAY 3', date: '03 JUL (WED)' },
    port: 'Trier, Germany (TRI)',
    variant: 'departure',
    label: 'Cruise Departure',
    tags: ['Depart 3:00 PM', 'Overnight in port'],
    summary: 'Explore the highlights of Germany’s oldest city, from Porta Nigra to the Liebfrauenkirche.',
  },
  {
    id: 'trier-dock',
    day: { ordinal: 'DAY 4', date: '04 JUL (THU)' },
    port: 'Trier, Germany (TRI)',
    variant: 'port',
    label: 'Dock',
    tags: ['Overnight in port'],
    summary: 'Discover Trier’s Roman origins; see the 20,000-spectator amphitheater and Roman baths.',
  },
  {
    id: 'bernkastel',
    port: 'Bernkastel, Germany (BEK)',
    variant: 'port',
    label: 'Dock',
    summary:
      'Stroll along charming cobblestone streets and sample vintages from this wine making region.',
  },
  {
    id: 'cochem',
    day: { ordinal: 'DAY 5', date: '05 JUL (FRI)' },
    port: 'Cochem, Germany (COC)',
    variant: 'port',
    label: 'Dock',
    summary:
      'Visit hilltop Reichsburg Castle, see Cochem’s landmarks and taste locally produced mustard.',
  },
  {
    id: 'winningen',
    port: 'Winningen, Germany (WWG)',
    variant: 'port',
    label: 'Dock',
    summary: 'Taste a selection of delicious local wines, including the highly acclaimed Riesling.',
  },
  {
    id: 'koblenz',
    day: { ordinal: 'DAY 6', date: '06 JUL (SAT)' },
    port: 'Koblenz, Germany (KOB)',
    variant: 'port',
    label: 'Dock',
    tags: ['2:00 - 7:00 PM'],
    summary: 'Explore the German Corner and the historic Old Town of Koblenz.',
  },
  {
    id: 'middle-rhine',
    port: 'Middle Rhine Scenic Sailing, Germany (M03)',
    variant: 'transit',
    label: 'Transit',
    summary:
      'Sail past hilltop castles along the Middle Rhine, a UNESCO Site, and look for Lorelei Rock.',
  },
  {
    id: 'mainz',
    day: { ordinal: 'DAY 7', date: '07 JUL (SUN)' },
    port: 'Mainz, Germany (MAI)',
    variant: 'port',
    label: 'Dock',
    summary: 'Savor a taste of Mainz’s storied viticulture, famous for its high-quality white wines.',
  },
  {
    id: 'speyer',
    day: { ordinal: 'DAY 8', date: '08 JUL (MON)' },
    port: 'Speyer, Germany (SPE)',
    variant: 'port',
    label: 'Dock',
    summary:
      'Discover quaint Speyer and visit its historic Romanesque imperial cathedral, a UNESCO Site.',
  },
  {
    id: 'strasbourg',
    day: { ordinal: 'DAY 9', date: '09 JUL (TUE)' },
    port: 'Strasbourg, France (SXB)',
    variant: 'port',
    label: 'Dock',
    summary:
      'Encounter this multicultural city and its famed Strasbourg Cathedral; sample Alsatian food.',
  },
  {
    id: 'basel',
    day: { ordinal: 'DAY 10', date: '10 JUL (WED)' },
    port: 'Basel, Switzerland (BSL)',
    variant: 'arrival',
    label: 'Cruise Arrival',
    tags: ['Arrive 1:00 PM'],
    summary:
      'Discover the gateway to the Swiss Rhineland, where French, German and Swiss borders meet.',
  },
  {
    id: 'zurich',
    day: { ordinal: 'DAY 11', date: '11 JUL (THU)' },
    through: { ordinal: 'DAY 12', date: '12 JUL (MON)' },
    port: 'Zurich, Switzerland (ZRH)',
    variant: 'hotel',
    label: 'Zurich Hotel',
    tags: ['Land Package', 'Overnight'],
    summary: 'See landmarks including the Rathaus and the city’s many churches; sail the scenic lake.',
  },
];

/*
  Every row in the design carries a chevron, so every stop is expandable. Figma
  only spells out day 1's long-form copy — the rest are collapsed there, so their
  text is not in the file. Stand-in copy keeps the story faithful to the design's
  affordances rather than rendering twelve rows that cannot open.
*/
const RHINE: ItineraryContainerStop[] = FROM_FIGMA.map((stop) => ({
  ...stop,
  overview:
    stop.overview ?? `${stop.summary} Full details for this day appear here once it is opened.`,
}));

const meta = {
  title: 'Shopping/ItineraryContainer',
  component: ItineraryContainer,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  args: { stops: RHINE },
} satisfies Meta<typeof ItineraryContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma 2222:422764 — every day collapsed; the rail runs the full stack. */
export const AllCollapsed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Paris, France (PAR)', { ignore: '.sr-only' })).toBeVisible();
    await expect(canvas.getByText('Zurich, Switzerland (ZRH)', { ignore: '.sr-only' })).toBeVisible();
    await expect(canvas.queryByText(/Long a hub of French culture/)).toBeNull();
  },
};

/** Figma 2222:422854 — day 1 open. The rail re-anchors instead of falling short. */
export const FirstDayExpanded: Story = {
  args: { defaultExpandedIds: ['paris'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Long a hub of French culture/)).toBeVisible();
  },
};

/** The case the fixed Figma rectangle gets wrong — the last day open. */
export const LastDayExpanded: Story = {
  args: {
    stops: RHINE,
    defaultExpandedIds: ['zurich'],
  },
};

/** A single stop has no second bullet to reach, so no rail is drawn at all. */
export const SingleStop: Story = {
  args: { stops: RHINE.slice(0, 1) },
};

/** Opening a day from the chevron re-anchors the rail live. */
export const TogglesFromTheChevron: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole('button')[0] as HTMLElement);
    await expect(canvas.getByText(/Long a hub of French culture/)).toBeVisible();
  },
};
