// Prototype guest identities for the Viking Air tab and the Build Panel.
//
// What USED to live here — gateway options, class options, a per-class fare table and a flat
// discount — is gone. All four are real EVO data and now come from `AirCityPricingProvider`
// via `viking-air-pricing.ts` (ADR-0016 § 5). They were wrong against the delivered payloads
// in three separate ways: one shared 21-airport list where each cruise has its own 175–189,
// two gateways (HOU, MDW) that appear in no payload at all, and a flat 700 discount that was
// correct for 171 of 1620 rows.
//
// Guests are a different matter. They are not air data, and the prototype has no contact
// integration to source them from — `CreateEVOContact` exists in the corpus but no read
// endpoint does. So these stay fixtures, and stay honest about being fixtures.

export interface VikingAirGuest {
  id: string;
  /** Card heading, e.g. "Guest 1 / Main PAX". */
  title: string;
  name: string;
  customerNumber: string;
}

export const PROTOTYPE_GUESTS: readonly [VikingAirGuest, VikingAirGuest] = [
  {
    id: 'G1',
    title: 'Guest 1 / Main PAX',
    name: 'Mr. John Smith Whitcombe',
    customerNumber: '100838606001',
  },
  {
    id: 'G2',
    title: 'Guest 2',
    name: 'Ms. Mary Stone Davis',
    customerNumber: '100838606002',
  },
];
