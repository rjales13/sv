// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { buildDefaultSearchPanelValues } from '@/features/search/lib/search-panel-schema.ts';
import { MOCK_SEARCH_PANEL_OPTIONS } from '../../test/search-panel-options.mock.ts';
import { SearchPanel } from './search-panel.tsx';

// The panel's controls (VCX-10588): when SEARCH and RESET are enabled, and what the
// More/Less Options toggle and RESET leave alone. One rule enables both buttons — the search bar
// holds text, or a filter has moved off its default — in either panel state.

const noop = vi.fn();

function setup(props: Partial<React.ComponentProps<typeof SearchPanel>> = {}) {
  return render(<SearchPanel options={MOCK_SEARCH_PANEL_OPTIONS} onSearch={noop} {...props} />);
}

const searchBar = () => screen.getByLabelText('Natural language search');
const typeTerm = (value: string) => fireEvent.change(searchBar(), { target: { value } });
const searchButton = () => screen.getByTestId('search-submit');
const resetButton = () => screen.getByTestId('search-reset');

describe('SearchPanel — SEARCH and RESET (VCX-10588)', () => {
  it('AC 6: disables both on a panel that has just loaded', () => {
    setup();
    expect(searchButton()).toBeDisabled();
    expect(resetButton()).toBeDisabled();
  });

  // AC 8: the dates are prepopulated on every load, so they are not input on their own.
  it('AC 8: keeps both disabled on an untouched expanded panel, despite the default dates', () => {
    // The defaults the screen opens with: today, and today plus two months.
    setup({ defaultExpanded: true, defaultValues: buildDefaultSearchPanelValues('USD') });
    expect(screen.getByLabelText('From', { exact: true })).not.toHaveValue('');
    expect(searchButton()).toBeDisabled();
    expect(resetButton()).toBeDisabled();
  });

  it('AC 7: typing in the search bar enables both, and clearing it disables them again', () => {
    setup();
    typeTerm('nile');
    expect(searchButton()).toBeEnabled();
    expect(resetButton()).toBeEnabled();
    typeTerm('');
    expect(searchButton()).toBeDisabled();
    expect(resetButton()).toBeDisabled();
  });

  it('AC 9: picking a Port City enables both, with the search bar empty', async () => {
    setup({ defaultExpanded: true });
    fireEvent.click(screen.getByRole('combobox', { name: 'Port cities' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Luxor' }));
    expect(searchButton()).toBeEnabled();
    expect(resetButton()).toBeEnabled();
  });

  // Scope only says where the term is matched; with no term it narrows nothing.
  it('keeps both disabled when only the Scope changes', () => {
    setup();
    fireEvent.click(screen.getByLabelText('Scope'));
    fireEvent.click(screen.getByRole('option', { name: 'Ship' }));
    expect(searchButton()).toBeDisabled();
  });

  // R5 / AC 4: collapsing hides the filters, it does not drop them — so they still search.
  it('AC 4: searches on filters set while expanded, after collapsing, with no term', async () => {
    const onSearch = vi.fn();
    setup({ defaultExpanded: true, onSearch });
    fireEvent.click(screen.getByRole('combobox', { name: 'Port cities' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Luxor' }));
    fireEvent.click(screen.getByTestId('sp-toggle'));
    expect(searchButton()).toBeEnabled();
    fireEvent.click(searchButton());
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());
    expect(onSearch.mock.calls[0]?.[0]).toMatchObject({ portCities: ['Luxor'] });
  });

  // Enter in a field submits the form even past a disabled button in some browsers.
  it('does not search an untouched panel, however the form is submitted', async () => {
    const onSearch = vi.fn();
    setup({ onSearch });
    fireEvent.submit(screen.getByLabelText('Cruise search'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onSearch).not.toHaveBeenCalled();
  });
});

describe('SearchPanel — the More/Less Options toggle and RESET (VCX-10588)', () => {
  it('AC 5: keeps the typed term when the panel is toggled', () => {
    setup();
    typeTerm('rhine');
    fireEvent.click(screen.getByTestId('sp-toggle'));
    fireEvent.click(screen.getByTestId('sp-toggle'));
    expect(searchBar()).toHaveValue('rhine');
  });

  it('AC 12: RESET leaves an expanded panel expanded', async () => {
    setup({ defaultExpanded: true });
    typeTerm('rhine');
    fireEvent.click(resetButton());
    await waitFor(() => expect(searchBar()).toHaveValue(''));
    expect(screen.getByTestId('sp-products')).toBeInTheDocument();
    expect(screen.getByTestId('sp-toggle')).toHaveTextContent('Less Options');
  });
});

// VCX-10482 R2: the default currency comes from the CRM office, and the lists that say which
// currency that is load after the panel mounts. An untouched panel takes the new default; it is
// still a default, so it enables nothing.
describe('SearchPanel — defaults that arrive after mount (VCX-10482)', () => {
  const at = (currency: string) => ({ ...buildDefaultSearchPanelValues('USD'), currency });

  it('takes a default currency that arrives late, and still counts as untouched', async () => {
    const { rerender } = setup({ defaultExpanded: true, defaultValues: at('USD') });
    rerender(
      <SearchPanel
        options={MOCK_SEARCH_PANEL_OPTIONS}
        onSearch={noop}
        defaultExpanded
        defaultValues={at('GBP')}
      />,
    );
    await waitFor(() => expect(screen.getByLabelText('Currency')).toHaveTextContent('GBP'));
    expect(searchButton()).toBeDisabled();
  });

  it('keeps what the agent entered when a late default arrives', async () => {
    const { rerender } = setup({ defaultExpanded: true, defaultValues: at('USD') });
    typeTerm('nile');
    rerender(
      <SearchPanel
        options={MOCK_SEARCH_PANEL_OPTIONS}
        onSearch={noop}
        defaultExpanded
        defaultValues={at('GBP')}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(searchBar()).toHaveValue('nile');
  });
});
