import type { AuthenticatedPrincipal } from '@vikings/platform';
import { describe, expect, it } from 'vitest';
import { buildCruiseSearchRequest } from './criteria-to-request.ts';
import { buildDefaultSearchPanelValues } from './search-panel-schema.ts';

// The criteria -> request mapping is the U4 -> U6 -> U3 bridge (NFR5): it reads
// the platform-owned `AuthenticatedPrincipal` and injects a contract-owned
// `PrincipalRef` into every request. The output is parsed by U3's schema, so a
// passing build is a contract-valid request.

const PRINCIPAL: AuthenticatedPrincipal = {
  principalId: 'agent-42',
  displayName: 'Test Agent',
  officeCurrency: 'EUR',
  securityRoles: ['cruise-agent'],
  authorizationScopes: ['cruise.search'],
};

describe('buildCruiseSearchRequest (NFR5 principal bridge, FR2.1)', () => {
  it('maps every form field onto the curated request shape', () => {
    const values = {
      ...buildDefaultSearchPanelValues('EUR'),
      products: ['River'],
      scope: 'Ports',
      naturalLanguageQuery: 'nile',
      sailingDateFrom: '2027-01-01',
      sailingDateTo: '2027-03-01',
      nightsFrom: 5,
      nightsTo: 10,
      guests: 2,
      portCities: ['Luxor'],
      hotelCities: ['Cairo'],
      currency: 'GBP',
      promoCodes: ['VIKING10'],
    };

    const request = buildCruiseSearchRequest(values, PRINCIPAL, 'req-1');

    expect(request.requestId).toBe('req-1');
    expect(request.products).toEqual(['River']);
    expect(request.scope).toBe('Ports');
    expect(request.naturalLanguageQuery).toBe('nile');
    expect(request.sailingDateFrom).toBe('2027-01-01');
    expect(request.sailingDateTo).toBe('2027-03-01');
    expect(request.nightsFrom).toBe(5);
    expect(request.nightsTo).toBe(10);
    expect(request.guests).toBe(2);
    expect(request.portCities).toEqual(['Luxor']);
    expect(request.hotelCities).toEqual(['Cairo']);
    expect(request.currency).toBe('GBP');
    expect(request.promoCodes).toEqual(['VIKING10']);
  });

  // VCX-10484: the promo field is free text, so what reaches the search is what the agent
  // typed, without the spaces around it — and an empty field is no promo at all.
  it.each([
    { typed: ['  RCR-15 '], sent: ['RCR-15'] },
    { typed: ['   '], sent: [] },
    { typed: [], sent: [] },
  ])('sends the typed promo code trimmed ($typed)', ({ typed, sent }) => {
    const values = { ...buildDefaultSearchPanelValues('USD'), promoCodes: typed };
    expect(buildCruiseSearchRequest(values, PRINCIPAL, 'req-3').promoCodes).toEqual(sent);
  });

  // VCX-10482 R1: no combination of parameters is an error. The integration layer cannot search
  // without both ends of the window, so an emptied date is filled in the request — From with
  // today, To with two months after From — and the field itself stays as the agent left it.
  describe('an emptied sailing date (VCX-10482 R1)', () => {
    const NOW = new Date(2026, 9, 16);
    const withDates = (from: string, to: string) => ({
      ...buildDefaultSearchPanelValues('USD', NOW),
      sailingDateFrom: from,
      sailingDateTo: to,
    });
    const build = (from: string, to: string) =>
      buildCruiseSearchRequest(withDates(from, to), PRINCIPAL, 'req-4', NOW);

    it('searches from today when From is empty', () => {
      expect(build('', '2027-03-01')).toMatchObject({
        sailingDateFrom: '2026-10-16',
        sailingDateTo: '2027-03-01',
      });
    });

    it('searches to two months after From when To is empty', () => {
      expect(build('2027-01-10', '')).toMatchObject({
        sailingDateFrom: '2027-01-10',
        sailingDateTo: '2027-03-10',
      });
    });

    it('searches the default window when both are empty', () => {
      expect(build('', '')).toMatchObject({
        sailingDateFrom: '2026-10-16',
        sailingDateTo: '2026-12-16',
      });
    });

    it('leaves dates the agent set untouched', () => {
      expect(build('2027-01-10', '2027-01-20')).toMatchObject({
        sailingDateFrom: '2027-01-10',
        sailingDateTo: '2027-01-20',
      });
    });
  });

  it('injects the principal reference from the authenticated principal (NFR5)', () => {
    const request = buildCruiseSearchRequest(
      buildDefaultSearchPanelValues('EUR'),
      PRINCIPAL,
      'req-2',
    );

    expect(request.principal.principalId).toBe('agent-42');
    expect(request.principal.officeCurrency).toBe('EUR');
    expect(request.principal.authorizationScopes).toEqual(['cruise.search']);
  });

  it('defaults authorization scopes to an empty array when the principal omits them', () => {
    const minimalPrincipal: AuthenticatedPrincipal = {
      principalId: 'agent-1',
      officeCurrency: 'USD',
    };
    const request = buildCruiseSearchRequest(
      buildDefaultSearchPanelValues('USD'),
      minimalPrincipal,
      'req-3',
    );
    expect(request.principal.authorizationScopes).toEqual([]);
  });

  it('generates a request id when none is supplied', () => {
    const request = buildCruiseSearchRequest(buildDefaultSearchPanelValues('USD'), PRINCIPAL);
    expect(typeof request.requestId).toBe('string');
    expect(request.requestId.length).toBeGreaterThan(0);
  });
});
