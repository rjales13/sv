import type { CategoryPricingAvailability, StateroomAvailability } from '@vikings/contracts';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@vikings/ui/components/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@vikings/ui/components/select';
import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router';
import { useStore } from 'zustand';
import { useCruiseRoute } from '@/app/routing/use-cruise-route.tsx';
import { categoryGroupName } from '@/features/search/lib/results-view-model.ts';
import { cruiseWorkspaceStore } from '@/store/cruise-workspace.store.ts';
import type { CruiseDetailsOutletContext } from '../../container.tsx';
import { deckIndexForSelection } from '../../lib/deck-index.ts';
import { injectPlanHighlight } from '../../lib/deck-plan-highlight.ts';
import { readDeckLegend } from '../../lib/deck-plan-legend.ts';
import { defaultStateroomFor, GUARANTEE_STATEROOM } from '../../lib/default-stateroom.ts';
import { getShipReference } from '../../lib/ship-reference.ts';
import { toStateroomPriceColumns } from '../../lib/stateroom-price-columns.ts';
import { useStateroomAvailability } from '../../lib/use-stateroom-availability.ts';
import { StateroomsDeckplan } from '../staterooms-deckplan/index.ts';
import {
  type SelectedCategory,
  StateroomsPriceCard,
} from '../staterooms-price-card/staterooms-price-card.tsx';
import { StateroomsSelection } from '../staterooms-selection/staterooms-selection.tsx';
import { StateroomsTable, type StateroomsTableRow } from '../staterooms-table/staterooms-table.tsx';
import { DeckExpandModal } from './deck-expand-modal.tsx';

// The Staterooms tab content.
//
// Layout (ShoppingApp_UX-VD, node 2569:179037 "01-CruiseDetails-Staterooms"):
//   - StateroomsPriceCard: full-width fare grid — all categories and their tier prices.
//   - Below, side by side:
//       Left (308px): section header (Stateroom Selection) + scrollable StateroomsTable
//       Right: StateroomsDeckplan (deck selector, ship sideview, floor plan, conventions legend)
//
// Selection state is stored in URL search params (?cat=&room=) so it persists when the
// agent switches between tabs and returns (R1 AC: "Leaving Staterooms and returning preserves
// the current category and stateroom selection").
//
// Data:  price-card columns come from the cruise contract (CategoryPricingAvailability.categories).
//        Stateroom room-numbers and deck images come from static prototype fixtures (ADR-0011).

/** Builds SelectedCategory metadata from the matched EVO category (R3.1). */
function buildSelectedCategory(
  cat: CategoryPricingAvailability['categories'][number],
  currency: string,
): SelectedCategory {
  return {
    name: categoryGroupName(cat.description),
    code: cat.abbrev,
    price: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      currencyDisplay: 'narrowSymbol',
    }).format(cat.doublePrice),
  };
}

/**
 * Converts the port's availability variant into StateroomsTable rows.
 *
 * `guarantee` renders a single GTY row rather than an empty table — the designed
 * Guarantee-Only surface (ADR-0015 § 5), for a category with no physical cabin left to sell.
 */
function buildTableRows(
  availability: StateroomAvailability | undefined,
  selectedStateroom: string | null,
): StateroomsTableRow[] {
  if (availability?.kind === 'physical') {
    return availability.cabins.map((cabin) => ({
      stateroom: cabin.number,
      checked: cabin.number === selectedStateroom,
    }));
  }
  if (availability?.kind === 'guarantee') {
    return [{ stateroom: GUARANTEE_STATEROOM, checked: selectedStateroom === GUARANTEE_STATEROOM }];
  }
  return [];
}

type SetSearchParams = ReturnType<typeof useSearchParams>[1];

/** Updates ?cat and clears ?room. Extracted from the component to reduce its complexity. */
function applyCategoryParam(setSearchParams: SetSearchParams, abbrev: string | null) {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      if (abbrev === null) {
        next.delete('cat');
      } else {
        next.set('cat', abbrev);
      }
      next.delete('room');
      return next;
    },
    { replace: true },
  );
}

/** Updates ?room. Extracted from the component to reduce its complexity. */
function applyStateroomParam(setSearchParams: SetSearchParams, stateroom: string | null) {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      if (stateroom === null) {
        next.delete('room');
      } else {
        next.set('room', stateroom);
      }
      return next;
    },
    { replace: true },
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrating component with multiple independent selection dimensions (category, stateroom, deck, modal) — each produces one branch and splitting would require prop-drilling all state downward.
export function StateroomsTab() {
  const { cruise, principal } = useOutletContext<CruiseDetailsOutletContext>();
  const ship = getShipReference(cruise.cruiseId);
  const { cruiseId } = useCruiseRoute();

  // URL search params persist selection within the same navigation (R1).
  // When tab navigation clears the params, the store provides the fallback so
  // the selection survives cross-tab navigation (same fix as Viking Air tab).
  const [searchParams, setSearchParams] = useSearchParams();
  const storeChoice = useStore(cruiseWorkspaceStore, (s) =>
    cruiseId !== undefined ? s.byCruise[cruiseId]?.stateroom : undefined,
  );
  const selectedAbbrev = searchParams.get('cat') ?? storeChoice?.categoryAbbrev ?? null;
  const selectedStateroom = searchParams.get('room') ?? storeChoice?.cabinNumber ?? null;

  const [selectedDeckIndex, setSelectedDeckIndex] = useState(storeChoice?.deck ?? 0);

  // Sync URL stateroom selection to the workspace store so the Build Panel reflects it.
  useEffect(() => {
    if (cruiseId === undefined || selectedAbbrev === null || selectedStateroom === null) return;
    cruiseWorkspaceStore.getState().selectStateroom(cruiseId, {
      categoryAbbrev: selectedAbbrev,
      cabinNumber: selectedStateroom,
      deck: selectedDeckIndex,
    });
  }, [cruiseId, selectedAbbrev, selectedStateroom, selectedDeckIndex]);
  const [deckExpandOpen, setDeckExpandOpen] = useState(false);
  // What the agent is pointing at in the stateroom list, so the plan can pick it out. Hover is
  // transient and never persisted — the SELECTED cabin is what survives a reload.
  const [hoveredStateroom, setHoveredStateroom] = useState<string | null>(null);

  const currency = cruise.categories[0]?.currency ?? 'USD';
  // Availability is occupancy-specific — it is part of EVO's documented path — so the search
  // criteria's guest count decides which cabins come back.
  const rawCriteria = useStore(cruiseWorkspaceStore, (state) => state.searchCriteria);
  const guests = (rawCriteria as { guests?: number } | null)?.guests ?? 2;
  const columns = toStateroomPriceColumns(cruise.categories, currency, selectedAbbrev);

  const selectedCat = selectedAbbrev
    ? cruise.categories.find((c) => c.abbrev === selectedAbbrev)
    : undefined;
  const selectedCategory = selectedCat ? buildSelectedCategory(selectedCat, currency) : undefined;

  // Cabins come through the typed port; deck plans and legends stay synchronous ship
  // reference data (ADR-0016 § 7).
  const { availability, isPending: cabinsPending } = useStateroomAvailability(
    cruiseId,
    selectedAbbrev,
    principal,
    currency,
    guests,
  );
  const rawRows = buildTableRows(availability, selectedStateroom);

  // Picking a category selects its first cabin once the list arrives, so the Build Panel
  // prices what the agent chose instead of sitting at zero (see defaultStateroomFor).
  useEffect(() => {
    const stateroom = defaultStateroomFor(availability, selectedStateroom);
    if (stateroom !== undefined) applyStateroomParam(setSearchParams, stateroom);
  }, [availability, selectedStateroom, setSearchParams]);
  const isGtyOnly = availability?.kind === 'guarantee';

  const decks = ship?.decks ?? [];

  // The three panels describe ONE choice, so they move together: picking Veranda V1 fills the
  // stateroom list with 3101–3112 and brings the plan to Deck 3, because that is where those
  // cabins are. EVO states the deck on every cabin, so this is a join rather than a guess.
  //
  // Keyed on the SELECTION, never on `selectedDeckIndex` — the agent is still free to browse
  // other decks afterwards, and an effect that also watched the deck would drag them back.
  const physicalCabins = availability?.kind === 'physical' ? availability.cabins : undefined;
  useEffect(() => {
    if (physicalCabins === undefined) return;
    const index = deckIndexForSelection(decks, physicalCabins, selectedStateroom);
    if (index !== undefined) setSelectedDeckIndex(index);
  }, [decks, physicalCabins, selectedStateroom]);

  // Hover wins over selection: the agent is asking "where is THAT one?" while they point.
  const highlightCabin = hoveredStateroom ?? selectedStateroom;

  const currentDeck = decks[selectedDeckIndex];
  const sideviewSrc = ship?.sideviewSrc ?? '';
  const floorplanSrc = currentDeck?.floorplanSrc ?? '';
  const floorplanRaw = currentDeck?.floorplanRaw ?? '';

  // R4.5: the legend describes the deck ON SCREEN — its category codes once a category is
  // selected, its public venues before that — and both are read off the drawing itself, so
  // changing deck changes the legend with it. Memoised because it scans the SVG text, and the
  // deck only changes when the agent picks a different one.
  const conventions = useMemo(
    () => readDeckLegend(floorplanRaw, selectedAbbrev !== null),
    [floorplanRaw, selectedAbbrev],
  );

  if (cruise.categories.length === 0) {
    return (
      <Empty data-testid="staterooms-tab-empty">
        <EmptyHeader>
          <EmptyTitle>No stateroom categories available</EmptyTitle>
          <EmptyDescription>
            This sailing has no stateroom pricing data in the prototype.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="staterooms-tab">
      {/* Price grid — all categories, full width */}
      <StateroomsPriceCard
        columns={columns}
        {...(selectedCategory !== undefined && { selectedCategory })}
        onItemSelect={(abbrev) => applyCategoryParam(setSearchParams, abbrev)}
      />

      {/* Bottom section: stateroom table (left) + deck plan (right) */}
      {/* The two cards share a height, set by the deck plan: the row stretches, and the table
          fills its slot absolutely so a long room list scrolls instead of growing the row. */}
      <div className="flex items-stretch gap-4">
        {/* Left: selection header + table */}
        <div className="flex w-[308px] shrink-0 flex-col gap-0">
          {/* Header row: section title */}
          <div className="flex h-[84px] items-center px-0">
            <StateroomsSelection
              aria-busy={cabinsPending}
              {...(selectedCat !== undefined && {
                categoryName: categoryGroupName(selectedCat.description),
                categoryCode: selectedCat.abbrev,
              })}
            />
          </div>

          <div className="relative min-h-[420px] flex-1">
            <StateroomsTable
              className="absolute inset-0"
              rows={rawRows}
              isGtyOnly={isGtyOnly}
              onRowChange={(stateroom, checked) =>
                applyStateroomParam(setSearchParams, checked ? stateroom : null)
              }
              onRowHover={setHoveredStateroom}
            />
          </div>
        </div>

        {/* Right: deck selector header + deck plan */}
        {ship !== undefined && (
          <div className="flex flex-1 flex-col gap-0">
            {/* Always present, so the deck plan's top lines up with the table's even when a
                single-deck ship has no selector to show. */}
            <div className="flex h-[84px] items-center">
              {decks.length > 1 && (
                <Select
                  value={String(selectedDeckIndex)}
                  onValueChange={(v) => setSelectedDeckIndex(Number(v))}
                >
                  <SelectTrigger className="w-[148px]" aria-label="Select deck">
                    <SelectValue placeholder="Select deck" />
                  </SelectTrigger>
                  <SelectContent>
                    {decks.map((deck, i) => (
                      <SelectItem key={deck.label} value={String(i)}>
                        {deck.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <StateroomsDeckplan
              sideviewSrc={sideviewSrc}
              sideviewRaw={ship.sideviewRaw}
              {...(currentDeck?.sideviewLayerId !== undefined && {
                activeDeckLayerId: currentDeck.sideviewLayerId,
              })}
              floorplanSrc={floorplanSrc}
              floorplanRaw={floorplanRaw}
              {...(selectedAbbrev !== null && { highlightCategory: selectedAbbrev })}
              {...(highlightCabin !== null && { highlightCabin })}
              conventions={conventions}
              onExpandToggle={() => setDeckExpandOpen(true)}
            />
            <DeckExpandModal
              open={deckExpandOpen}
              onClose={() => setDeckExpandOpen(false)}
              shipName={cruise.shipName}
              deckLabel={currentDeck?.label ?? ''}
              sideviewSrc={sideviewSrc}
              floorplanSrc={floorplanSrc}
              floorplanRaw={
                selectedAbbrev === null
                  ? floorplanRaw
                  : injectPlanHighlight(floorplanRaw, selectedAbbrev, highlightCabin ?? undefined)
              }
              conventions={conventions}
            />
          </div>
        )}
      </div>
    </div>
  );
}
