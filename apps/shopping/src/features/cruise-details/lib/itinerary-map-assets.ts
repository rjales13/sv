// Route-map images for the three prototype-walkable cruises (ADR-0011, ADR-0014).
//
// ASSETS, not port data — the same class as the deck-plan SVGs, and outside the provider
// boundary for the same reason (ADR-0016 § 7): a JPG behind an async port would be boundary
// theatre. Vite resolves these imports to asset URLs at build time.
//
// What USED to live in this file alongside them has moved behind `VoyageItineraryProvider`:
// the EVO port lists, and the AEM narrative that was being extracted from 18.5 MB of
// `itinerary-map.json` imported straight into the bundle. That extraction is now a build-time
// step producing 2.9 KB (see `derive-port-descriptions.ts`).

import hidMapUrl from '../../../../../../context/mock-data/prototype-cruises/itinerary-maps/HID270322T.jpg';
import ovsMapUrl from '../../../../../../context/mock-data/prototype-cruises/itinerary-maps/OVS270325C.jpg';
import xpoMapUrl from '../../../../../../context/mock-data/prototype-cruises/itinerary-maps/XPO271113T.jpg';

const ITINERARY_MAP_URLS: Record<string, string> = {
  HID270322T: hidMapUrl,
  OVS270325C: ovsMapUrl,
  XPO271113T: xpoMapUrl,
};

/** The route-map image for a cruise, or `undefined` when the prototype has none. */
export function getItineraryMapUrl(cruiseId: string): string | undefined {
  return ITINERARY_MAP_URLS[cruiseId];
}
