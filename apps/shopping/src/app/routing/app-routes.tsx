import type { AuthenticatedPrincipal } from '@vikings/platform';
import { Navigate, Route, Routes } from 'react-router';
import { ExtensionsTab } from '../../features/cruise-details/components/extensions-tab/index.ts';
import { ItineraryTab } from '../../features/cruise-details/components/itinerary-tab/index.ts';
import { StateroomsTab } from '../../features/cruise-details/components/staterooms-tab/index.ts';
import { VikingAirTab } from '../../features/cruise-details/components/viking-air-tab/index.ts';
import { CruiseDetailsContainer } from '../../features/cruise-details/index.ts';
import { CruiseSearchController, type SailingWindow } from '../../features/search/index.ts';
import { DEFAULT_CRUISE_TAB } from './cruise-tabs.ts';

// The app's route table (ADR-0012).
//
// It renders INSIDE the authenticated shell rather than around it, so every route has a
// resolved principal and no route can be reached before the denied gate has run. The URL
// owns which cruise and tab are in view, which is what makes deep links, reload and the
// browser back button work without extra machinery.
//
// Each cruise-details TAB mounts as a child of the cruise route: the container supplies the
// header, tab strip and footer, and the tab's own story fills the <Outlet/>.
//
// Note no `provider` is threaded through here: every screen reaches the port through Query,
// which reads it from the composition root's context. That context is the single injection
// point (ADR-006), so prop-drilling it as well would be a second one.

export interface AppRoutesProps {
  principal: AuthenticatedPrincipal;
  sailingWindow?: SailingWindow | undefined;
  /** The signed-in agent's CRM office, from the session; the search currency defaults from it. */
  agentOffice?: string | undefined;
}

export function AppRoutes({ principal, sailingWindow, agentOffice }: AppRoutesProps) {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <CruiseSearchController
            principal={principal}
            sailingWindow={sailingWindow}
            agentOffice={agentOffice}
          />
        }
      />
      {/* Nested on purpose: the container renders the shell and an <Outlet/>, and each tab's
          own story mounts as a child here. A leaf route would leave that slot unfillable. */}
      <Route path="/cruise/:cruiseId" element={<CruiseDetailsContainer principal={principal} />}>
        {/* A bare cruise link lands on the first tab rather than a blank shell. */}
        <Route index element={<Navigate to={DEFAULT_CRUISE_TAB} replace />} />
        <Route path="itinerary" element={<ItineraryTab />} />
        <Route path="stateroom" element={<StateroomsTab />} />
        <Route path="extensions" element={<ExtensionsTab />} />
        <Route path="air" element={<VikingAirTab />} />
        <Route path=":tab" element={null} />
      </Route>
      {/* Any unknown path returns to search — the agent keeps working. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
