import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import { VAlert } from './alert';

const meta = {
  title: 'Shopping/VAlert',
  component: VAlert,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  args: {
    variant: 'info',
    emphasis: 'subtle',
    title: 'Information',
    description: 'Your session is active. No action is needed at this time.',
  },
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'error'] },
    emphasis: { control: 'select', options: ['subtle', 'inverted'] },
  },
} satisfies Meta<typeof VAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Info — the resting banner. Colour and glyph both come from `variant`. */
export const Info: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toBeInTheDocument();
    await expect(canvas.getByText('Information')).toBeInTheDocument();
  },
};

/** Success — confirmation that an action completed. */
export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Saved Search created',
    description: 'The search has been saved and is visible to all agents handling this booking.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Saved Search created')).toBeInTheDocument();
  },
};

/** Warning — non-blocking issue that needs agent attention. */
export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Cabin hold expiring soon',
    description: 'The hold on this cabin will expire in under 5 minutes. Confirm or release it now.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Cabin hold expiring soon')).toBeInTheDocument();
  },
};

/** ErrorAlert — blocking issue; the agent must act before continuing. */
export const ErrorAlert: Story = {
  args: {
    variant: 'error',
    title: 'Search failed',
    description: 'Could not retrieve cruise results. Check your connection and try again.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Search failed')).toBeInTheDocument();
  },
};

/** Inverted — solid status fill with white content, for high-priority banners. */
export const Inverted: Story = {
  args: {
    emphasis: 'inverted',
    title: 'System maintenance scheduled',
    description: 'The booking system will be unavailable on Saturday from 02:00–04:00 UTC.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('System maintenance scheduled')).toBeInTheDocument();
  },
};

/** CustomIcon — `icon` swaps the glyph only; the status colour still comes from `variant`. */
export const CustomIcon: Story = {
  args: {
    variant: 'success',
    icon: 'IconTravelAnchor',
    title: 'Ship docked',
    description: 'The vessel has arrived and guests may disembark.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Ship docked')).toBeInTheDocument();
    // Colour is still the success ramp even though the glyph changed.
    await expect(canvasElement.querySelector('[data-variant="success"]')).toBeTruthy();
  },
};

/** Dismissible — supplying `onDismiss` renders the close button. */
export const Dismissible: Story = {
  args: {
    variant: 'warning',
    title: 'Cabin hold expiring soon',
    description: 'Confirm or release the hold.',
    onDismiss: fn(),
    dismissLabel: 'Dismiss hold warning',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const dismiss = canvas.getByRole('button', { name: 'Dismiss hold warning' });
    dismiss.focus();
    await expect(dismiss).toHaveFocus();
    dismiss.click();
    await expect(args.onDismiss).toHaveBeenCalled();
  },
};

/** NoIcon — `showIcon={false}` drops the glyph; the copy closes up to the edge. */
export const NoIcon: Story = {
  args: {
    variant: 'error',
    showIcon: false,
    title: 'Search failed',
    description: 'Could not retrieve cruise results.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Search failed')).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-slot="v-alert-icon"]')).toBeNull();
    // The status is still announced even with no glyph.
    await expect(canvas.getByText('Error')).toBeInTheDocument();
  },
};

/** CloseWithoutHandler — `showClose` forces the button on for callers wiring dismissal elsewhere. */
export const CloseWithoutHandler: Story = {
  args: { variant: 'info', showClose: true, title: 'Heads up', description: 'Dismissal is external.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  },
};

/** WithoutTitle — a single line; the banner centres against the glyph. */
export const WithoutTitle: Story = {
  args: { variant: 'success', title: undefined, description: 'Changes saved successfully.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Changes saved successfully.')).toBeInTheDocument();
  },
};
