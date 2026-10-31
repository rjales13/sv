import { QueryClientProvider } from '@tanstack/react-query';
import {
  type AuthProvider,
  createUrlHostShell,
  type HostContext,
  type HostShell,
} from '@vikings/platform';
import { Alert, AlertDescription, AlertTitle } from '@vikings/ui/components/alert';
import { useEffect, useState } from 'react';
import { WorkspaceTabStrip } from '../features/cruise-workspace/index.ts';
import type { SailingWindow } from '../features/search/index.ts';
import { GuestContextBand } from '../host-shell/guest-context-band.tsx';
import { type AppEnvironment, resolveAppEnvironment } from './app-environment.ts';
import {
  type AuthMode,
  createAppAuthProvider,
  resolveAuthMode,
  resolveOfficeCurrency,
} from './auth-mode.ts';
import { type CrmSource, resolveCrmSource } from './crm-source.ts';
import { type AppProviders, ProvidersContext } from './data/providers-context.tsx';
import { createAppQueryClient } from './data/query-client.ts';
import { HostShellContext, useRouterNavigateTo } from './host/host-shell-context.tsx';
import { AppRoutes } from './routing/app-routes.tsx';
import {
  type CrmProviders,
  selectAirCityPricingProvider,
  selectCrmProviders,
  selectCruiseExtensionsProvider,
  selectSearchProviders,
  selectStateroomAvailabilityProvider,
  selectVoyageItineraryProvider,
} from './select-provider.ts';
import { loadCrmContext } from './session/load-crm-context.ts';
import { type Session, SessionContext } from './session/session-context.tsx';

// The composition root — the single FR6.2/ADR-006 wiring point (2 of 2, with select-provider).
// It boots the mocked host + auth seams (U4), authenticates for the principal, selects the
// concrete CruiseSearchProvider (the U5 mock this cycle), and mounts the U6 search controller
// with the injected provider + principal (NFR5). A denied auth outcome renders an accessible
// top-level denied state; any other bootstrap failure is surfaced, never swallowed.
//
// Every collaborator is injectable so the integration test drives the real wiring (defaults)
// or a deterministic variant (a denied auth provider, an error-simulating adapter) without
// touching env/config.

export interface AppCompositionRootProps {
  /** Overrides `VITE_APP_ENV`, so a test can boot as any environment without touching env. */
  environment?: AppEnvironment;
  hostShell?: HostShell;
  authProvider?: AuthProvider;
  /**
   * Override individual ports. Partial so a test replaces only the one it exercises and gets
   * the real selected adapter for the rest.
   */
  providers?: Partial<AppProviders>;
  /** Override the CRM-context ports the host shell loads at startup (ADR-0019). */
  crmProviders?: Partial<CrmProviders>;
  /** Overrides `VITE_CRM_SOURCE`, so a test can run the CRM context as if it came from the IL. */
  crmSource?: CrmSource;
}

// The async startup handshake resolves to one of these. Modeling the denied and error
// outcomes as values (not thrown exceptions) is what lets each branch render its own distinct,
// accessible state instead of collapsing into a generic crash.
type BootstrapState =
  | { status: 'loading' }
  | { status: 'ready'; session: Session; host: HostContext }
  | { status: 'denied'; code: 401 | 403; reason: string }
  | { status: 'error'; message: string };

interface ResolvedSeams {
  environment: AppEnvironment;
  host: HostShell;
  auth: AuthProvider;
  providers: AppProviders;
  crm: CrmProviders;
  crmSource: CrmSource;
}

/** How the IL client gets its credential: the auth mode plus the scope a token needs. */
interface IlAuth {
  auth: AuthProvider;
  authMode: AuthMode;
  ilScope: string | undefined;
}

/**
 * The host adapter the app runs on (VCX-10480): it reads the CRM launch from the app's own URL.
 * Framed by real CRM that is the launch D365 built; locally, the mock D365 shell forwards its
 * query string to the frame it loads, so the same adapter serves both.
 */
function createDefaultHostShell(navigateTo: (path: string) => void): HostShell {
  return createUrlHostShell({
    search: globalThis.location?.search ?? '',
    storage: tabStorage(),
    navigateTo,
  });
}

/**
 * The tab's sessionStorage, or null. Merely reading the property throws in some locked-down
 * browsers; losing it only costs restoring the launch after a reload.
 */
function tabStorage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolves the run's collaborators once. Defaults are the real seams/adapters; tests inject
 * deterministic variants. Constructing the mock adapters here eagerly parses the fixtures —
 * fast, and any failure surfaces immediately rather than on the first call.
 *
 * Each port is selected independently (ADR-0016 § 3), so air can be pointed at the real
 * endpoint while search stays mocked, or the reverse.
 */
function resolveSeams(
  {
    environment,
    hostShell,
    authProvider,
    providers,
    crmProviders,
    crmSource,
  }: AppCompositionRootProps,
  navigateTo: (path: string) => void,
): ResolvedSeams {
  const env = {
    kind: import.meta.env.VITE_CRUISE_PROVIDER,
    evoBaseUrl: import.meta.env.VITE_EVO_BASE_URL,
    evoApiKey: import.meta.env.VITE_EVO_API_KEY,
    evoClientId: import.meta.env.VITE_EVO_CLIENT_ID,
    // main.tsx starts MSW under exactly this condition; keep the two in step.
    mocksIntercepting: import.meta.env.DEV,
    allowRealEndpoints: import.meta.env.VITE_ALLOW_REAL_EVO === 'true',
  };
  // One instance: the CRM context requests its integration-layer credential from the same seam
  // the startup sequence authenticates with (VITE_AUTH, ADR-0021).
  const authMode = resolveAuthMode(import.meta.env.VITE_AUTH);
  const auth =
    authProvider ??
    createAppAuthProvider(
      authMode,
      resolveOfficeCurrency(import.meta.env.VITE_DEFAULT_OFFICE_CURRENCY),
    );
  const ilAuth: IlAuth = { auth, authMode, ilScope: import.meta.env.VITE_IL_SCOPE };
  const source = crmSource ?? resolveCrmSource(import.meta.env.VITE_CRM_SOURCE);
  // The search and its form's lists are one integration with `il` (VCX-10507), so they are
  // selected together and share one integration-layer client — see selectSearchProviders.
  const search = selectSearchProviders({ ...env, ...ilAuth });

  return {
    // Resolved here and nowhere else, so no feature can branch on where it runs. It does not
    // choose adapters: the cruise ports follow VITE_CRUISE_PROVIDER, and the CRM context
    // follows VITE_CRM_SOURCE, an explicit per-environment opt-in (see crm-source.ts).
    environment: environment ?? resolveAppEnvironment(import.meta.env.VITE_APP_ENV),
    host: hostShell ?? createDefaultHostShell(navigateTo),
    auth,
    providers: {
      cruiseSearch: providers?.cruiseSearch ?? search.cruiseSearch,
      searchCatalogs: providers?.searchCatalogs ?? search.searchCatalogs,
      airCityPricing: providers?.airCityPricing ?? selectAirCityPricingProvider(env),
      voyageItinerary: providers?.voyageItinerary ?? selectVoyageItineraryProvider(env),
      stateroomAvailability:
        providers?.stateroomAvailability ?? selectStateroomAvailabilityProvider(env),
      cruiseExtensions: providers?.cruiseExtensions ?? selectCruiseExtensionsProvider(env),
    },
    crm: resolveCrmProviders(source, crmProviders, ilAuth),
    crmSource: source,
  };
}

/**
 * The CRM-context ports. A port a test overrides is never built, so overriding both skips
 * building an IL client entirely — and with it the IL scope the `il` source would require.
 */
function resolveCrmProviders(
  source: CrmSource,
  overrides: Partial<CrmProviders> | undefined,
  ilAuth: IlAuth,
): CrmProviders {
  if (overrides?.agentProfile && overrides.contactProfile) {
    return { agentProfile: overrides.agentProfile, contactProfile: overrides.contactProfile };
  }
  return {
    ...selectCrmProviders({ source, ...ilAuth }),
    ...overrides,
  };
}

/**
 * The whole startup sequence: host context, then auth, then the CRM context (ADR-0019).
 * Denied and failed outcomes come back as values; only an unexpected failure throws.
 */
async function startSession(seams: ResolvedSeams): Promise<BootstrapState> {
  // getContext() Zod-parses the host payload and throws on a malformed one.
  const host = seams.host.getContext();
  const auth = await seams.auth.authenticate();
  if (auth.status === 'denied') {
    return { status: 'denied', code: auth.code, reason: auth.reason };
  }

  const crm = await loadCrmContext({
    agentProfile: seams.crm.agentProfile,
    contactProfile: seams.crm.contactProfile,
    principal: auth.principal,
    contactId: host.launch?.contactId,
    // Only a real agent can be compared with the launch. With mock CRM data the agent is a
    // placeholder, and every real CRM launch carries the real agent's userId, so checking
    // against the mock would deny every launch on an environment that still runs on mocks.
    launchUserId: seams.crmSource === 'il' ? host.launch?.userId : undefined,
    newRequestId: () => crypto.randomUUID(),
  });
  if (crm.status !== 'ready') return crm;

  return {
    status: 'ready',
    session: { principal: auth.principal, agent: crm.agent, contact: crm.contact },
    host,
  };
}

/**
 * Runs the host + auth handshake once and exposes the resulting bootstrap state. Kept as a hook
 * so the component body stays a thin "resolve seams -> bootstrap -> render" statement.
 */
function useBootstrap(seams: ResolvedSeams): BootstrapState {
  const [state, setState] = useState<BootstrapState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    async function bootstrap(): Promise<void> {
      try {
        const next = await startSession(seams);
        if (cancelled) return;
        setState(next);
      } catch (error) {
        if (cancelled) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to start the application.',
        });
      }
    }
    void bootstrap();
    // StrictMode double-mounts the effect in dev; cancelling here makes the first pass a no-op
    // so a superseded bootstrap can never setState after the component has moved on.
    return () => {
      cancelled = true;
    };
  }, [seams]);

  return state;
}

export function AppCompositionRoot(props: AppCompositionRootProps) {
  // Seams are resolved once (stable identity) so the bootstrap effect runs a single time.
  // The host adapter is created once, so it gets a stable handle on the router rather than
  // calling useNavigate itself.
  const navigateTo = useRouterNavigateTo();
  const [seams] = useState<ResolvedSeams>(() => resolveSeams(props, navigateTo));
  // One client per mount, created lazily: a module-level singleton would leak cached results
  // between tests and between remounts of the embedded app inside the Dynamics host.
  const [queryClient] = useState(createAppQueryClient);
  const state = useBootstrap(seams);

  // The Query client and the typed ports are supplied together: hooks reach data by calling
  // a port they read from context, never `fetch`, which is what keeps the adapter-boundary
  // rule intact once fetching moves into components (AGENTS.md invariant 1).
  return (
    <QueryClientProvider client={queryClient}>
      <HostShellContext value={seams.host}>
        <ProvidersContext value={seams.providers}>
          <BootstrapView state={state} environment={seams.environment} />
        </ProvidersContext>
      </HostShellContext>
    </QueryClientProvider>
  );
}

/**
 * The default sailing-date window, when config pins one.
 *
 * FR1.1's "today, plus two months" is right for live inventory but finds nothing in this
 * increment: the committed catavail fixture covers 2027-01-01 to 2027-11-24 (XPO Antarctic
 * Explorer), so a clock-relative window misses it today. Pinning the
 * window in config keeps the form's production behaviour intact while letting the demo open
 * on actual results. Unset (production) falls back to the FR1.1 default.
 */
function resolveSailingWindow(): SailingWindow | undefined {
  const from = import.meta.env.VITE_DEFAULT_SAILING_FROM;
  const to = import.meta.env.VITE_DEFAULT_SAILING_TO;
  return from !== undefined && to !== undefined ? { from, to } : undefined;
}

/** Routes each bootstrap outcome to its own accessible surface. */
function BootstrapView({
  state,
  environment,
}: {
  state: BootstrapState;
  environment: AppEnvironment;
}) {
  if (state.status === 'loading') {
    return (
      <div role="status" aria-busy="true" data-testid="auth-loading" className="p-6 text-ink">
        <span>Signing you in…</span>
      </div>
    );
  }
  if (state.status === 'denied') {
    return <DeniedState code={state.code} reason={state.reason} />;
  }
  if (state.status === 'error') {
    return <BootstrapError message={state.message} />;
  }
  // Authenticated: mount the search feature with the injected port + resolved principal (NFR5).
  // The host context drives the document language and a theme hook the real D365 host will own.
  // CustomerCard is at the very top (full width), then content below with padding
  const { session } = state;
  return (
    <SessionContext value={session}>
      <div
        lang={state.host.locale}
        data-host-theme={state.host.theme}
        // Lets support and E2E tell which environment a page belongs to from the DOM alone.
        data-app-env={environment}
        // Whether the CRM launch contact loaded, so a test or support can tell "unselected" apart
        // from a contact whose CRM record simply has no name (ADR-0019).
        data-crm-contact={session.contact.status}
        className="flex h-svh flex-col overflow-hidden"
      >
        {/* App chrome, not routes: both are present on every screen, in the order the frames
          show them — contact context above the cruise tab strip. */}
        <div className="shrink-0">
          <GuestContextBand contact={session.contact} />
        </div>
        <div className="shrink-0">
          <WorkspaceTabStrip />
        </div>
        {/* flex flex-col so each route element can use flex-1/min-h-0 to fill and
          manage its own scroll; overflow-hidden prevents the shell itself from scrolling. */}
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <AppRoutes
            principal={session.principal}
            sailingWindow={resolveSailingWindow()}
            agentOffice={session.agent.office}
          />
        </div>
      </div>
    </SessionContext>
  );
}

/** The NFR5 top-level denied gate: an assertive, screen-reader-announced banner. */
function DeniedState({ code, reason }: { code: 401 | 403; reason: string }) {
  return (
    <div className="p-6">
      <Alert variant="error" role="alert" data-testid="auth-denied">
        <AlertTitle>{code === 401 ? 'Sign-in required' : 'Access denied'}</AlertTitle>
        <AlertDescription>{reason}</AlertDescription>
      </Alert>
    </div>
  );
}

/** A failed bootstrap (e.g. a malformed host payload) surfaced instead of a blank screen. */
function BootstrapError({ message }: { message: string }) {
  return (
    <div className="p-6">
      <Alert variant="error" role="alert" data-testid="bootstrap-error">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}
