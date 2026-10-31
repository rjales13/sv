import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { buildDefaultSearchPanelValues } from '../../lib/search-panel-schema.ts';
import { MOCK_SEARCH_PANEL_OPTIONS } from '../../test/search-panel-options.mock.ts';
import { SearchPanel } from '../search-panel/search-panel.tsx';

/*
  SearchPanel — 6 Figma variants (node 980:131832, ShoppingApp_UX-VD).

  Each story covers:
    • A11y — axe runs automatically via @storybook/addon-a11y after play(); any
      WCAG violation surfaces in the Accessibility panel.
    • Interaction — play() drives real user events so the Interactions panel
      shows a step-by-step replay.

  Variants:
    collapsed-default     — standard, pristine (buttons disabled)
    collased-enabled      — standard, query entered (buttons enabled)
    expanded-default      — filters open, pristine
    expanded-enabled      — filters open, values entered
    Agents-Open           — agentMode, Open Search selected
    Agents-GroupCrontract — agentMode, Group Contract selected
*/

const DEFAULTS_WITH_DATES = buildDefaultSearchPanelValues(new Date('2026-08-01'));

const meta = {
  title: 'Shopping/Search/SearchPanel',
  component: SearchPanel,
  parameters: {
    layout: 'padded',
    // a11y — global axe config for this story set; individual stories may override.
    a11y: {
      config: {
        rules: [
          // The scope Select trigger uses aria-label so this is covered;
          // colour-contrast is validated by the DS token values, not our code.
          { id: 'color-contrast', enabled: true },
        ],
      },
    },
  },
  args: {
    // The lists a `local` run serves; in the app they come from the catalogs port (VCX-10507).
    options: MOCK_SEARCH_PANEL_OPTIONS,
    onSearch: fn(),
  },
} satisfies Meta<typeof SearchPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─────────────────────────────────────────────────────────────────────────────
// collapsed-default
// ─────────────────────────────────────────────────────────────────────────────
/** collapsed-default — pristine state; Reset and Search are disabled. */
export const CollapsedDefault: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Reset and Search must be disabled when pristine.
    // Note: we do NOT click them — the DS Button sets `disabled:pointer-events-none`,
    // and userEvent throws on a pointer-events:none target. `toBeDisabled` is the
    // assertion that matters; the browser enforces the rest.
    await expect(canvas.getByTestId('sp-reset')).toBeDisabled();
    await expect(canvas.getByTestId('sp-search')).toBeDisabled();
    await expect(args.onSearch).not.toHaveBeenCalled();

    // Filters stay closed until the agent asks for them
    await expect(canvas.getByTestId('sp-toggle')).toHaveTextContent(/more options/i);
    await expect(canvas.queryByTestId('sp-products')).not.toBeInTheDocument();

    // Form and search bar are present and accessible
    await expect(canvas.getByTestId('search-panel')).toBeInTheDocument();
    await expect(
      canvas.getByRole('textbox', { name: /natural language search/i }),
    ).toBeInTheDocument();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// collased-enabled
// ─────────────────────────────────────────────────────────────────────────────
/** collased-enabled — query typed; Reset and Search become active. */
export const CollapsedEnabled: Story = {
  args: { defaultValues: { naturalLanguageQuery: 'Norway + Germany' } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Buttons must be enabled once a query is present
    await expect(canvas.getByTestId('sp-reset')).not.toBeDisabled();
    await expect(canvas.getByTestId('sp-search')).not.toBeDisabled();

    // Search bar shows the seeded value
    const searchbar = canvas.getByRole('textbox', { name: /natural language search/i });
    await expect(searchbar).toHaveValue('Norway + Germany');

    // Submitting calls onSearch with the correct payload
    await userEvent.click(canvas.getByTestId('sp-search'));
    await expect(args.onSearch).toHaveBeenCalledOnce();
    await expect(args.onSearch).toHaveBeenCalledWith(
      expect.objectContaining({ naturalLanguageQuery: 'Norway + Germany' }),
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// expanded-default
// ─────────────────────────────────────────────────────────────────────────────
/** expanded-default — filters open on render; pristine (buttons disabled). */
export const ExpandedDefault: Story = {
  args: { defaultValues: DEFAULTS_WITH_DATES, defaultExpanded: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Toggle already says "Less Options"
    const toggle = canvas.getByTestId('sp-toggle');
    await expect(toggle).toHaveTextContent(/less options/i);

    // Filter section is visible immediately — spot-check a labelled field
    await expect(canvas.getByTestId('sp-products')).toBeVisible();
    await expect(canvas.getByLabelText('From')).toBeInTheDocument();

    // Buttons remain disabled (no query, scope still "All")
    await expect(canvas.getByTestId('sp-reset')).toBeDisabled();
    await expect(canvas.getByTestId('sp-search')).toBeDisabled();

    // All products checkbox is checked by default (empty products array)
    const allProductsCheckbox = canvas.getByRole('checkbox', { name: /all products/i });
    await expect(allProductsCheckbox).toBeChecked();

    // Can collapse with one click
    await userEvent.click(toggle);
    await expect(toggle).toHaveTextContent(/more options/i);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// expanded-enabled
// ─────────────────────────────────────────────────────────────────────────────
/** expanded-enabled — filters open on render + query entered; full interaction test. */
export const ExpandedEnabled: Story = {
  args: {
    defaultValues: { ...DEFAULTS_WITH_DATES, naturalLanguageQuery: 'Norway + Germany' },
    defaultExpanded: true,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Buttons active once query is present
    const resetBtn = canvas.getByTestId('sp-reset');
    const searchBtn = canvas.getByTestId('sp-search');
    await expect(resetBtn).not.toBeDisabled();
    await expect(searchBtn).not.toBeDisabled();

    // Toggle a product checkbox — Rivers
    const riversCheckbox = canvas.getByRole('checkbox', { name: /rivers/i });
    await expect(riversCheckbox).not.toBeChecked();
    await userEvent.click(riversCheckbox);
    await expect(riversCheckbox).toBeChecked();
    // "All products" unchecks when a specific product is selected
    const allCheckbox = canvas.getByRole('checkbox', { name: /all products/i });
    await expect(allCheckbox).not.toBeChecked();

    // Reset restores state
    await userEvent.click(resetBtn);
    await expect(riversCheckbox).not.toBeChecked();

    // Submit triggers onSearch
    await userEvent.click(searchBtn);
    await expect(args.onSearch).toHaveBeenCalledOnce();
    await expect(args.onSearch).toHaveBeenCalledWith(
      expect.objectContaining({ naturalLanguageQuery: 'Norway + Germany' }),
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Agents-Open
// ─────────────────────────────────────────────────────────────────────────────
/** Agents-Open — agentMode, starts expanded, Open Search selected. */
export const AgentsOpen: Story = {
  args: { agentMode: true, defaultValues: DEFAULTS_WITH_DATES },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // "Search by:" radio group is visible
    const radioGroup = canvas.getByRole('radiogroup');
    await expect(radioGroup).toBeInTheDocument();

    const openRadio = canvas.getByRole('radio', { name: /open search/i });
    const groupRadio = canvas.getByRole('radio', { name: /group contract/i });
    await expect(openRadio).toBeChecked();
    await expect(groupRadio).not.toBeChecked();

    // Filter grid is visible (products column present)
    await expect(canvas.getByTestId('sp-products')).toBeVisible();

    // Panel starts expanded; toggle collapses and re-expands it
    const toggle = canvas.getByTestId('sp-toggle');
    await expect(toggle).toHaveTextContent(/less options/i);
    await userEvent.click(toggle);
    await expect(toggle).toHaveTextContent(/more options/i);
    await userEvent.click(toggle);
    await expect(toggle).toHaveTextContent(/less options/i);

    // In agent mode buttons are always active — click Search
    await userEvent.click(canvas.getByTestId('sp-search'));
    await expect(args.onSearch).toHaveBeenCalledOnce();
    await expect(args.onSearch).toHaveBeenCalledWith(
      expect.objectContaining({ searchMode: 'open' }),
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Agents-GroupCrontract
// ─────────────────────────────────────────────────────────────────────────────
/** Agents-GroupCrontract — agentMode, Group Contract mode selected. */
export const AgentsGroupContract: Story = {
  args: {
    agentMode: true,
    defaultValues: { ...DEFAULTS_WITH_DATES, searchMode: 'group' },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Group Contract radio is pre-selected
    const groupRadio = canvas.getByRole('radio', { name: /group contract/i });
    await expect(groupRadio).toBeChecked();

    // Filter grid is replaced by the Group Contract # input.
    // Query by role: "Group Contract" also names the radio above, so getByLabelText
    // alone matches two elements.
    await expect(canvas.queryByTestId('sp-products')).not.toBeInTheDocument();
    const contractInput = canvas.getByRole('textbox', { name: 'Group Contract' });
    await expect(contractInput).toBeInTheDocument();

    // Type a contract number and submit
    await userEvent.type(contractInput, 'GC-2026-001');
    await expect(contractInput).toHaveValue('GC-2026-001');

    await userEvent.click(canvas.getByTestId('sp-search'));
    await expect(args.onSearch).toHaveBeenCalledOnce();
    await expect(args.onSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        searchMode: 'group',
        groupContractNumber: 'GC-2026-001',
      }),
    );
  },
};
