import type {
  AirCityPricing,
  CategoryPricingAvailability,
  crExtensions,
} from '@vas/contracts';
import { useState } from 'react';
import type { crChoices } from '@/store/cr-workspace.store.ts';
import { BuildPanelExpanded } from './components/expanded/index.ts';
import { PanelFooter } from './components/panel-footer/index.ts';
import { toBuildPanelModel } from './lib/build-panel-model.ts';

/*
  BuildPanel — the persistent bottom bar that lives in every cr-detail screen.

  Architecture:
    - Collapsed (default): PanelFooter renders the gross-total bar with action buttons.
    - Expanded: BuildPanelExpanded overlays the content above with a dimmed backdrop and
      the full per-guest price breakdown drawer.

  The component owns expand/collapse state only. All pricing derivation is in
  lib/build-panel-model.ts, which keeps this component a layout concern.

  The three action buttons are inert for the prototype (R5/AC). The variant is
  `direct-collapsed` / `direct` because the prototype has no TA mode — or `zero`, the
  footer's designed "no price yet" state, until a cabin is held.
*/

export interface BuildPanelProps {
  cr: CategoryPricingAvailability;
  /** The cr's air fares, so the footer prices air exactly as the VA Air tab does. */
  airPricing?: AirCityPricing | undefined;
  /** The cr's extension offering, so the footer prices them exactly as the tab does. */
  extensions?: crExtensions | undefined;
  choices: crChoices;
  guests: number;
  currency: string;
  promoCodes: readonly string[];
  /** Fired when the agent toggles TPP for a guest. Key is "guest-0", "guest-1", etc. */
  onTppChange?: (guestKey: string, included: boolean) => void;
  className?: string;
}

export function BuildPanel({
  cr,
  airPricing,
  extensions,
  choices,
  guests,
  currency,
  promoCodes,
  onTppChange,
  className,
}: BuildPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { isPriced, ...model } = toBuildPanelModel({
    cr,
    choices,
    guests,
    currency,
    promoCodes,
    airPricing,
    extensions,
  });

  // Wire TPP toggles back to the parent so the store can be updated.
  const guestsWithTppCallbacks = model.guests.map((guest, i) => {
    const tpp = guest.tpp;
    if (!tpp.eligible) return guest;
    return {
      ...guest,
      tpp: {
        ...tpp,
        onIncludedChange: (included: boolean) => {
          onTppChange?.(`guest-${i}`, included);
        },
      },
    };
  });

  if (isExpanded) {
    return (
      <>
        {/* Dimmed backdrop — overlays the content above the panel (R3.1). z-40 so it covers
            sticky page chrome (the cr tab bar is z-10), while staying under the drawer. */}
        <div
          aria-hidden="true"
          data-testid="build-panel-backdrop"
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsExpanded(false)}
        />
        {/* Expanded drawer — slides up from the bottom. */}
        <div
          data-testid="build-panel-drawer"
          className="fixed right-0 bottom-0 left-0 z-50 flex justify-center"
        >
          <BuildPanelExpanded
            {...model}
            guests={guestsWithTppCallbacks}
            onCollapse={() => setIsExpanded(false)}
            {...(className !== undefined && { className })}
          />
        </div>
      </>
    );
  }

  return (
    <PanelFooter
      variant={isPriced ? 'direct-collapsed' : 'zero'}
      grossTotal={model.grossTotal}
      currencyCode={model.currencyCode}
      onBreakdownToggle={() => setIsExpanded(true)}
      {...(className !== undefined && { className })}
    />
  );
}
