// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { PROMO_CODE_MIN_MESSAGE } from '../../lib/search-panel-schema.ts';
import { MOCK_SEARCH_PANEL_OPTIONS } from '../../test/search-panel-options.mock.ts';
import { SearchPanel } from './search-panel.tsx';

// The search panel's Promo Code field (VCX-10484), apart from search-panel.test.tsx to keep each
// file to one concern. There is no promotion catalog to suggest from, so the field is plain free
// text that the search takes as typed once it has three characters.

const noop = vi.fn();

function setup(props: Partial<React.ComponentProps<typeof SearchPanel>> = {}) {
  return render(<SearchPanel options={MOCK_SEARCH_PANEL_OPTIONS} onSearch={noop} {...props} />);
}

describe('SearchPanel — promo code (VCX-10484)', () => {
  const promoField = () => screen.getByRole('textbox', { name: 'Promo Code' });
  const typePromo = (text: string) => fireEvent.change(promoField(), { target: { value: text } });
  const submit = () => fireEvent.click(screen.getByTestId('search-submit'));

  it('AC 7: carries the label Promo Code and the placeholder Enter Promo Code', () => {
    setup({ defaultExpanded: true });
    expect(promoField()).toHaveAttribute('placeholder', 'Enter Promo Code');
    expect(promoField()).toHaveValue('');
  });

  it('suggests nothing while typing: no promotion catalog backs the field', () => {
    setup({ defaultExpanded: true });
    typePromo('RCR');
    expect(screen.queryAllByRole('option')).toEqual([]);
  });

  it('searches on a code of three characters, as typed', async () => {
    const onSearch = vi.fn();
    setup({ defaultExpanded: true, onSearch });
    typePromo('XYZ');
    submit();
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());
    expect(onSearch.mock.calls[0]?.[0]).toMatchObject({ promoCodes: ['XYZ'] });
  });

  it.each(['A', 'AB', ' AB ', '  A  '])(
    'does not search on "%s": a code needs at least three characters',
    async (text) => {
      const onSearch = vi.fn();
      setup({ defaultExpanded: true, onSearch });
      typePromo(text);
      submit();
      expect(await screen.findByText(PROMO_CODE_MIN_MESSAGE)).toBeInTheDocument();
      expect(onSearch).not.toHaveBeenCalled();
    },
  );

  it('searches without a promo when the field is empty or only spaces', async () => {
    const onSearch = vi.fn();
    setup({ defaultExpanded: true, onSearch });
    typePromo('   ');
    submit();
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());
    expect(screen.queryByText(PROMO_CODE_MIN_MESSAGE)).not.toBeInTheDocument();
  });

  // AC 3: one promo per leg — a second code replaces the first rather than stacking.
  it('AC 3: replaces the promo rather than adding a second one', async () => {
    const onSearch = vi.fn();
    setup({ defaultExpanded: true, onSearch });
    typePromo('VIKING10');
    typePromo('DN26');
    submit();
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());
    expect(onSearch.mock.calls[0]?.[0]).toMatchObject({ promoCodes: ['DN26'] });
  });

  it('AC 14: Reset clears the promo code', async () => {
    setup({ defaultExpanded: true });
    typePromo('VIKING10');
    fireEvent.click(screen.getByTestId('search-reset'));
    await waitFor(() => expect(promoField()).toHaveValue(''));
  });
});
