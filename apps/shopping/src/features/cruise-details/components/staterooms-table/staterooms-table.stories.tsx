import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { StateroomsTable } from './staterooms-table';

const ROWS_DEFAULT = [
  { stateroom: '5047', checked: true },
  { stateroom: '5065' },
  { stateroom: '4080' },
  { stateroom: '5042' },
  { stateroom: '4074' },
  { stateroom: '5053' },
  { stateroom: '4069' },
  { stateroom: '5071' },
  { stateroom: '4049' },
  { stateroom: '5058' },
  { stateroom: '4078' },
  { stateroom: '5081' },
  { stateroom: '4052' },
  { stateroom: '5067' },
  { stateroom: '4072' },
  { stateroom: '5043' },
];

const meta = {
  title: 'Shopping/StateroomsTable',
  component: StateroomsTable,
  parameters: { layout: 'padded' },
  // The card takes its height from its container (in the app, the deck plan beside it), so
  // the gallery gives it the Figma frame's 540px — otherwise it collapses to its header.
  decorators: [
    (Story) => (
      <div className="h-[540px]">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  args: { onRowChange: fn() },
} satisfies Meta<typeof StateroomsTable>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Default — stateroom 5047 is selected (blue row + checked checkbox). Scrollbar appears with many rows. */
export const Default: Story = {
  args: {
    rows: ROWS_DEFAULT,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('STATEROOM')).toBeInTheDocument();
    await expect(canvas.getByText('5047')).toBeInTheDocument();

    // Row 5047 should be pre-checked.
    const checkboxes = canvas.getAllByRole('checkbox');
    await expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true');
    await expect(checkboxes[1]).toHaveAttribute('aria-checked', 'false');

    // Clicking an unchecked row fires onRowChange with (stateroom, true).
    await userEvent.click(checkboxes[1] as HTMLElement);
    await expect(args.onRowChange).toHaveBeenCalledWith('5065', true);
  },
};

/** Empty — no category has been selected yet; prompt guides the agent to pick one. */
export const Empty: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('STATEROOM')).toBeInTheDocument();
    await expect(canvas.getByText('Select a Stateroom Category')).toBeInTheDocument();
    await expect(canvas.queryByRole('checkbox')).not.toBeInTheDocument();
  },
};

/** GtyOnly — the category only offers a Guarantee booking; explains what GTY means. */
export const GtyOnly: Story = {
  args: {
    rows: [{ stateroom: 'GTY' }],
    isGtyOnly: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('GTY')).toBeInTheDocument();
    await expect(canvas.getByText('Guarantee Only')).toBeInTheDocument();
    await expect(
      canvas.getByText(/No physical staterooms are available/i),
    ).toBeInTheDocument();
  },
};

/** SingleRow — confirms layout holds with minimal data. */
export const SingleRow: Story = {
  args: {
    rows: [{ stateroom: '5047' }],
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('5047')).toBeInTheDocument();
    const [checkbox] = canvas.getAllByRole('checkbox');
    await expect(checkbox).toHaveAttribute('aria-checked', 'false');

    // Clicking the single row fires onRowChange.
    await userEvent.click(checkbox as HTMLElement);
    await expect(args.onRowChange).toHaveBeenCalledWith('5047', true);
  },
};
