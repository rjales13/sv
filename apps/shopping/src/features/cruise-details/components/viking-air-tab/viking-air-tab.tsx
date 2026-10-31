import type { AirCityPricing } from '@vikings/contracts';
import { Alert, AlertDescription } from '@vikings/ui/components/alert';
import { Button } from '@vikings/ui/components/button';
import { Spinner } from '@vikings/ui/components/spinner';
import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router';
import { useStore } from 'zustand';
import { useCruiseRoute } from '@/app/routing/use-cruise-route.tsx';
import {
  VikingAirGuestCard,
  type VikingAirGuestCardSelection,
} from '@/features/cruise-details/components/viking-air-guest-card';
import type { VikingAirSummaryProps } from '@/features/cruise-details/components/viking-air-summary';
import { useAirCityPricing } from '@/features/cruise-details/lib/use-air-city-pricing.ts';
import { PROTOTYPE_GUESTS } from '@/features/cruise-details/lib/viking-air-fixtures';
import {
  type AirPriceBreakdown,
  priceSelection,
  toClassOptions,
  toGatewayOptions,
} from '@/features/cruise-details/lib/viking-air-pricing.ts';
import { cruiseWorkspaceStore, type GuestAirChoice } from '@/store/cruise-workspace.store.ts';
import type { CruiseDetailsOutletContext } from '../../container.tsx';

// Viking Air tab content.
//
// Layout (ShoppingApp_UX-VD, node 2222:437019 "01-CruiseDetails-Viking Air"):
//   - One VikingAirGuestCard per guest (two guests in the prototype).
//   - Guest 1 shows the "Use the same information for Guest 2" checkbox.
//   - When the copy checkbox is on, Guest 2 inherits Guest 1's selections.
//
// R3: Air selection is gated on a cabin category being chosen in Staterooms
//     (?cat= URL param). A dismissible warning banner renders while gated, and
//     every control stays disabled until a category is picked.
//
// R5: The airfare summary shows a brief calculating state on every selection change. Pricing
//     itself is a local lookup — EVO hands over the whole gateway table in one call — so this
//     is deliberate FEEDBACK, not simulated latency: without it a selection change repaints
//     the total instantly and silently, and an agent cannot tell the card reacted at all.
//     Named PRICING_FEEDBACK_MS rather than a mock-delay constant so nobody mistakes it for a
//     stand-in that October removes.
//
// R6: Priced airfare totals are pushed to the workspace store so the footer's
//     gross total reflects them in real time.

interface GuestState {
  includeAirfare: boolean;
  selection: VikingAirGuestCardSelection;
  summary: VikingAirSummaryProps;
}

const DEFAULT_GUEST_STATE: GuestState = {
  includeAirfare: true,
  selection: {},
  summary: { variant: 'empty' },
};

/** Restores the selection a guest had before the agent navigated away. */
function toSelection(airChoice: GuestAirChoice): VikingAirGuestCardSelection {
  return {
    ...(airChoice.originGateway !== undefined && { originGateway: airChoice.originGateway }),
    ...(airChoice.returnGateway !== undefined && { returnGateway: airChoice.returnGateway }),
    ...(airChoice.originClass !== undefined && { originClass: airChoice.originClass }),
    ...(airChoice.returnClass !== undefined && { returnClass: airChoice.returnClass }),
  };
}

/**
 * Restores GuestState from a persisted store air choice.
 *
 * The summary starts 'empty' and is filled by the pricing effect once the payload has loaded.
 * It cannot be restored here because pricing now depends on data this function does not have —
 * which is the point: a price is a fact about the cruise's fares, not about the selection alone.
 */
function restoreGuestState(airChoice: GuestAirChoice | undefined): GuestState {
  if (airChoice === undefined) return DEFAULT_GUEST_STATE;
  return {
    includeAirfare: airChoice.includeAirfare,
    selection: toSelection(airChoice),
    summary: airChoice.includeAirfare ? { variant: 'empty' } : { variant: 'no-air' },
  };
}

/**
 * How long the summary shows "calculating" after a selection change.
 *
 * A UX choice, not a fake round trip — see R5 above. Short enough to feel responsive, long
 * enough to register.
 */
const PRICING_FEEDBACK_MS = 600;

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

/** Builds the summary card props from a priced breakdown. */
function toSummary(priced: AirPriceBreakdown, currency: string): VikingAirSummaryProps {
  return {
    variant: 'summarized',
    airfare: formatMoney(priced.advertised, currency),
    discount: formatMoney(priced.discount, currency),
    total: formatMoney(priced.net, currency),
  };
}

/** Re-prices an existing guest state against a payload that has just arrived. */
function repriced(prev: GuestState, pricing: AirCityPricing, currency: string): GuestState {
  if (!prev.includeAirfare) return prev;
  const priced = priceSelection(pricing, prev.selection);
  if (priced === undefined) return prev;
  return { ...prev, summary: toSummary(priced, currency) };
}

export function VikingAirTab() {
  const { cruiseId } = useCruiseRoute();
  const { principal } = useOutletContext<CruiseDetailsOutletContext>();
  const currency = useStore(cruiseWorkspaceStore, (s) => {
    const raw = s.searchCriteria as { currency?: string } | null;
    return raw?.currency ?? principal.officeCurrency;
  });

  // Fares, gateways and classes all come from the cruise's own payload through the typed port
  // (ADR-0016 § 5) — the tab no longer owns any air data of its own.
  const { pricing, isPending, errorMessage } = useAirCityPricing(cruiseId, principal, currency);

  // Gate air selection on a cabin category being chosen in Staterooms (R3).
  // The store is used (not ?cat= URL param) because tab navigation clears search params.
  const hasCabinCategory = useStore(cruiseWorkspaceStore, (s) =>
    cruiseId !== undefined ? s.byCruise[cruiseId]?.stateroom !== undefined : false,
  );

  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Reset dismissal whenever the gate opens again (category cleared).
  useEffect(() => {
    if (hasCabinCategory) setBannerDismissed(false);
  }, [hasCabinCategory]);

  // Restore selections from store so tab navigation preserves choices (and the Build Panel
  // does not lose air line items when the agent switches tabs and returns).
  const [guest1, setGuest1] = useState<GuestState>(() => {
    const air =
      cruiseId !== undefined ? cruiseWorkspaceStore.getState().byCruise[cruiseId]?.air : undefined;
    return restoreGuestState(air?.['G1']);
  });
  const [guest2, setGuest2] = useState<GuestState>(() => {
    const air =
      cruiseId !== undefined ? cruiseWorkspaceStore.getState().byCruise[cruiseId]?.air : undefined;
    return restoreGuestState(air?.['G2']);
  });
  const [copyToGuest2, setCopyToGuest2] = useState(true);

  const [g1, g2] = PROTOTYPE_GUESTS;

  // Cruise Only first, then this cruise's own gateways and classes. Memoised because the
  // payload is ~570 rows and both lists deduplicate across it on every render otherwise.
  const gatewayOptions = useMemo(
    () => (pricing === undefined ? [] : toGatewayOptions(pricing)),
    [pricing],
  );
  const classOptions = useMemo(
    () => (pricing === undefined ? [] : toClassOptions(pricing)),
    [pricing],
  );

  // Re-price whenever the payload arrives, so a selection restored from the store (which the
  // lazy initialiser cannot price, having no fares yet) fills in its summary.
  useEffect(() => {
    if (pricing === undefined) return;
    setGuest1((prev) => repriced(prev, pricing, currency));
    setGuest2((prev) => repriced(prev, pricing, currency));
  }, [pricing, currency]);

  // Push combined airfare total to the store whenever pricing changes.
  useEffect(() => {
    if (cruiseId === undefined || pricing === undefined) return;
    const total = [guest1, guest2].reduce((sum, guest) => {
      if (!guest.includeAirfare) return sum;
      return sum + (priceSelection(pricing, guest.selection)?.net ?? 0);
    }, 0);
    cruiseWorkspaceStore.getState().setAirfareTotal(cruiseId, total);
  }, [cruiseId, guest1, guest2, pricing]);

  // Push per-guest air choices to the store so the Build Panel can itemise them.
  // PROTOTYPE_GUESTS is a module-level constant; g1.id / g2.id never change.
  useEffect(() => {
    if (cruiseId === undefined) return;
    cruiseWorkspaceStore.getState().setGuestAir(cruiseId, 'G1', {
      includeAirfare: guest1.includeAirfare,
      ...(guest1.selection.originGateway !== undefined && {
        originGateway: guest1.selection.originGateway,
      }),
      ...(guest1.selection.returnGateway !== undefined && {
        returnGateway: guest1.selection.returnGateway,
      }),
      ...(guest1.selection.originClass !== undefined && {
        originClass: guest1.selection.originClass,
      }),
      ...(guest1.selection.returnClass !== undefined && {
        returnClass: guest1.selection.returnClass,
      }),
    });
  }, [cruiseId, guest1]);

  useEffect(() => {
    if (cruiseId === undefined) return;
    cruiseWorkspaceStore.getState().setGuestAir(cruiseId, 'G2', {
      includeAirfare: guest2.includeAirfare,
      ...(guest2.selection.originGateway !== undefined && {
        originGateway: guest2.selection.originGateway,
      }),
      ...(guest2.selection.returnGateway !== undefined && {
        returnGateway: guest2.selection.returnGateway,
      }),
      ...(guest2.selection.originClass !== undefined && {
        originClass: guest2.selection.originClass,
      }),
      ...(guest2.selection.returnClass !== undefined && {
        returnClass: guest2.selection.returnClass,
      }),
    });
  }, [cruiseId, guest2]);

  /** The summary a selection resolves to, once calculated. */
  const summaryFor = (
    includeAirfare: boolean,
    selection: VikingAirGuestCardSelection,
  ): VikingAirSummaryProps => {
    if (!includeAirfare) return { variant: 'no-air' };
    const priced = pricing === undefined ? undefined : priceSelection(pricing, selection);
    return priced === undefined ? { variant: 'empty' } : toSummary(priced, currency);
  };

  /**
   * Applies a selection, showing the calculating state first.
   *
   * The price is known synchronously; the pause exists so the card visibly reacts (R5). The
   * timer re-reads state on fire and only commits when the selection has not moved on, so a
   * fast agent cannot land an earlier price on a later selection.
   */
  const priceInto = (
    setState: React.Dispatch<React.SetStateAction<GuestState>>,
    next: (prev: GuestState) => { includeAirfare: boolean; selection: VikingAirGuestCardSelection },
  ) => {
    setState((prev) => {
      const { includeAirfare, selection } = next(prev);
      const settled = summaryFor(includeAirfare, selection);
      return {
        includeAirfare,
        selection,
        // Only the priceable case is worth a pause; an empty or no-air card has nothing to
        // calculate and should not flash a spinner.
        summary: settled.variant === 'summarized' ? { variant: 'loading' } : settled,
      };
    });

    setTimeout(() => {
      setState((prev) => {
        if (prev.summary.variant !== 'loading') return prev;
        return { ...prev, summary: summaryFor(prev.includeAirfare, prev.selection) };
      });
    }, PRICING_FEEDBACK_MS);
  };

  const handleGuest1AirfareChange = (includeAirfare: boolean) => {
    priceInto(setGuest1, (prev) => ({ includeAirfare, selection: prev.selection }));
    if (copyToGuest2) {
      priceInto(setGuest2, (prev) => ({ includeAirfare, selection: prev.selection }));
    }
  };

  const handleGuest1SelectionChange = (selection: VikingAirGuestCardSelection) => {
    priceInto(setGuest1, (prev) => ({ includeAirfare: prev.includeAirfare, selection }));
    if (copyToGuest2) {
      priceInto(setGuest2, (prev) => ({ includeAirfare: prev.includeAirfare, selection }));
    }
  };

  const handleGuest2SelectionChange = (selection: VikingAirGuestCardSelection) => {
    priceInto(setGuest2, (prev) => ({ includeAirfare: prev.includeAirfare, selection }));
  };

  const handleCopyChange = (checked: boolean) => {
    setCopyToGuest2(checked);
    if (checked) setGuest2(guest1);
  };

  const showBanner = !hasCabinCategory && !bannerDismissed;

  if (isPending) {
    return (
      <div
        role="status"
        aria-busy="true"
        data-testid="viking-air-loading"
        className="flex flex-col items-center justify-center gap-4 py-16"
      >
        <Spinner className="size-11" aria-hidden="true" />
        <span className="text-base font-semibold leading-snug text-center text-ink-disabled">
          Loading airfares
        </span>
      </div>
    );
  }

  if (errorMessage !== undefined) {
    return (
      <Alert variant="error" data-testid="viking-air-error">
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  // No payload and no error means EVO has no air offering for this sailing — a legitimate
  // answer (FR4 `empty`), not a failure, and the majority path for non-prototype cruises.
  if (pricing === undefined) {
    return (
      <Alert variant="info" data-testid="viking-air-empty">
        <AlertDescription>Viking Air is not offered on this sailing.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-[25px]" data-testid="viking-air-tab">
      {showBanner && (
        <Alert variant="warning" data-testid="viking-air-cabin-banner">
          <AlertDescription className="flex items-center justify-between">
            Please select a Cabin Category in Staterooms to enable Air Selection.
            <Button
              variant="ghost"
              size="sm"
              aria-label="Dismiss"
              onClick={() => setBannerDismissed(true)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <VikingAirGuestCard
        title={g1.title}
        guest={{ name: g1.name, customerNumber: g1.customerNumber }}
        includeAirfare={guest1.includeAirfare}
        onIncludeAirfareChange={handleGuest1AirfareChange}
        selection={guest1.selection}
        onSelectionChange={handleGuest1SelectionChange}
        gatewayOptions={gatewayOptions}
        classOptions={classOptions}
        disabled={!hasCabinCategory}
        summary={guest1.summary}
        copyToNextGuest={{
          label: `Use the same information for ${g2.title}`,
          checked: copyToGuest2,
          onCheckedChange: handleCopyChange,
        }}
      />
      <VikingAirGuestCard
        title={g2.title}
        guest={{ name: g2.name, customerNumber: g2.customerNumber }}
        includeAirfare={guest2.includeAirfare}
        onIncludeAirfareChange={(includeAirfare) =>
          priceInto(setGuest2, (prev) => ({ includeAirfare, selection: prev.selection }))
        }
        selection={guest2.selection}
        onSelectionChange={handleGuest2SelectionChange}
        gatewayOptions={gatewayOptions}
        classOptions={classOptions}
        disabled={!hasCabinCategory}
        summary={guest2.summary}
      />
    </div>
  );
}
