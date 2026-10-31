import { describe, expect, it } from 'vitest';
import { hotelSideLabel } from './extensions-view-model.ts';

describe('hotelSideLabel', () => {
  it('marks hotels before the sailing as PRE HOTEL, stopovers included', () => {
    expect(hotelSideLabel('pre')).toBe('PRE HOTEL');
    expect(hotelSideLabel('pre-stopover')).toBe('PRE HOTEL');
  });

  it('marks hotels after the sailing as POST HOTEL, stopovers included', () => {
    expect(hotelSideLabel('post')).toBe('POST HOTEL');
    expect(hotelSideLabel('post-stopover')).toBe('POST HOTEL');
  });

  it('gives a land package no side: it holds hotels before AND after the sailing', () => {
    expect(hotelSideLabel('land-package')).toBeUndefined();
  });
});
