import { NavLink } from 'react-router';
import { CRUISE_TABS, type CruiseTab, cruiseTabPath } from '../../../app/routing/cruise-tabs.ts';

// The four-tab strip. These are TABS, not wizard steps: the approved frames carry no
// stepper, breadcrumb or progress affordance, and the agent moves between them in any order.
//
// Rendered as links rather than buttons because the URL owns which tab is active
// (ADR-0012) — which also gives middle-click, back/forward and deep links for free.

const TAB_LABELS: Readonly<Record<CruiseTab, string>> = {
  itinerary: 'Itinerary',
  stateroom: 'Staterooms',
  extensions: 'Extensions',
  air: 'Viking Air',
};

export function CruiseDetailsTabs({ cruiseId }: { cruiseId: string }) {
  return (
    <nav aria-label="Cruise details" data-testid="cruise-details-tabs">
      <ul className="flex justify-center gap-6 border-b border-subtle px-6">
        {CRUISE_TABS.map((tab) => (
          <li key={tab}>
            <NavLink
              to={cruiseTabPath(cruiseId, tab)}
              className={({ isActive }) =>
                `inline-block border-b-2 py-3 text-sm ${
                  isActive
                    ? 'border-fjord font-semibold text-fjord'
                    : 'border-transparent text-ink-secondary'
                }`
              }
            >
              {TAB_LABELS[tab]}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
