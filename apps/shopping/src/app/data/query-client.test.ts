import { describe, expect, it } from 'vitest';
import { createAppQueryClient } from './query-client.ts';

describe('createAppQueryClient', () => {
  it('pins the defaults the FR4 states depend on', () => {
    const defaults = createAppQueryClient().getDefaultOptions().queries;

    // Each of these is a deliberate choice, not a preference:
    //  - retry false: a failure reaches the error state instead of hiding behind a spinner.
    //  - no refetch on focus: an agent alt-tabbing must not silently re-price a quote.
    expect(defaults?.retry).toBe(false);
    expect(defaults?.refetchOnWindowFocus).toBe(false);
  });

  it('hands out an independent client per call, so tests cannot leak cache into each other', () => {
    expect(createAppQueryClient()).not.toBe(createAppQueryClient());
  });
});
