import type { CategoryPricingAvailability } from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';
import { Alert, AlertDescription, AlertTitle } from '@vikings/ui/components/alert';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@vikings/ui/components/empty';
import { Spinner } from '@vikings/ui/components/spinner';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useStore } from 'zustand';
import { useCruiseRoute } from '../../app/routing/use-cruise-route.tsx';
import { type CruiseChoices, cruiseWorkspaceStore } from '../../store/cruise-workspace.store.ts';
import { BuildPanel } from '../build-panel/build-panel.tsx';
import { SearchPanelSchema } from '../search/index.ts';
import { CruiseContextCard } from './components/context-card/index.ts';
import { CruiseDetailsTabs } from './components/cruise-details-tabs.tsx';
import { toCruiseContextCardModel } from './lib/cruise-header-model.ts';
import { useAirCityPricing } from './lib/use-air-city-pricing.ts';
import { useCruiseById } from './lib/use-cruise-by-id.ts';
import { useCruiseExtensions } from './lib/use-cruise-extensions.ts';

// The cruise-details container: the shell the four tabs plug into.
//
// It owns the identity header, the tab strip and the persistent footer bar; the tab CONTENT
// is each tab's own story and renders through the <Outlet/> below. That split is why this is
// one ticket and four others: everything here is shared, and only one person should own it.
//
// Only three cruises are walkable end to end (ADR-0011), so "this cruise has no detail data"
// is the majority path for the other 17 fixture records — it is a first-class empty state
// here, not an error.

/**
 * The choices slice for a cruise the store has no record of.
 *
 * Module-level and frozen so every render that needs it gets the SAME reference — see the
 * selector in the container for why that matters.
 */
const EMPTY_CHOICES: CruiseChoices = Object.freeze({
  extensionIds: [],
  air: {},
  travelProtection: {},
});

export interface CruiseDetailsContainerProps {
  principal: AuthenticatedPrincipal;
}

/**
 * What the container hands each tab through the router `<Outlet/>`.
 *
 * The principal travels with the cruise because every provider port carries the authenticated
 * principal in its request (AGENTS.md invariant 7) — so each tab that reaches a port needs
 * one, and re-deriving it per tab would mean four places to get it wrong.
 */
export interface CruiseDetailsOutletContext {
  cruise: CategoryPricingAvailability;
  principal: AuthenticatedPrincipal;
}

export function CruiseDetailsContainer({ principal }: CruiseDetailsContainerProps) {
  const { cruiseId } = useCruiseRoute();
  const { cruise, isPending, errorMessage } = useCruiseById(cruiseId, principal);
  // One shared EMPTY_CHOICES, never a fresh literal. `useStore` is `useSyncExternalStore`, which
  // compares snapshots by REFERENCE — a selector that builds a new object on every call reports
  // a change on every render and React re-renders until it gives up ("Maximum update depth
  // exceeded"), unmounting the whole tree. That is reachable from the UI: closing the last
  // cruise tab deletes this cruise's slice while the container is still mounted, so the
  // fallback branch runs, and the app blanks to an empty frame inside the host shell.
  const choices = useStore(cruiseWorkspaceStore, (s) =>
    cruiseId !== undefined ? (s.byCruise[cruiseId] ?? EMPTY_CHOICES) : EMPTY_CHOICES,
  );
  const rawCriteria = useStore(cruiseWorkspaceStore, (s) => s.searchCriteria);
  const searchCriteria =
    rawCriteria !== null ? SearchPanelSchema.safeParse(rawCriteria).data : undefined;
  const guests = searchCriteria?.guests ?? 2;
  const currency = searchCriteria?.currency ?? principal.officeCurrency;
  const promoCodes = searchCriteria?.promoCodes ?? [];
  // Same query key the Viking Air tab uses, so React Query serves both from one cache entry:
  // the footer and the tab price identical selections from identical fares (ADR-0016 § 5).
  const { pricing: airPricing } = useAirCityPricing(cruiseId, principal, currency);
  const { offering: extensions } = useCruiseExtensions(cruiseId, principal, currency);

  // The workspace strip opens a tab the moment the route resolves, before any name is known,
  // so it shows the cruise id until this fills it in (VCX-10326).
  const cruiseName = cruise?.cruiseName;
  useEffect(() => {
    if (cruiseId === undefined || cruiseName === undefined) return;
    cruiseWorkspaceStore.getState().setCruiseLabel(cruiseId, cruiseName);
  }, [cruiseId, cruiseName]);

  if (isPending) {
    return (
      <div
        role="status"
        aria-busy="true"
        data-testid="cruise-details-loading"
        className="flex flex-col items-center justify-center gap-3 py-16"
      >
        <Spinner className="size-8" aria-hidden="true" />
        <span className="text-sm text-ink-secondary">Loading cruise</span>
      </div>
    );
  }

  if (errorMessage !== undefined) {
    return (
      <Alert variant="error" data-testid="cruise-details-error">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  if (cruise === undefined) {
    return (
      <Empty data-testid="cruise-details-empty">
        <EmptyHeader>
          <EmptyTitle>Cruise details unavailable</EmptyTitle>
          <EmptyDescription>
            This sailing has no detail data in the prototype. Go back to results and pick another.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section data-testid="cruise-details" className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-4 py-4">
          <CruiseContextCard {...toCruiseContextCardModel(cruise)} />
        </div>
        {/* Tabs stick to the top of the scroll container as the context card scrolls away. */}
        <div className="sticky top-0 z-10 bg-background">
          <CruiseDetailsTabs cruiseId={cruise.cruiseId} />
        </div>
        {/* Each tab's content is its own story; the container only holds the slot. */}
        <div className="p-4">
          <Outlet context={{ cruise, principal }} />
        </div>
      </div>
      {/* The Build Panel: persistent bottom bar on all four cruise-detail tabs (VCX-10335).
          Shows the gross total collapsed by default; expands into a per-guest breakdown.
          Currency follows search criteria when available, else the principal's office currency. */}
      <BuildPanel
        cruise={cruise}
        airPricing={airPricing}
        extensions={extensions}
        choices={choices}
        guests={guests}
        currency={currency}
        promoCodes={promoCodes}
        onTppChange={(guestKey, included) => {
          if (cruiseId !== undefined) {
            cruiseWorkspaceStore.getState().setTravelProtection(cruiseId, guestKey, included);
          }
        }}
      />
    </section>
  );
}
