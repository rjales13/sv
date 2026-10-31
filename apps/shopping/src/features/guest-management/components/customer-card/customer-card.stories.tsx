import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { CustomerCard, type CustomerCardContact } from './customer-card.tsx';

const CUSTOMER: CustomerCardContact = {
  role: 'customer',
  name: 'Mr. John Smith Whitcombe',
  id: '100838606001',
  pastGuest: true,
};
const AGENT: CustomerCardContact = { role: 'travel-agent', name: 'Patty Kole', id: '270348' };
const ONE_GUEST = ['Mr. Jhon Smith Whitcombe'];
const TWO_GUESTS = ['Mr. Jhon Smith Whitcombe', 'Ms. Mary Stone Davis'];

const meta = {
  title: 'Shopping/CustomerCard',
  component: CustomerCard,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  // Figma draws the band at 1308px.
  decorators: [
    (Story) => (
      <div className="w-[1308px]">
        <Story />
      </div>
    ),
  ],
  args: { contact: CUSTOMER, guests: ONE_GUEST, onExpandedChange: fn() },
} satisfies Meta<typeof CustomerCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default-1PAX. */
export const Default1Pax: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Guests (1)')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onExpandedChange).toHaveBeenCalledWith(true);
    await expect(canvas.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  },
};

/** Default-2PAX. */
export const Default2Pax: Story = {
  args: { guests: TWO_GUESTS },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Guests (2)')).toBeInTheDocument();
  },
};

/** Expanded-1PAX — selected-blue row, back chevron in the avatar. */
export const Expanded1Pax: Story = {
  args: { expanded: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="customer-card-chevron"]')).not.toBeNull();
  },
};

/** Expanded-2PAX. */
export const Expanded2Pax: Story = { args: { expanded: true, guests: TWO_GUESTS } };

/** Unselected — a customer, no guest chosen yet. */
export const UnselectedGuests: Story = {
  args: { guests: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Unselected')).toBeInTheDocument();
  },
};

/** TA-unselected-guest. */
export const TravelAgentUnselectedGuest: Story = { args: { contact: AGENT, guests: [] } };

/** TA-unselected-guest-expanded. */
export const TravelAgentUnselectedGuestExpanded: Story = {
  args: { contact: AGENT, guests: [], expanded: true },
};

/** TA-collapsed-guests. */
export const TravelAgentCollapsed: Story = {
  args: { contact: AGENT },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Travel Agent')).toBeInTheDocument();
  },
};

/** TA-expanded-guests — a travel agent keeps its initials when expanded. */
export const TravelAgentExpanded: Story = {
  args: { contact: AGENT, expanded: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('PK')).toBeInTheDocument();
  },
};

/** Unselected-collapsed — no contact on the call yet. */
export const UnselectedContact: Story = {
  args: { contact: undefined, guests: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Unselected Contact')).toBeInTheDocument();
    await expect(canvas.queryByText(/Guests/)).toBeNull();
  },
};

/** Unselected-expanded. */
export const UnselectedContactExpanded: Story = {
  args: { contact: undefined, guests: [], expanded: true },
};
