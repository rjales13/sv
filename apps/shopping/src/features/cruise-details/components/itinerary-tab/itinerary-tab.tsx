import { Alert, AlertDescription } from '@vikings/ui/components/alert';
import { Button } from '@vikings/ui/components/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@vikings/ui/components/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@vikings/ui/components/empty';
import { Icon } from '@vikings/ui/components/icon';
import { Spinner } from '@vikings/ui/components/spinner';
import { useOutletContext } from 'react-router';
import { ItineraryContainer } from '@/features/cruise-details/components/itinerary-container/index.ts';
import type { CruiseDetailsOutletContext } from '../../container.tsx';
import { getItineraryMapUrl } from '../../lib/itinerary-map-assets.ts';
import { useCruiseExtensions } from '../../lib/use-cruise-extensions.ts';
import { useVoyageItinerary } from '../../lib/use-voyage-itinerary.ts';
import { toHotelStays, toItineraryStops } from '../../lib/voyage-itinerary-model.ts';

// The Itinerary tab content — the accordion stop list beside the route map.
//
// Layout: 50/50 split — itinerary list left, sticky map right — matching
// ShoppingApp_UX-VD node 3060:128139. The map thumbnail carries an expand
// button (bottom-right) that opens the full-size map in a Dialog (node
// 3060:128673).

export function ItineraryTab() {
  const { cruise, principal } = useOutletContext<CruiseDetailsOutletContext>();
  // Ports and their AEM narrative arrive joined, through the typed port (ADR-0016 § 5).
  const { itinerary, isPending, errorMessage } = useVoyageItinerary(cruise.cruiseId, principal);
  // A cruise tour's hotels are not port calls, so they come from the land package in the
  // extensions offering. Waited for, so the day numbers do not jump once it lands; a failure
  // there costs only the hotel rows, never the itinerary.
  const extensions = useCruiseExtensions(
    cruise.cruiseId,
    principal,
    cruise.categories?.[0]?.currency ?? principal.officeCurrency,
  );
  // The route map stays an asset lookup — a JPG behind an async port would be boundary
  // theatre (ADR-0016 § 7).
  const mapUrl = getItineraryMapUrl(cruise.cruiseId);

  if (isPending || extensions.isPending) {
    return (
      <div
        role="status"
        aria-busy="true"
        data-testid="itinerary-tab-loading"
        className="flex flex-col items-center justify-center gap-4 py-16"
      >
        <Spinner className="size-11" aria-hidden="true" />
        <span className="text-base font-semibold leading-snug text-center text-ink-disabled">
          Loading itinerary
        </span>
      </div>
    );
  }

  if (errorMessage !== undefined) {
    return (
      <Alert variant="error" data-testid="itinerary-tab-error">
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  if (itinerary === undefined) {
    return (
      <Empty data-testid="itinerary-tab-empty">
        <EmptyHeader>
          <EmptyTitle>Itinerary not available</EmptyTitle>
          <EmptyDescription>
            This cruise has no itinerary data in the prototype. Only the three walkable cruises
            (OVS, HID, XPO) carry full detail.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const stops = toItineraryStops(
    itinerary.ports,
    toHotelStays(extensions.offering?.landPackage?.stays ?? [], itinerary.cityCopy),
  );

  return (
    <div className="flex gap-6">
      <ItineraryContainer stops={stops} className="min-w-0 flex-1" />

      {mapUrl !== undefined && (
        <Dialog>
          <aside
            aria-label="Itinerary route map"
            className="sticky top-[45px] h-fit min-w-0 flex-1 overflow-clip rounded-md border border-line shadow-raised"
          >
            <div className="relative">
              <img
                src={mapUrl}
                alt={`Route map for ${cruise.cruiseName}`}
                className="h-auto w-full object-cover"
              />
              {/* Expand trigger — bottom-right of the thumbnail (node I3060:128141;3060:35224) */}
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="absolute bottom-2 right-2"
                  aria-label="Expand route map"
                >
                  <Icon name="IconNavigationOpenInFull2" size={16} tone="current" />
                </Button>
              </DialogTrigger>
            </div>
          </aside>

          {/* Map-expansion dialog (node 3060:128673): header + divider + full-size map */}
          <DialogContent
            showCloseButton={false}
            className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(960px,calc(100vw-2rem))]"
          >
            <div className="flex shrink-0 items-center gap-3 px-6 py-4">
              <span className="flex-1 text-label-md font-semibold text-ink">
                {cruise.cruiseName}
              </span>
              <DialogClose asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Close map">
                  <Icon name="IconNavigationClose" size={24} tone="current" />
                </Button>
              </DialogClose>
            </div>
            <div className="h-px shrink-0 bg-line" aria-hidden="true" />
            <img
              src={mapUrl}
              alt={`Full route map for ${cruise.cruiseName}`}
              className="min-h-0 w-full flex-1 object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
