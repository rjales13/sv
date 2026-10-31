// @vitest-environment happy-dom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { EMPTY_SEARCH_PANEL_VALUES } from '@/features/search/lib/search-panel-schema.ts';
import { MOCK_SEARCH_PANEL_OPTIONS } from '../../test/search-panel-options.mock.ts';
import { SearchPanel, type SearchPanelHandle } from './search-panel.tsx';

// Component-level unit tests for SearchPanel: the toggle, the R9 Reset gate, reset, submit,
// agent-mode variants, and Zod validation errors. No router or provider context needed —
// SearchPanel is self-contained.
//
// The gating rules come from VCX-10323 R9: Reset is enabled "once there is one or more
// filters populated with a value", and Search simply "queries the results when filters are
// applied". An earlier build gated BOTH on the natural-language query being non-empty, which
// meant an agent who set dates and products but typed nothing could not search at all — and
// natural-language matching is future work, so the field it gated on does nothing yet.

const noop = vi.fn();

function setup(props: Partial<React.ComponentProps<typeof SearchPanel>> = {}) {
  return render(<SearchPanel options={MOCK_SEARCH_PANEL_OPTIONS} onSearch={noop} {...props} />);
}

describe('SearchPanel — collapsed state (default)', () => {
  it('renders the search bar and scope selector', () => {
    setup();
    expect(screen.getByLabelText('Cruise search')).toBeInTheDocument();
    expect(screen.getByLabelText('Natural language search')).toBeInTheDocument();
    expect(screen.getByLabelText('Scope')).toBeInTheDocument();
  });

  it('does not show the filter section when collapsed', () => {
    setup();
    expect(screen.queryByTestId('sp-products')).not.toBeInTheDocument();
  });

  it('shows "More Options" toggle button', () => {
    setup();
    expect(screen.getByTestId('sp-toggle')).toHaveTextContent('More Options');
  });
});

describe('SearchPanel — expand / collapse toggle', () => {
  it('expands the filter section when "More Options" is clicked', () => {
    setup();
    fireEvent.click(screen.getByTestId('sp-toggle'));
    expect(screen.getByTestId('sp-products')).toBeInTheDocument();
    expect(screen.getByTestId('sp-toggle')).toHaveTextContent('Less Options');
  });

  it('collapses the filter section when "Less Options" is clicked', () => {
    setup({ defaultExpanded: true });
    expect(screen.getByTestId('sp-products')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('sp-toggle'));
    expect(screen.queryByTestId('sp-products')).not.toBeInTheDocument();
  });

  it('starts expanded when defaultExpanded=true', () => {
    setup({ defaultExpanded: true });
    expect(screen.getByTestId('sp-products')).toBeInTheDocument();
  });
});

// The date fields format as the agent types: InputDate runs each keystroke through the shared
// date-format lib, so this pins the wiring rather than re-testing every rule the lib covers.
describe('SearchPanel — date fields format as typed', () => {
  const typeInto = (field: HTMLElement, value: string) =>
    fireEvent.change(field, { target: { value } });

  it('spaces and upper-cases a date typed without separators', () => {
    setup({ defaultExpanded: true });
    const from = screen.getByLabelText('From', { exact: true });
    typeInto(from, '22mar');
    expect(from).toHaveValue('22 MAR ');
    typeInto(from, '22 MAR 2027');
    expect(from).toHaveValue('22 MAR 2027');
  });

  it('tidies a pasted slash date into the app format', () => {
    setup({ defaultExpanded: true });
    const to = screen.getByLabelText('To', { exact: true });
    typeInto(to, '29/mar/2027');
    expect(to).toHaveValue('29 MAR 2027');
  });

  it('shows the committed date in the app format once the field is left', () => {
    setup({ defaultExpanded: true });
    const from = screen.getByLabelText('From', { exact: true });
    typeInto(from, '22MAR2027');
    fireEvent.blur(from);
    expect(from).toHaveValue('22 MAR 2027');
  });
});

// VCX-10586 R5–R7: a sailing that has already departed cannot be sold, and a To before From
// is an impossible window. The calendars disable those days, and typing one is refused the same
// way an unreadable date is: the field snaps back to the last valid date when it is left.
describe('SearchPanel — date limits (VCX-10586)', () => {
  // Only `Date` is faked: Radix and waitFor still need real timers.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 7, 10));
  });
  afterEach(() => vi.useRealTimers());

  const dayButton = (date: Date) => {
    const button = document.querySelector<HTMLButtonElement>(
      `button[data-day="${date.toLocaleDateString()}"]`,
    );
    if (!button) throw new Error(`no day button for ${date.toDateString()}`);
    return button;
  };
  const openCalendar = (which: 'From' | 'To') =>
    fireEvent.click(screen.getAllByLabelText('Open calendar')[which === 'From' ? 0 : 1] as Element);

  it('AC 3: the From calendar disables every day before today', async () => {
    setup({ defaultExpanded: true, defaultValues: { sailingDateFrom: '2026-08-20' } });
    openCalendar('From');
    await screen.findByRole('dialog', { name: 'Choose date' });
    expect(dayButton(new Date(2026, 7, 9))).toBeDisabled();
    expect(dayButton(new Date(2026, 7, 10))).toBeEnabled();
  });

  it('AC 4: the To calendar disables every day before the selected From', async () => {
    setup({
      defaultExpanded: true,
      defaultValues: { sailingDateFrom: '2026-11-15', sailingDateTo: '2026-11-30' },
    });
    openCalendar('To');
    await screen.findByRole('dialog', { name: 'Choose date' });
    expect(dayButton(new Date(2026, 10, 14))).toBeDisabled();
    expect(dayButton(new Date(2026, 10, 15))).toBeEnabled();
  });

  it('refuses a typed From in the past, keeping the last valid date', async () => {
    const onSearch = vi.fn();
    setup({
      defaultExpanded: true,
      onSearch,
      defaultValues: { sailingDateFrom: '2026-08-20', sailingDateTo: '2026-10-20' },
    });
    const from = screen.getByLabelText('From', { exact: true });
    fireEvent.change(from, { target: { value: '01 JUL 2026' } });
    expect(from).toHaveAttribute('aria-invalid', 'true');
    fireEvent.blur(from);
    expect(from).toHaveValue('20 AUG 2026');

    // The refused date leaves the panel untouched, so a term is what enables SEARCH (VCX-10588).
    fireEvent.change(screen.getByLabelText('Natural language search'), {
      target: { value: 'nile' },
    });
    fireEvent.click(screen.getByTestId('search-submit'));
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());
    expect(onSearch.mock.calls[0]?.[0]).toMatchObject({ sailingDateFrom: '2026-08-20' });
  });

  // AC 5: the To limit follows From as it moves, not the From the panel opened with.
  it('AC 5: refuses a typed To before a From that has just moved', () => {
    setup({
      defaultExpanded: true,
      defaultValues: { sailingDateFrom: '2026-08-20', sailingDateTo: '2026-10-20' },
    });
    fireEvent.change(screen.getByLabelText('From', { exact: true }), {
      target: { value: '15 NOV 2026' },
    });
    const to = screen.getByLabelText('To', { exact: true });
    expect(to).toHaveValue('15 JAN 2027');

    fireEvent.change(to, { target: { value: '14 NOV 2026' } });
    fireEvent.blur(to);
    expect(to).toHaveValue('15 JAN 2027');
  });
});

// VCX-10586 R9–R13: the nights fields are a duration filter, empty (no bound) until the agent
// types a whole number, and a To below From is not kept.
describe('SearchPanel — nights fields (VCX-10586)', () => {
  it('AC 6: both nights fields start empty', () => {
    setup({ defaultExpanded: true });
    expect(screen.getByLabelText('From nights')).toHaveValue('');
    expect(screen.getByLabelText('To nights')).toHaveValue('');
  });

  it('R11: accepts whole numbers only', () => {
    setup({ defaultExpanded: true });
    const from = screen.getByLabelText('From nights');
    fireEvent.change(from, { target: { value: '-3' } });
    expect(from).toHaveValue('3');
    fireEvent.change(from, { target: { value: '7.5' } });
    expect(from).toHaveValue('75');
    fireEvent.change(from, { target: { value: 'e' } });
    expect(from).toHaveValue('');
  });

  it('AC 8: does not keep a To (Nights) below From (Nights), and says why', async () => {
    const onSearch = vi.fn();
    setup({ defaultExpanded: true, onSearch });
    fireEvent.change(screen.getByLabelText('From nights'), { target: { value: '10' } });
    const to = screen.getByLabelText('To nights');
    fireEvent.change(to, { target: { value: '7' } });
    fireEvent.blur(to);

    expect(to).toHaveValue('');
    expect(
      await screen.findByText(/max nights must be greater than or equal to min nights/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('search-submit'));
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());
    expect(onSearch.mock.calls[0]?.[0]).toMatchObject({ nightsFrom: 10, nightsTo: 0 });
  });

  // Typing 12 passes through 1 on the way; the check waits for the agent to leave the field.
  it('keeps a To (Nights) typed through a lower number on its way up', () => {
    setup({ defaultExpanded: true });
    fireEvent.change(screen.getByLabelText('From nights'), { target: { value: '10' } });
    const to = screen.getByLabelText('To nights');
    fireEvent.change(to, { target: { value: '1' } });
    fireEvent.change(to, { target: { value: '12' } });
    fireEvent.blur(to);
    expect(to).toHaveValue('12');
    expect(screen.queryByText(/max nights must be greater/i)).not.toBeInTheDocument();
  });

  it('AC 9: a From (Nights) alone is an open-ended search', async () => {
    const onSearch = vi.fn();
    setup({ defaultExpanded: true, onSearch });
    fireEvent.change(screen.getByLabelText('From nights'), { target: { value: '7' } });
    fireEvent.click(screen.getByTestId('search-submit'));
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());
    expect(onSearch.mock.calls[0]?.[0]).toMatchObject({ nightsFrom: 7, nightsTo: 0 });
  });
});

// VCX-10483: the product rail. "All products" is the empty selection, so it needs no field
// of its own — and while it is on, the four types show as checked but cannot be changed.
describe('SearchPanel — product rail (VCX-10483)', () => {
  const PRODUCTS = ['River', 'Ocean', 'Expedition', 'Mississippi'];
  const rail = () => PRODUCTS.map((name) => screen.getByLabelText(name));

  it('AC 1: offers All products first, checked, with the four types checked and locked', () => {
    setup({ defaultExpanded: true });
    const labels = Array.from(
      screen.getByTestId('sp-products').querySelectorAll('label'),
      (label) => label.textContent,
    );
    expect(labels).toEqual(['All products', ...PRODUCTS]);
    expect(screen.getByLabelText('All products')).toBeChecked();
    for (const box of rail()) {
      expect(box).toBeChecked();
      expect(box).toBeDisabled();
    }
  });

  it('AC 2: unchecking All products releases the four, still checked', () => {
    setup({ defaultExpanded: true });
    fireEvent.click(screen.getByLabelText('All products'));
    expect(screen.getByLabelText('All products')).not.toBeChecked();
    for (const box of rail()) {
      expect(box).toBeChecked();
      expect(box).toBeEnabled();
    }
  });

  it('AC 3: searches only the product types left checked', async () => {
    const onSearch = vi.fn();
    setup({ defaultExpanded: true, onSearch });
    fireEvent.click(screen.getByLabelText('All products'));
    for (const name of ['Ocean', 'Expedition', 'Mississippi']) {
      fireEvent.click(screen.getByLabelText(name));
    }
    fireEvent.click(screen.getByTestId('search-submit'));
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());
    expect(onSearch.mock.calls[0]?.[0]).toMatchObject({ products: ['River'] });
  });

  // The rail is never empty: unticking the last type is "all of them" again, and says so.
  it('checks All products again when the last type is unchecked', () => {
    setup({ defaultExpanded: true });
    fireEvent.click(screen.getByLabelText('All products'));
    for (const name of PRODUCTS) fireEvent.click(screen.getByLabelText(name));
    expect(screen.getByLabelText('All products')).toBeChecked();
    for (const box of rail()) expect(box).toBeDisabled();
  });

  it('AC 6: Reset returns the rail to All products, the four locked', async () => {
    setup({ defaultExpanded: true });
    fireEvent.click(screen.getByLabelText('All products'));
    fireEvent.click(screen.getByLabelText('Ocean'));
    fireEvent.click(screen.getByTestId('search-reset'));
    await waitFor(() => expect(screen.getByLabelText('All products')).toBeChecked());
    for (const box of rail()) {
      expect(box).toBeChecked();
      expect(box).toBeDisabled();
    }
  });
});

describe('SearchPanel — submit', () => {
  it('calls onSearch with the current form values', async () => {
    const onSearch = vi.fn();
    setup({ onSearch });
    fireEvent.change(screen.getByLabelText('Natural language search'), {
      target: { value: 'Rhine' },
    });
    fireEvent.click(screen.getByTestId('search-submit'));
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());
    const submitted = onSearch.mock.calls[0]?.[0];
    expect(submitted?.naturalLanguageQuery).toBe('Rhine');
  });
});

describe('SearchPanel — reset', () => {
  it('clears the search bar on reset', async () => {
    setup();
    const bar = screen.getByLabelText('Natural language search');
    fireEvent.change(bar, { target: { value: 'something' } });
    fireEvent.click(screen.getByTestId('search-reset'));
    await waitFor(() => expect(bar).toHaveValue(''));
  });

  it('restores defaultValues dates on reset rather than clearing them', async () => {
    const defaultValues = {
      ...EMPTY_SEARCH_PANEL_VALUES,
      sailingDateFrom: '2026-10-01',
      sailingDateTo: '2026-12-01',
      naturalLanguageQuery: 'initial',
    };
    setup({ defaultValues });
    const bar = screen.getByLabelText('Natural language search');
    // Dirty the form, then reset.
    fireEvent.change(bar, { target: { value: 'changed' } });
    fireEvent.click(screen.getByTestId('search-reset'));
    await waitFor(() => expect(bar).toHaveValue('initial'));
  });
});

describe('SearchPanel — agent mode', () => {
  it('starts expanded in agent mode', () => {
    setup({ agentMode: true });
    expect(screen.getByTestId('sp-products')).toBeInTheDocument();
  });

  it('renders the "Search by:" radio group in agent mode', () => {
    setup({ agentMode: true });
    expect(screen.getByText('Search by:')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Open Search' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Group Contract' })).toBeInTheDocument();
  });

  // VCX-10588: agent mode follows the same SEARCH rule as the open panel.
  it('disables Search in agent mode until there is input', () => {
    setup({ agentMode: true });
    expect(screen.getByTestId('search-submit')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Decrease' }));
    expect(screen.getByTestId('search-submit')).toBeEnabled();
  });

  it('switches to the group contract input when Group Contract is selected', () => {
    setup({ agentMode: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Group Contract' }));
    expect(screen.getByRole('radio', { name: 'Group Contract' })).toBeChecked();
    expect(screen.getByPlaceholderText('Enter Group Contract #')).toBeInTheDocument();
    // Open Search filters should no longer be visible.
    expect(screen.queryByTestId('sp-products')).not.toBeInTheDocument();
  });

  it('returns to open search filters when Open Search is re-selected', () => {
    setup({ agentMode: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Group Contract' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Open Search' }));
    expect(screen.getByTestId('sp-products')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter Group Contract #')).not.toBeInTheDocument();
  });

  it('calls onSearch in agent mode on a filter alone, without a query', async () => {
    const onSearch = vi.fn();
    setup({ agentMode: true, onSearch });
    fireEvent.click(screen.getByRole('button', { name: 'Decrease' }));
    fireEvent.click(screen.getByTestId('search-submit'));
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());
  });
});

describe('SearchPanel — filterable multi-selects (DD-PortCities)', () => {
  it.each(['Port cities', 'Hotel cities'])(
    '%s turns into a text box when opened, so the agent can type to narrow the list',
    (name) => {
      setup({ defaultExpanded: true });
      fireEvent.click(screen.getByRole('combobox', { name }));
      const field = screen.getByRole('combobox', { name });
      expect(field.tagName).toBe('INPUT');
      expect(field).toHaveFocus();
    },
  );
});

// Once the agent searches, the results list is what they need to see — the open filter block
// would otherwise push it below the fold.
describe('SearchPanel — collapses on search', () => {
  it('collapses the options after a successful search', async () => {
    const onSearch = vi.fn();
    setup({ defaultExpanded: true, onSearch });
    fireEvent.change(screen.getByLabelText('Natural language search'), {
      target: { value: 'nile' },
    });
    fireEvent.click(screen.getByTestId('search-submit'));
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());
    expect(screen.queryByTestId('sp-products')).not.toBeInTheDocument();
    expect(screen.getByTestId('sp-toggle')).toHaveTextContent('More Options');
  });

  it('collapses in agent mode too', async () => {
    const onSearch = vi.fn();
    setup({ agentMode: true, onSearch });
    fireEvent.change(screen.getByLabelText('Natural language search'), {
      target: { value: 'nile' },
    });
    fireEvent.click(screen.getByTestId('search-submit'));
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());
    expect(screen.queryByTestId('sp-products')).not.toBeInTheDocument();
  });

  it('keeps the filter values when re-opened after a search', async () => {
    const onSearch = vi.fn();
    setup({ defaultExpanded: true, onSearch });
    fireEvent.click(screen.getByLabelText('All products'));
    fireEvent.click(screen.getByLabelText('River'));
    fireEvent.click(screen.getByTestId('search-submit'));
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByTestId('sp-toggle'));
    expect(screen.getByLabelText('All products')).not.toBeChecked();
    expect(screen.getByLabelText('River')).not.toBeChecked();
    expect(screen.getByLabelText('Ocean')).toBeChecked();
  });

  it('stays open when the search fails validation, so the error is visible', async () => {
    const onSearch = vi.fn();
    setup({ defaultExpanded: true, onSearch });
    fireEvent.change(screen.getByLabelText('From nights'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('To nights'), { target: { value: '3' } });
    fireEvent.click(screen.getByTestId('search-submit'));
    await waitFor(() =>
      expect(
        screen.getByText(/max nights must be greater than or equal to min nights/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByTestId('sp-products')).toBeInTheDocument();
  });
});

describe('SearchPanel — validation errors', () => {
  it('shows a validation error when nightsFrom > nightsTo (expanded)', async () => {
    const onSearch = vi.fn();
    setup({ agentMode: true, onSearch });
    fireEvent.change(screen.getByLabelText('From nights'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('To nights'), { target: { value: '3' } });
    fireEvent.click(screen.getByTestId('search-submit'));
    await waitFor(() =>
      expect(
        screen.getByText(/max nights must be greater than or equal to min nights/i),
      ).toBeInTheDocument(),
    );
    expect(onSearch).not.toHaveBeenCalled();
  });
});

// The empty state's "Reset filters" lives outside the panel but has to mean the same thing as
// the Reset inside it. It drives this handle — before that, it cleared only the results and
// left every field populated, so the next Search reproduced the same empty result.
describe("SearchPanel — imperative reset (the empty state's way out)", () => {
  it('restores the defaults when reset through the ref', async () => {
    const ref = createRef<SearchPanelHandle>();
    render(
      <SearchPanel ref={ref} options={MOCK_SEARCH_PANEL_OPTIONS} onSearch={noop} defaultExpanded />,
    );

    const nights = screen.getByLabelText('From nights');
    fireEvent.change(nights, { target: { value: '99' } });
    fireEvent.click(screen.getByLabelText('All products'));
    fireEvent.click(screen.getByLabelText('River'));
    await waitFor(() => expect(screen.getByTestId('search-reset')).toBeEnabled());

    act(() => ref.current?.reset());

    await waitFor(() => expect(nights).toHaveValue(''));
    expect(screen.getByLabelText('All products')).toBeChecked();
    expect(screen.getByLabelText('River')).toBeChecked();
    expect(screen.getByLabelText('River')).toBeDisabled();
    expect(screen.getByTestId('search-reset')).toBeDisabled();
  });

  it('notifies the owner on reset, whichever control triggered it', async () => {
    const onReset = vi.fn();
    const ref = createRef<SearchPanelHandle>();
    render(
      <SearchPanel
        ref={ref}
        options={MOCK_SEARCH_PANEL_OPTIONS}
        onSearch={noop}
        onReset={onReset}
        defaultExpanded
      />,
    );

    fireEvent.change(screen.getByLabelText('From nights'), { target: { value: '7' } });
    await waitFor(() => expect(screen.getByTestId('search-reset')).toBeEnabled());

    fireEvent.click(screen.getByTestId('search-reset'));
    await waitFor(() => expect(onReset).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('From nights'), { target: { value: '7' } });
    act(() => ref.current?.reset());
    await waitFor(() => expect(onReset).toHaveBeenCalledTimes(2));
  });
});
