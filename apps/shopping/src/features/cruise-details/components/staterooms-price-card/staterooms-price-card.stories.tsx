import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { StateroomsPriceCard } from './staterooms-price-card';

const EXAMPLE_COLUMNS = [
  {
    title: 'Owners Suite',
    items: [
      { abbrev: 'OS1', price: '$114,799', statA: '10' },
      { abbrev: 'OS2', price: '$114,799', statA: '10' },
      { abbrev: 'OS3', price: '$114,799', statA: '10' },
      { abbrev: 'OS4', price: '$114,799', statA: '10' },
      { abbrev: 'OS5', price: '$114,799', statA: '10' },
      { abbrev: 'OS6', price: '$114,799', statA: '10' },
    ],
  },
  {
    title: 'Explorer Suite',
    items: [
      { abbrev: 'ES1', price: '$114,799', statA: '10' },
      { abbrev: 'ES2', price: '$114,799', statA: '10' },
      { abbrev: 'ES3', price: '$114,799', statA: '10' },
      { abbrev: 'ES4', price: '$114,799', statA: '10' },
      { abbrev: 'ES5', price: '$114,799', statA: '10' },
      { abbrev: 'ES6', price: '$114,799', statA: '10' },
    ],
  },
  {
    title: 'Penthouse Jr. Suite',
    items: [
      { abbrev: 'PS1', price: '$114,799', statA: '10' },
      { abbrev: 'PS2', price: '$114,799', statA: '10' },
      { abbrev: 'PS3', price: '$114,799', statA: '10' },
      { abbrev: 'PS4', price: '$114,799', statA: '10' },
      { abbrev: 'PS5', price: '$114,799', statA: '10' },
      { abbrev: 'PS6', price: '$114,799', statA: '10' },
    ],
  },
  {
    title: 'Penthouse Veranda',
    items: [
      { abbrev: 'PV1', price: '$114,799', statA: '10' },
      { abbrev: 'PV2', price: '$114,799', statA: '10' },
      { abbrev: 'PV3', price: '$114,799', statA: '10' },
      { abbrev: 'PV4', price: '$114,799', statA: '10' },
      { abbrev: 'PV5', price: '$114,799', statA: '10' },
      { abbrev: 'PV6', price: '$114,799', statA: '10' },
    ],
  },
  {
    title: 'Deluxe Veranda',
    items: [
      { abbrev: 'DV1', price: '$9,999', statA: '10' },
      { abbrev: 'DV2', price: '$9,999', statA: '10' },
      { abbrev: 'DV3', price: '$9,999', statA: '10' },
      { abbrev: 'DV4', price: '$9,999', statA: '10' },
      { abbrev: 'DV5', price: '$9,999', statA: '10' },
      { abbrev: 'DV6', price: '$9,999', statA: '10' },
    ],
  },
  {
    title: 'Veranda',
    items: [
      { abbrev: 'V1', price: '$114,799', statA: '10' },
      { abbrev: 'V2', price: '$114,799', statA: '10' },
      { abbrev: 'V3', price: '$114,799', statA: '10' },
      { abbrev: 'V4', price: '$114,799', statA: '10' },
      { abbrev: 'V5', price: '$114,799', statA: '10' },
      { abbrev: 'V6', price: '$114,799', statA: '10' },
    ],
  },
];

const meta = {
  title: 'Shopping/StateroomsPriceCard',
  component: StateroomsPriceCard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    columns: EXAMPLE_COLUMNS,
  },
} satisfies Meta<typeof StateroomsPriceCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Default — a category (Deluxe Veranda DV3) has been selected by the agent. */
export const Default: Story = {
  args: {
    selectedCategory: {
      name: 'Deluxe Veranda',
      code: 'DV3',
      price: '$9,999',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // "Category Selection" header is unique to the left panel.
    await expect(canvas.getByText('Category Selection')).toBeInTheDocument();
    // These texts appear in both the left panel and the price grid rows — use getAllByText.
    await expect(canvas.getAllByText('Deluxe Veranda').length).toBeGreaterThanOrEqual(1);
    await expect(canvas.getAllByText('DV3').length).toBeGreaterThanOrEqual(1);
    await expect(canvas.getAllByText('$9,999').length).toBeGreaterThanOrEqual(1);
    // Column titles that only appear in the price grid.
    await expect(canvas.getByText('Owners Suite')).toBeInTheDocument();
    await expect(canvas.getByText('Veranda')).toBeInTheDocument();
  },
};

/** Unselected — no category chosen yet; em-dash placeholders appear in the selection panel. */
export const Unselected: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Category Selection')).toBeInTheDocument();
    // Three em-dash placeholders: name, code, price (only in the left panel).
    const dashes = canvas.getAllByText('–');
    await expect(dashes).toHaveLength(3);
    // Column titles are still present in the price grid.
    await expect(canvas.getByText('Deluxe Veranda')).toBeInTheDocument();
  },
};

/** Three columns — confirms the component scales down correctly with fewer categories. */
export const ThreeColumns: Story = {
  args: {
    selectedCategory: { name: 'Owners Suite', code: 'OS1', price: '$114,799' },
    columns: EXAMPLE_COLUMNS.slice(0, 3),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // "Owners Suite" appears in both the left panel and as a column title.
    await expect(canvas.getAllByText('Owners Suite').length).toBeGreaterThanOrEqual(1);
    // "OS1" appears in both the left panel and the price grid rows.
    await expect(canvas.getAllByText('OS1').length).toBeGreaterThanOrEqual(1);
    // Fourth column must not be present.
    await expect(canvas.queryByText('Penthouse Veranda')).not.toBeInTheDocument();
  },
};
