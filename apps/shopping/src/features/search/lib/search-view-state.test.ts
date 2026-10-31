import { describe, expect, it } from 'vitest';
import { toSearchView } from './search-view-state.ts';

// The FR4 state machine. Every branch is a state the agent can actually be looking at, so
// each gets a case — this is the table the old setState choreography never had.

const base = { hasCriteria: true, isError: false, result: undefined };

describe('toSearchView', () => {
  it('is idle before anything is submitted', () => {
    expect(toSearchView({ ...base, hasCriteria: false }).state).toBe('idle');
  });

  it('is loading when there is no result yet', () => {
    expect(toSearchView(base).state).toBe('loading');
  });

  it('keeps a cached set on screen rather than blanking it for a background refetch', () => {
    // The refetch case is NOT distinguishable here on purpose: if we hold a result, we render
    // it. Blanking whenever a request is in flight is what made the original fix only work
    // inside `staleTime`.
    const results = [{ cruiseId: 'A' }] as never;
    const view = toSearchView({ ...base, result: { status: 'ok', results } });
    expect(view.state).toBe('populated');
    expect(view.results).toBe(results);
  });

  // VCX-10507 AC 13: past 200 matches the search keeps 200; the screen must say so.
  it('carries the limited flag of an ok result, and is not limited otherwise', () => {
    const results = [{ cruiseId: 'A' }] as never;
    expect(
      toSearchView({ ...base, result: { status: 'ok', results, limited: true } }).limited,
    ).toBe(true);
    expect(toSearchView({ ...base, result: { status: 'ok', results } }).limited).toBe(false);
    expect(toSearchView({ ...base, result: { status: 'empty' } }).limited).toBe(false);
  });

  it('maps an unexpected rejection onto the error state with a generic message', () => {
    const view = toSearchView({ ...base, isError: true });
    expect(view.state).toBe('error');
    expect(view.errorMessage).toBe('The cruise search service is unavailable.');
  });

  it('surfaces the port’s own message for an expected failure', () => {
    const view = toSearchView({
      ...base,
      result: { status: 'error', kind: 'upstream', message: 'EVO is down' },
    });
    expect(view.state).toBe('error');
    expect(view.errorMessage).toBe('EVO is down');
  });

  it('surfaces the denied path as an error the agent can read (NFR5)', () => {
    const view = toSearchView({
      ...base,
      result: { status: 'error', kind: 'denied', message: 'Not authorized' },
    });
    expect(view.state).toBe('error');
    expect(view.errorMessage).toBe('Not authorized');
  });

  it('is empty when the port matched nothing', () => {
    expect(toSearchView({ ...base, result: { status: 'empty' } }).state).toBe('empty');
  });

  // VCX-10484 AC 1: the promo is why nothing came back, and the screen has to say so.
  it('carries the promo code an empty result is down to', () => {
    const view = toSearchView({ ...base, result: { status: 'empty', unmatchedPromoCode: 'XYZ' } });
    expect(view).toMatchObject({ state: 'empty', unmatchedPromoCode: 'XYZ' });
    expect(toSearchView({ ...base, result: { status: 'empty' } })).not.toHaveProperty(
      'unmatchedPromoCode',
    );
  });

  it('is empty for an ok result carrying no rows', () => {
    // The port can say ok/[]; the agent should still see the empty state, not a blank list.
    expect(toSearchView({ ...base, result: { status: 'ok', results: [] } }).state).toBe('empty');
  });

  it('is populated when rows came back, and passes them through', () => {
    const results = [{ cruiseId: 'A' }] as never;
    const view = toSearchView({ ...base, result: { status: 'ok', results } });
    expect(view.state).toBe('populated');
    expect(view.results).toBe(results);
  });
});
