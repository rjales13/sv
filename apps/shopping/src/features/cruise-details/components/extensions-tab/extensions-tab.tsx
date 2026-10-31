import { Alert, AlertDescription } from '@vikings/ui/components/alert';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@vikings/ui/components/empty';
import { Spinner } from '@vikings/ui/components/spinner';
import { useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router';
import { useStore } from 'zustand';
import { useCruiseRoute } from '@/app/routing/use-cruise-route.tsx';
import { VAlert } from '@/shared/components/alert';
import { cruiseWorkspaceStore } from '@/store/cruise-workspace.store.ts';
import type { CruiseDetailsOutletContext } from '../../container.tsx';
import { toExtensionCardModel } from '../../lib/extensions-view-model.ts';
import { useCruiseExtensions } from '../../lib/use-cruise-extensions.ts';
import { ExtensionsCard } from '../extensions-card/index.ts';

// Extensions tab content.
//
// Layout (ShoppingApp_UX-VD, node 2222:434593 "01-CruiseDetails-Extensions"):
//   - Dismissible info alert: per-person DOUBLE occupancy pricing notice (R3)
//   - If land package: land package section with "Included" badge, no checkbox (R4)
//   - If land package: "Additional Extensions" heading (R5)
//   - Optional extensions sorted PRE → PRE STOPOVER → POST (R5.6) — ordered by the ADAPTER
//     now, not here, so the card list and the Build Panel cannot order them differently
//
// Selections are persisted in the workspace store (source of truth) and mirrored
// to the URL (?extsel=070,05A) as a secondary sync. On tab remount the URL is cleared
// by CruiseDetailsTabs navigation, so the component reads from the store instead
// (same pattern as Staterooms and Viking Air tabs).
// Alert dismissal is local state — it resets on reload, and dismissing never affects selections.

const URL_PARAM = 'extsel';
const EMPTY_IDS: string[] = [];

export function ExtensionsTab() {
  const { cruise, principal } = useOutletContext<CruiseDetailsOutletContext>();
  const { cruiseId } = useCruiseRoute();

  const currency = cruise.categories[0]?.currency ?? 'USD';
  // Extensions come through the typed port; the Build Panel reads the SAME query, so the card
  // list and the footer total cannot disagree (ADR-0016 § 5).
  const { offering, isPending, errorMessage } = useCruiseExtensions(cruiseId, principal, currency);
  const currencyLabel = currency === 'USD' ? 'US Dollar (USD)' : currency;

  const [alertDismissed, setAlertDismissed] = useState(false);

  // URL param is secondary — written on every toggle for deep-link compat, but NOT read back
  // on mount. The store is the durable source of truth so tab navigation doesn't clear selections.
  const [, setSearchParams] = useSearchParams();

  // Read selections from the store so they survive tab navigation (URL params are cleared
  // by CruiseDetailsTabs NavLink navigation; the store is not).
  const storeExtensionIds = useStore(cruiseWorkspaceStore, (s) =>
    cruiseId !== undefined ? (s.byCruise[cruiseId]?.extensionIds ?? EMPTY_IDS) : EMPTY_IDS,
  );

  // Already ordered by the adapter (R5.6) — sorting is the mapper's job now, not the view's.
  const extensions = offering?.extensions ?? [];

  // Keyed by EVO's invcode rather than by array position. The index was fragile: reordering
  // the list silently reassigned every selection to a different extension.
  const selectedSet = new Set(storeExtensionIds);

  function toggleExtension(code: string) {
    if (cruiseId === undefined) return;
    // Write to the store (source of truth — drives re-render via useStore above).
    cruiseWorkspaceStore.getState().toggleExtension(cruiseId, code);
    // Mirror to the URL for deep-link compat; read the updated store state synchronously.
    const newIds = cruiseWorkspaceStore.getState().byCruise[cruiseId]?.extensionIds ?? [];
    setSearchParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        if (newIds.length === 0) {
          updated.delete(URL_PARAM);
        } else {
          updated.set(URL_PARAM, [...newIds].sort().join(','));
        }
        return updated;
      },
      { replace: true },
    );
  }

  if (isPending) {
    return (
      <div
        role="status"
        aria-busy="true"
        data-testid="extensions-tab-loading"
        className="flex flex-col items-center justify-center gap-4 py-16"
      >
        <Spinner className="size-11" aria-hidden="true" />
        <span className="text-base font-semibold leading-snug text-center text-ink-disabled">
          Loading extensions
        </span>
      </div>
    );
  }

  if (errorMessage !== undefined) {
    return (
      <Alert variant="error" data-testid="extensions-tab-error">
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  if (offering === undefined) {
    return (
      <Empty data-testid="extensions-tab-empty">
        <EmptyHeader>
          <EmptyTitle>No extensions available</EmptyTitle>
          <EmptyDescription>This sailing offers no extensions.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const landPackage = offering.landPackage;
  const hasLandPackage = landPackage !== undefined;

  return (
    <div className="flex flex-col gap-3" data-testid="extensions-tab">
      {!alertDismissed && (
        <VAlert
          variant="info"
          emphasis="subtle"
          onDismiss={() => setAlertDismissed(true)}
          description={`Showing price per person for DOUBLE occupancy in ${currencyLabel}.`}
        />
      )}

      {landPackage !== undefined && (
        <ExtensionsCard
          {...toExtensionCardModel(landPackage)}
          included
          checked={false}
          data-testid="extensions-land-package"
        />
      )}

      {hasLandPackage && extensions.length > 0 && (
        <h3 className="text-label-lg font-semibold text-fjord">Additional Extensions</h3>
      )}

      <div className="flex flex-col gap-3">
        {extensions.map((ext) => (
          <ExtensionsCard
            key={ext.code}
            {...toExtensionCardModel(ext)}
            checked={selectedSet.has(ext.code)}
            onCheckedChange={() => toggleExtension(ext.code)}
          />
        ))}
      </div>
    </div>
  );
}
