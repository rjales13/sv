import { describe, expect, it } from 'vitest';
import {
  buildDefaultSearchPanelValues,
  EMPTY_SEARCH_PANEL_VALUES,
  hasSearchInput,
  pushToDate,
  SearchPanelSchema,
} from './search-panel-schema.ts';

// Pure node-env unit tests — no DOM. Covers the refine rules and the
// date-window builder; the component test drives the same schema via
// react-hook-form.

// Local-time midnight (month is 0-indexed) — timezone-independent yyyy-MM-dd.
const FIXED_NOW = new Date(2026, 8, 15); // 2026-09-15

describe('EMPTY_SEARCH_PANEL_VALUES', () => {
  it('passes schema validation', () => {
    const result = SearchPanelSchema.safeParse(EMPTY_SEARCH_PANEL_VALUES);
    expect(result.success).toBe(true);
  });
});

describe('buildDefaultSearchPanelValues', () => {
  // R1: "Must default to a two-month window from the current date" — from TODAY, not from
  // the first of the month, which is what an earlier build did.
  it('sets sailingDateFrom to today', () => {
    const values = buildDefaultSearchPanelValues('GBP', FIXED_NOW);
    expect(values.sailingDateFrom).toBe('2026-09-15');
  });

  it('sets sailingDateTo two months ahead of today', () => {
    const values = buildDefaultSearchPanelValues('GBP', FIXED_NOW);
    expect(values.sailingDateTo).toBe('2026-11-15');
  });

  // R1: "Currency must default from the selected office."
  it('seeds the currency from the office rather than a hard-coded default', () => {
    expect(buildDefaultSearchPanelValues('GBP', FIXED_NOW).currency).toBe('GBP');
    expect(buildDefaultSearchPanelValues('AUD', FIXED_NOW).currency).toBe('AUD');
  });

  it('lets an explicit window override the now-relative default', () => {
    const values = buildDefaultSearchPanelValues('USD', FIXED_NOW, {
      from: '2027-01-01',
      to: '2027-03-31',
    });
    expect(values.sailingDateFrom).toBe('2027-01-01');
    expect(values.sailingDateTo).toBe('2027-03-31');
  });

  it('carries all other fields from EMPTY_SEARCH_PANEL_VALUES unchanged', () => {
    const values = buildDefaultSearchPanelValues('USD', FIXED_NOW);
    const { sailingDateFrom: _f, sailingDateTo: _t, ...rest } = values;
    const { sailingDateFrom: __f, sailingDateTo: __t, ...emptyRest } = EMPTY_SEARCH_PANEL_VALUES;
    expect(rest).toEqual(emptyRest);
  });

  it('produces a schema-valid value set', () => {
    const result = SearchPanelSchema.safeParse(buildDefaultSearchPanelValues('GBP', FIXED_NOW));
    expect(result.success).toBe(true);
  });

  it('uses today by default (no argument)', () => {
    // Just assert it does not throw and produces non-empty date strings.
    const values = buildDefaultSearchPanelValues('USD');
    expect(values.sailingDateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(values.sailingDateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('SearchPanelSchema — date range refinement', () => {
  const valid = buildDefaultSearchPanelValues('GBP', FIXED_NOW);

  it('rejects sailingDateTo before sailingDateFrom, flagging sailingDateTo', () => {
    const result = SearchPanelSchema.safeParse({
      ...valid,
      sailingDateFrom: '2026-12-01',
      sailingDateTo: '2026-11-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('sailingDateTo');
    }
  });

  it('accepts equal sailingDateFrom and sailingDateTo', () => {
    const result = SearchPanelSchema.safeParse({
      ...valid,
      sailingDateFrom: '2026-10-01',
      sailingDateTo: '2026-10-01',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty sailingDateFrom regardless of sailingDateTo', () => {
    const result = SearchPanelSchema.safeParse({
      ...valid,
      sailingDateFrom: '',
      sailingDateTo: '2026-10-01',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty sailingDateTo regardless of sailingDateFrom', () => {
    const result = SearchPanelSchema.safeParse({
      ...valid,
      sailingDateFrom: '2026-10-01',
      sailingDateTo: '',
    });
    expect(result.success).toBe(true);
  });
});

describe('SearchPanelSchema — nights range refinement', () => {
  const valid = buildDefaultSearchPanelValues('GBP', FIXED_NOW);

  it('rejects nightsFrom > nightsTo (when nightsTo != 0), flagging nightsTo', () => {
    const result = SearchPanelSchema.safeParse({ ...valid, nightsFrom: 10, nightsTo: 3 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('nightsTo');
    }
  });

  it('accepts equal nightsFrom and nightsTo', () => {
    const result = SearchPanelSchema.safeParse({ ...valid, nightsFrom: 5, nightsTo: 5 });
    expect(result.success).toBe(true);
  });

  it('accepts nightsTo = 0 even when nightsFrom > 0 (0 means unbounded)', () => {
    const result = SearchPanelSchema.safeParse({ ...valid, nightsFrom: 7, nightsTo: 0 });
    expect(result.success).toBe(true);
  });
});

describe('SearchPanelSchema — guests validation', () => {
  const valid = buildDefaultSearchPanelValues('GBP', FIXED_NOW);

  it('rejects guests < 1', () => {
    const result = SearchPanelSchema.safeParse({ ...valid, guests: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('guests');
    }
  });

  it('accepts guests = 1', () => {
    const result = SearchPanelSchema.safeParse({ ...valid, guests: 1 });
    expect(result.success).toBe(true);
  });
});

describe('SearchPanelSchema — searchMode enum', () => {
  const valid = buildDefaultSearchPanelValues('GBP', FIXED_NOW);

  it('accepts open and group', () => {
    expect(SearchPanelSchema.safeParse({ ...valid, searchMode: 'open' }).success).toBe(true);
    expect(SearchPanelSchema.safeParse({ ...valid, searchMode: 'group' }).success).toBe(true);
  });

  it('rejects an unknown searchMode value', () => {
    const result = SearchPanelSchema.safeParse({ ...valid, searchMode: 'unknown' });
    expect(result.success).toBe(false);
  });
});

// R1: "When the From date changes, the system must push the To date out by two months while
// leaving it editable." A pure rule, so it is tested without a form.
describe('pushToDate (VCX-10323 R1)', () => {
  it('pushes the To date two months past the new From date', () => {
    expect(pushToDate('2027-01-15')).toBe('2027-03-15');
  });

  it('rolls the year over correctly', () => {
    expect(pushToDate('2026-11-30')).toBe('2027-01-30');
  });

  it('returns empty when From is cleared, leaving the window unbounded', () => {
    expect(pushToDate('')).toBe('');
  });
});

// VCX-10588 R8, R9, R12: SEARCH and RESET share one rule — the search bar holds text, or a
// filter has moved off its default. The seeded dates and currency are defaults, not input.
describe('hasSearchInput (VCX-10588)', () => {
  const defaults = buildDefaultSearchPanelValues('USD', FIXED_NOW);

  it('is false for an untouched panel, despite the prepopulated dates (AC 8)', () => {
    expect(hasSearchInput(defaults, defaults)).toBe(false);
  });

  it('is true once the search bar holds text, and false again once it is cleared (AC 7)', () => {
    expect(hasSearchInput({ ...defaults, naturalLanguageQuery: 'nile' }, defaults)).toBe(true);
    expect(hasSearchInput({ ...defaults, naturalLanguageQuery: '' }, defaults)).toBe(false);
  });

  it('is false for a search bar holding only spaces — there is no term to search', () => {
    expect(hasSearchInput({ ...defaults, naturalLanguageQuery: '   ' }, defaults)).toBe(false);
  });

  it('is true once a scalar filter changes', () => {
    expect(hasSearchInput({ ...defaults, guests: 1 }, defaults)).toBe(true);
  });

  it('is true once an array filter is populated (AC 9)', () => {
    expect(hasSearchInput({ ...defaults, portCities: ['Luxor'] }, defaults)).toBe(true);
  });

  it('is true when the dates are moved off their default', () => {
    expect(hasSearchInput({ ...defaults, sailingDateFrom: '2027-01-01' }, defaults)).toBe(true);
  });

  // Scope only says where the term is matched: with no term there is nothing to search.
  it('is false when only the Scope changes', () => {
    expect(hasSearchInput({ ...defaults, scope: 'Ship' }, defaults)).toBe(false);
  });
});

// R1: "Must support one and two guests" — the range is bounded at both ends.
describe('SearchPanelSchema — guests bounds (VCX-10323 R1)', () => {
  const valid = buildDefaultSearchPanelValues('USD', FIXED_NOW);

  it('accepts 1 and 2 guests', () => {
    expect(SearchPanelSchema.safeParse({ ...valid, guests: 1 }).success).toBe(true);
    expect(SearchPanelSchema.safeParse({ ...valid, guests: 2 }).success).toBe(true);
  });

  it('rejects more than two guests', () => {
    expect(SearchPanelSchema.safeParse({ ...valid, guests: 3 }).success).toBe(false);
  });
});
