import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { CardHeader } from './card-header';

/*
  CardHeader — cr / extension result row header (node 748:48042).

  Each story covers:
    • A11y        — axe runs automatically via @storybook/addon-a11y after play().
    • Interaction — play() asserts what the row renders.

  CardHeader is presentational: it owns no state and exposes no controls, so
  play() verifies rendered content rather than driving events.
*/

const cr = {
  title: 'Grand European Tour',
  meta: 'EUR',
  ship: 'VA Shipxxx',
  voyageCode: 'VIL00000000',
  priceLabel: 'Starting at',
} as const;

const EXTENSION = {
  title: 'Extension Name',
  meta: '4 Nights',
  priceLabel: '54 Available',
} as const;

const meta = {
  title: 'Shopping/CardHeader',
  component: CardHeader,
  parameters: { layout: 'padded' },
  args: { amount: '$4,999.00', currencyCode: 'USD' },
  argTypes: {
    category: {
      control: 'select',
      options: [
        'oceans',
        'rivers',
        'expeditions',
        'mississippi',
        'pre',
        'pre-stopover',
        'post',
        'post-stopover',
        'land-package',
      ],
    },
  },
} satisfies Meta<typeof CardHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Oceans — the default cr row: navy chip, ship and voyage code. */
export const Oceans: Story = {
  args: { ...cr, category: 'oceans' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Oceans')).toBeInTheDocument();
    await expect(canvas.getByText('Grand European Tour')).toBeInTheDocument();
    await expect(canvas.getByText('EUR')).toBeInTheDocument();
    await expect(canvas.getByText('VA Shipxxx')).toBeInTheDocument();
    await expect(canvas.getByText('VIL00000000')).toBeInTheDocument();
    await expect(canvas.getByText('Starting at')).toBeInTheDocument();
    await expect(canvas.getByText('$4,999.00')).toBeInTheDocument();
  },
};

/** Rivers — VA red chip. */
export const Rivers: Story = {
  args: { ...cr, category: 'rivers' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Rivers')).toBeInTheDocument();
  },
};

/** Expeditions — slate chip. */
export const Expeditions: Story = {
  args: { ...cr, category: 'expeditions' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Expeditions')).toBeInTheDocument();
  },
};

/** Mississippi — green chip. */
export const Mississippi: Story = {
  args: { ...cr, category: 'mississippi' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Mississippi')).toBeInTheDocument();
  },
};

/** crSoldOut — the price block is replaced by a SOLD OUT badge. */
export const crSoldOut: Story = {
  args: { ...cr, category: 'oceans', soldOut: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/sold out/i)).toBeInTheDocument();
    await expect(canvas.queryByText('$4,999.00')).not.toBeInTheDocument();
    await expect(canvas.queryByText('Starting at')).not.toBeInTheDocument();
  },
};

/** Pre — extension before the cr; no ship or voyage code. */
export const Pre: Story = {
  args: { ...EXTENSION, category: 'pre' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('PRE')).toBeInTheDocument();
    await expect(canvas.getByText('4 Nights')).toBeInTheDocument();
    await expect(canvas.getByText('54 Available')).toBeInTheDocument();
    // Extension rows carry no ship/voyage meta.
    await expect(canvas.queryByText('VIL00000000')).not.toBeInTheDocument();
  },
};

/** PreStopover — extension stopover before the cr. */
export const PreStopover: Story = {
  args: { ...EXTENSION, category: 'pre-stopover' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('PRE STOPOVER')).toBeInTheDocument();
  },
};

/** Post — extension after the cr. */
export const Post: Story = {
  args: { ...EXTENSION, category: 'post' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('POST')).toBeInTheDocument();
  },
};

/** PostStopover — extension stopover after the cr. */
export const PostStopover: Story = {
  args: { ...EXTENSION, category: 'post-stopover' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('POST STOPOVER')).toBeInTheDocument();
  },
};

/** LandPackage — white chip; the price shows with no availability prefix. */
export const LandPackage: Story = {
  args: { title: EXTENSION.title, meta: EXTENSION.meta, category: 'land-package' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('INCLUDED LAND PACKAGE')).toBeInTheDocument();
    await expect(canvas.getByText('$4,999.00')).toBeInTheDocument();
    // No prefix — the land package price stands alone.
    await expect(canvas.queryByText('54 Available')).not.toBeInTheDocument();
    await expect(canvas.queryByText('Starting at')).not.toBeInTheDocument();
  },
};

/** ExtensionSoldOut — extension with no remaining inventory. */
export const ExtensionSoldOut: Story = {
  args: { ...EXTENSION, category: 'post', soldOut: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/sold out/i)).toBeInTheDocument();
    await expect(canvas.queryByText('$4,999.00')).not.toBeInTheDocument();
  },
};

/** LongTitle — a title beyond the row width truncates rather than wrapping. */
export const LongTitle: Story = {
  args: {
    ...cr,
    category: 'oceans',
    title: 'Grand European Tour with Extended Scandinavian Fjords and Baltic Capitals',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Grand European Tour with Extended/)).toBeInTheDocument();
    // Meta strip survives a long title — it must not be pushed out of the row.
    await expect(canvas.getByText('VIL00000000')).toBeInTheDocument();
  },
};
