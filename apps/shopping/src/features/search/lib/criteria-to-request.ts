import { type CruiseSearchRequest, CruiseSearchRequestSchema } from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';
import { pushToDate, type SearchPanelValues, toIsoDate } from './search-panel-schema.ts';

// The U4 -> U6 -> U3 bridge (NFR5). The controller reads the platform-owned
// `AuthenticatedPrincipal` (U4) and this maps it — together with the form
// criteria — onto U3's curated `CruiseSearchRequest`, projecting the principal
// down to the contract-owned `PrincipalRef`. `contracts` never imports
// `platform`; this feature-side mapper is where the two typed seams meet.

/**
 * Projects the platform `AuthenticatedPrincipal` onto the contract `PrincipalRef`.
 * `authorizationScopes` is optional on the platform principal but required on the
 * ref, so it degrades to an empty array rather than dropping the field.
 */
export function toPrincipalRef(principal: AuthenticatedPrincipal) {
  return {
    principalId: principal.principalId,
    officeCurrency: principal.officeCurrency,
    authorizationScopes: principal.authorizationScopes ?? [],
  };
}

/**
 * Builds a contract-valid `CruiseSearchRequest` from the form criteria and the
 * authenticated principal. `requestId` is injectable for deterministic tests and
 * otherwise generated. The result is parsed by `CruiseSearchRequestSchema` so a
 * returned value is guaranteed to satisfy the port contract at the boundary (NFR1).
 */
export function buildCruiseSearchRequest(
  values: SearchPanelValues,
  principal: AuthenticatedPrincipal,
  requestId: string = crypto.randomUUID(),
  now: Date = new Date(),
): CruiseSearchRequest {
  // VCX-10482 R1: no combination of parameters may end in an error, and the integration layer
  // cannot search without both ends of the window. An emptied date is therefore filled here,
  // with the same values the form defaults to — today, and two months after From — while the
  // field on screen stays as the agent left it.
  const sailingDateFrom = values.sailingDateFrom || toIsoDate(now);
  const sailingDateTo = values.sailingDateTo || pushToDate(sailingDateFrom);
  return CruiseSearchRequestSchema.parse({
    requestId,
    searchMode: values.searchMode,
    products: values.products,
    scope: values.scope,
    naturalLanguageQuery: values.naturalLanguageQuery,
    sailingDateFrom,
    sailingDateTo,
    nightsFrom: values.nightsFrom,
    nightsTo: values.nightsTo,
    guests: values.guests,
    portCities: values.portCities,
    hotelCities: values.hotelCities,
    currency: values.currency,
    // The promo field is free text (VCX-10484 R2): kept as typed while editing, trimmed here.
    promoCodes: values.promoCodes.map((code) => code.trim()).filter((code) => code !== ''),
    groupContractNumber: values.groupContractNumber,
    principal: toPrincipalRef(principal),
  });
}
