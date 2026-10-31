import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ExtensionDescription } from './extension-description';

const meta = {
  title: 'Shopping/ExtensionDescription',
  component: ExtensionDescription,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof ExtensionDescription>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Paragraph — long prose description. Matches Figma "long descr" variant. */
export const Paragraph: Story = {
  args: {
    text: "Discover the romantic charm of Verona, where Shakespeare's tales come to life amidst stunning architecture and vibrant piazzas. Enjoy a stay at the elegant Verona Hotel, offering luxurious amenities and breathtaking views of the city. In Como, immerse yourself in the serene beauty of Lake Como, with its picturesque landscapes and quaint lakeside cafes. The Como Hotel provides a perfect retreat, blending comfort with stunning vistas.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Discover the romantic charm/)).toBeInTheDocument();
    await expect(canvas.queryByRole('list')).not.toBeInTheDocument();
  },
};

/** Combined — prose description above a bullet list in one component instance. */
export const Combined: Story = {
  args: {
    text: "Discover the romantic charm of Verona, where Shakespeare's tales come to life amidst stunning architecture and vibrant piazzas. Enjoy a stay at the elegant Verona Hotel, offering luxurious amenities and breathtaking views of the city.",
    bullets: [
      '3 hotel nights in Milan (as shown or similar)',
      '3 meals: 3 breakfasts (B)',
      '1 included tour: Historic Milan by Foot',
      'Services of a Viking Host',
      'All transfers',
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Discover the romantic charm/)).toBeInTheDocument();
    await expect(canvas.getByRole('list')).toBeInTheDocument();
    await expect(canvas.getByText('All transfers')).toBeInTheDocument();
  },
};

/** BulletList — extension inclusions as a disc list. Matches Figma "bullet list" variant. */
export const BulletList: Story = {
  args: {
    bullets: [
      '3 hotel nights in Milan (as shown or similar)',
      '3 meals: 3 breakfasts (B)',
      '1 included tour: Historic Milan by Foot',
      'Services of a Viking Host',
      'All transfers',
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('list')).toBeInTheDocument();
    await expect(canvas.getAllByRole('listitem')).toHaveLength(5);
    await expect(canvas.getByText('All transfers')).toBeInTheDocument();
  },
};
