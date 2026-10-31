import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, TabsContent } from '@vikings/ui/components/tabs';
import { expect, within } from 'storybook/test';
import { TabsBar } from './tabs-bar';

/*
  TabsBar — ShoppingApp_UX-VD node 1667:80174.

  Every story supplies its own <Tabs> root: the strip renders the list only, so the
  active value and the panes belong to the caller. See the note at the top of
  tabs-bar.tsx for why, and for how this differs from CruiseDetailsTabs.
*/

const CRUISE_TABS = [
  { value: 'itinerary', label: 'Itinerary' },
  { value: 'stateroom', label: 'Staterooms' },
  { value: 'extensions', label: 'Extensions' },
  { value: 'air', label: 'Viking Air' },
];

const meta = {
  title: 'Shopping/TabsBar',
  component: TabsBar,
  parameters: {
    layout: 'fullscreen',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  args: { tabs: CRUISE_TABS },
} satisfies Meta<typeof TabsBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** CruiseSections — the approved frame: four panes, Itinerary in view. */
export const CruiseSections: Story = {
  render: (args) => (
    <Tabs defaultValue="itinerary">
      <TabsBar {...args} />
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('tab')).toHaveLength(4);
    await expect(canvas.getByRole('tab', { name: 'Itinerary' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
};

/** StateroomsActive — the indicator follows the value, it is not pinned to the first tab. */
export const StateroomsActive: Story = {
  render: (args) => (
    <Tabs defaultValue="stateroom">
      <TabsBar {...args} />
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('tab', { name: 'Staterooms' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
};

/** WithDisabledPane — the Tabs molecule's third state; this bar does not use it in Figma. */
export const WithDisabledPane: Story = {
  args: {
    tabs: [
      { value: 'itinerary', label: 'Itinerary' },
      { value: 'stateroom', label: 'Staterooms' },
      { value: 'air', label: 'Viking Air', disabled: true },
    ],
  },
  render: (args) => (
    <Tabs defaultValue="itinerary">
      <TabsBar {...args} />
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('tab', { name: 'Viking Air' })).toBeDisabled();
  },
};

/** WithPanes — the strip wired to real content, which is the only way it is useful. */
export const WithPanes: Story = {
  render: (args) => (
    <Tabs defaultValue="itinerary">
      <TabsBar {...args} />
      <TabsContent value="itinerary" className="p-4 text-ink-secondary">
        15 days · Paris to the Swiss Alps · 12 guided tours included.
      </TabsContent>
      <TabsContent value="stateroom" className="p-4 text-ink-secondary">
        Veranda, Penthouse and Explorer suites available.
      </TabsContent>
      <TabsContent value="extensions" className="p-4 text-ink-secondary">
        Pre- and post-cruise hotel nights.
      </TabsContent>
      <TabsContent value="air" className="p-4 text-ink-secondary">
        Gateway and cabin class selection.
      </TabsContent>
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/15 days/)).toBeInTheDocument();
  },
};
