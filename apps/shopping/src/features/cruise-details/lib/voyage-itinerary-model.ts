import type { ExtensionStay, VoyageItinerary, VoyagePort } from '@vikings/contracts';
import { formatDayMonth } from '@vikings/ui/lib/date-format';
import type { ItineraryVariant } from '@/shared/components/itinerary-row/index.ts';
import type { ItineraryContainerStop } from '../components/itinerary-container/itinerary-container.tsx';

// View model: curated `VoyagePort[]` -> ItineraryContainer stops.
//
// This used to take the RAW EVO port rows, which made a UI component's props the integration
// contract. It now consumes Contract 2 (ADR-0016 § 8), so it is a view model over a real
// contract rather than being the contract — and the port narrative arrives already joined by
// the adapter instead of being passed in alongside.
//
// Still a pure function of its input: no network, no context, so the tab and any test can
// call it directly.

function scheduleVariant(port: VoyagePort, index: number, total: number): ItineraryVariant {
  if (index === 0) return 'departure';
  if (index === total - 1) return 'arrival';
  const codes = port.schedules.map((s) => s.code);
  if (codes.includes('TR')) return 'transit';
  // At anchor (AN) is still a port call — tendered ashore rather than berthed — so it keeps
  // the port's ship glyph, like Dock; only its label differs (see portLabel).
  return 'port';
}

const VARIANT_LABEL: Record<ItineraryVariant, string> = {
  departure: 'Cruise Departure',
  arrival: 'Cruise Arrival',
  transit: 'Scenic Sailing',
  sailing: 'At Anchor',
  // EVO uses 'DK' (Dock) for berth-type; label overridden per-port below.
  port: 'In Port',
  hotel: 'Hotel',
};

/** "Dock" for a DK-berthed port, "At Anchor" for an AN one, otherwise the variant label. */
function portLabel(port: VoyagePort, variant: ItineraryVariant): string {
  if (variant === 'port' && port.schedules.some((s) => s.code === 'DK')) return 'Dock';
  if (variant === 'port' && port.schedules.some((s) => s.code === 'AN')) return 'At Anchor';
  return VARIANT_LABEL[variant];
}

/** True when this port also appears on the immediately adjacent calendar day. */
function isOvernightPort(port: VoyagePort, ports: readonly VoyagePort[]): boolean {
  const dateMs = Date.parse(port.date.slice(0, 10));
  const oneDayMs = 86_400_000;
  return ports.some(
    (other) =>
      other !== port &&
      other.code === port.code &&
      Math.abs(Date.parse(other.date.slice(0, 10)) - dateMs) === oneDayMs,
  );
}

/** `1500` -> `15:00`. */
function clock(hhmm: string): string {
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2)}`;
}

/**
 * The row's badges: attributes first, then times. Times (board, arrive, depart) always sit at
 * the right edge of the row, so an attribute like "Overnight in port" never pushes them
 * inward and the clock reads in the same place on every day.
 */
function scheduleTags(port: VoyagePort, ports: readonly VoyagePort[]): string[] {
  const attributes: string[] = [];
  if (isOvernightPort(port, ports)) attributes.push('Overnight in port');

  // Times are absent rather than empty-string here — the adapter normalises both of EVO's
  // sentinels — so presence is the only check needed.
  const times: string[] = [];
  if (port.boardingBeginsTime !== undefined) times.push(`Board ${clock(port.boardingBeginsTime)}`);
  for (const s of port.schedules) {
    if (s.code === 'AR' && s.time !== undefined) times.push(`Arrive ${clock(s.time)}`);
    if (s.code === 'DP' && s.time !== undefined) times.push(`Depart ${clock(s.time)}`);
  }
  return [...attributes, ...times];
}

/**
 * One land-package hotel stay — a night the guest spends ashore before or after the sailing.
 *
 * Not a port call, so `GetVoyageItinerary` never lists it: the tab builds these from the
 * extensions offering's land-package stays, and the AEM copy for the city alongside.
 */
export interface ItineraryHotelStay {
  code: string;
  city: string;
  /** Shown on the detail line, e.g. "Zurich Hotel". */
  hotelName: string;
  /** ISO datetimes as delivered. */
  checkIn: string;
  checkOut: string;
  shortDescription?: string | undefined;
  description?: string | undefined;
}

/** The land package's stays, as timeline hotel rows. Stays with no hotel are skipped. */
export function toHotelStays(
  stays: readonly ExtensionStay[],
  cityCopy: VoyageItinerary['cityCopy'] = {},
): ItineraryHotelStay[] {
  return stays.flatMap((stay) => {
    const code = stay.hotel?.portCode;
    if (code === undefined) return [];
    const copy = cityCopy[code];
    return [
      {
        code,
        // XPO's Buenos Aires hotel arrives without a city; its title still names it.
        city: stay.hotel?.city ?? stay.title.replace(/\s+Hotel$/i, ''),
        hotelName: stay.hotel?.name ?? stay.title,
        checkIn: stay.fromDate,
        checkOut: stay.toDate,
        shortDescription: copy?.shortDescription,
        description: copy?.description,
      },
    ];
  });
}

const DAY_MS = 86_400_000;

/** Whole calendar days from `from` to `to`, by date alone. */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / DAY_MS);
}

function hotelStop(stay: ItineraryHotelStay, firstDay: number): ItineraryContainerStop {
  const lastDay = firstDay + daysBetween(stay.checkIn, stay.checkOut);
  return {
    id: `hotel-${stay.code}-${stay.checkIn.slice(0, 10)}`,
    day: { ordinal: `DAY ${firstDay}`, date: formatDayMonth(stay.checkIn) },
    through: { ordinal: `DAY ${lastDay}`, date: formatDayMonth(stay.checkOut) },
    port: `${stay.city} (${stay.code})`,
    variant: 'hotel',
    label: stay.hotelName,
    summary: stay.shortDescription ?? stay.city,
    ...(stay.description !== undefined && { overview: stay.description }),
  };
}

/**
 * The timeline: the sailing's port calls, wrapped by any land-package hotels (a cruise tour —
 * hotel in Zurich, embark Basel, debark Trier, hotel in Paris).
 *
 * A stay goes before or after the sailing by its dates, not by the offering's order or its
 * pre/post category: that category is inferred from EVO's `hotType` and has already
 * mislabelled XPO's Buenos Aires night, which precedes embarkation, as a "post" stopover.
 *
 * Days count from the start of the TRIP, so with two hotel nights in Zurich, embarkation in
 * Basel is DAY 3 — the numbering the "11 Total Nights" tag implies.
 */
export function toItineraryStops(
  ports: readonly VoyagePort[],
  hotels: readonly ItineraryHotelStay[] = [],
): ItineraryContainerStop[] {
  const firstPort = ports[0]?.date;
  const lastPort = ports.at(-1)?.date;
  const byCheckIn = [...hotels].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const before = byCheckIn.filter(
    (h) => firstPort !== undefined && daysBetween(h.checkIn, firstPort) > 0,
  );
  const after = byCheckIn.filter((h) => !before.includes(h));

  // Embarkation day, counted from the earliest pre-sailing check-in.
  const tripStart = before[0]?.checkIn;
  const embarkDay =
    tripStart !== undefined && firstPort !== undefined ? daysBetween(tripStart, firstPort) + 1 : 1;

  const sailing = portStops(ports, embarkDay);
  const lastPortDay = sailing.lastDay;
  return [
    ...before.map((h) =>
      hotelStop(h, (tripStart === undefined ? 0 : daysBetween(tripStart, h.checkIn)) + 1),
    ),
    ...sailing.stops,
    ...after.map((h) =>
      hotelStop(h, lastPortDay + (lastPort === undefined ? 0 : daysBetween(lastPort, h.checkIn))),
    ),
  ];
}

function portStops(
  ports: readonly VoyagePort[],
  firstDay: number,
): { stops: ItineraryContainerStop[]; lastDay: number } {
  let dayNumber = firstDay - 1;
  let lastDate = '';

  const stops = ports.map((port, index) => {
    const dateKey = port.date.slice(0, 10);
    const isNewDay = dateKey !== lastDate;
    if (isNewDay) {
      dayNumber++;
      lastDate = dateKey;
    }

    const variant = scheduleVariant(port, index, ports.length);
    const tags = scheduleTags(port, ports);

    // summary: the always-visible line — AEM's short description, else the port name.
    // overview: the long narrative, revealed on expand (ShoppingApp_UX-VD 906:118908). A port
    // with no long copy gets no expand affordance rather than an empty panel (Jira R2).
    const stop: ItineraryContainerStop = {
      id: `${index}-${port.code}-${dateKey}`,
      ...(isNewDay && {
        day: { ordinal: `DAY ${dayNumber}`, date: formatDayMonth(port.date) },
      }),
      port: `${port.name} (${port.code})`,
      variant,
      label: portLabel(port, variant),
      ...(tags.length > 0 && { tags }),
      summary: port.shortDescription ?? port.name,
      ...(port.description !== undefined && { overview: port.description }),
    };
    return stop;
  });
  return { stops, lastDay: dayNumber };
}
