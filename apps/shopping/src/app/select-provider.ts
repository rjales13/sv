import {
  createIlClient,
  makeHttpAirCityPricingAdapter,
  makeHttpCruiseSearchAdapter,
  makeHttpStateroomAvailabilityAdapter,
  makeIlAgentProfileAdapter,
  makeIlContactProfileAdapter,
  makeIlCruiseSearchAdapter,
  makeIlSearchCatalogsAdapter,
  makeMockAgentProfileAdapter,
  makeMockAirCityPricingAdapter,
  makeMockContactProfileAdapter,
  makeMockCruiseExtensionsAdapter,
  makeMockCruiseSearchAdapter,
  makeMockSearchCatalogsAdapter,
  makeMockStateroomAvailabilityAdapter,
  makeMockVoyageItineraryAdapter,
} from '@vikings/adapters';
import type {
  AgentProfileProvider,
  AirCityPricingProvider,
  ContactProfileProvider,
  CruiseExtensionsProvider,
  CruiseSearchProvider,
  SearchCatalogsProvider,
  StateroomAvailabilityProvider,
  VoyageItineraryProvider,
} from '@vikings/contracts';
import type { AccessTokenOptions, AuthProvider } from '@vikings/platform';
import type { AuthMode } from './auth-mode.ts';
import { type CrmSource, resolveIlScope } from './crm-source.ts';

// FR6.2 / ADR-006 enforcement point (1 of 2). Adapter SELECTION lives only in the composition
// root: this module and app-composition-root.tsx are the sole modules permitted to import a
// concrete `@vikings/adapters` implementation. Feature/UI/library code depends on the
// `CruiseSearchProvider` port alone, so swapping the mock for the real HTTP adapter never
// touches a line of feature code — it changes only the branch below.

/**
 * The provider implementations selectable by env/config. `il` applies to the cruise search
 * and its catalogs only (VCX-10507); every other port treats it like `mock`.
 */
export type CruiseProviderKind = 'mock' | 'http' | 'il';

export interface ProviderEnv {
  readonly kind?: string | undefined;
  readonly evoBaseUrl?: string | undefined;
  readonly evoApiKey?: string | undefined;
  readonly evoClientId?: string | undefined;
  /** True when MSW is intercepting — dev only. See `mocksIntercepting` below. */
  readonly mocksIntercepting?: boolean | undefined;
  /** Explicit opt-in to calling the real EVO endpoints. */
  readonly allowRealEndpoints?: boolean | undefined;
}

/**
 * Builds the EVO auth strategy (ADR-0008).
 *
 * ⚠️ The real scheme is unreconciled: the documented endpoints want `client-id` + `x-api-key`,
 * while the kickoff brief expects the agent's Entra session token to be reused. Whichever
 * wins, **it cannot arrive through a `VITE_` variable** — those are inlined into the public
 * bundle. This reads one only because the prototype talks to MSW, never to EVO. In October
 * the token comes from the platform auth seam or a server-side hop, and only this function
 * changes.
 *
 * Fails closed: a missing key rejects rather than sending an unauthenticated request, which
 * the adapter surfaces as `denied`.
 */
function makeEvoAuthHeaders(env: ProviderEnv): () => Promise<Record<string, string>> {
  return () => {
    const apiKey = env.evoApiKey ?? '';
    if (apiKey === '') {
      return Promise.reject(
        new Error('VITE_EVO_API_KEY is not set; refusing to call EVO unauthenticated.'),
      );
    }
    return Promise.resolve({ 'client-id': env.evoClientId ?? 'crmshop', 'x-api-key': apiKey });
  };
}

/**
 * Validates the env for an `http` selection and returns the EVO origin.
 *
 * Shared by every port's selector so a new one cannot be added WITHOUT the network guard —
 * which is the failure mode that matters here: the guard is invisible at compile time, and
 * omitting it would let one port quietly reach Viking infrastructure while the rest stay
 * mocked.
 */
function resolveEvoBaseUrl(env: ProviderEnv, portName: string): string {
  const baseUrl = env.evoBaseUrl ?? '';
  if (baseUrl === '') {
    throw new Error(
      'VITE_CRUISE_PROVIDER=http requires VITE_EVO_BASE_URL. ' +
        'Set it, or use VITE_CRUISE_PROVIDER=mock for the in-process fixture adapter.',
    );
  }

  // AGENTS.md § 1: "A clean checkout runs end to end with no credentials and no cloud
  // access — keep it that way." VITE_EVO_BASE_URL points at a REAL Viking host, and MSW only
  // intercepts in dev — so `vite preview` (or any production build) with the http provider
  // would send live requests carrying a placeholder key. Refuse unless someone has said, in
  // so many words, that they mean to reach the real thing.
  if (env.mocksIntercepting !== true && env.allowRealEndpoints !== true) {
    throw new Error(
      `Refusing to use the http ${portName} adapter against real endpoints: MSW is not ` +
        'intercepting (it starts in dev only). Run `pnpm dev`, switch to ' +
        'VITE_CRUISE_PROVIDER=mock, or set VITE_ALLOW_REAL_EVO=true if you genuinely intend ' +
        'to call Viking infrastructure.',
    );
  }

  return baseUrl;
}

/**
 * Resolves the `CruiseSearchProvider` for this run from env/config.
 *
 * `mock` is the in-process fixture adapter; `http` is the real EVO-backed adapter, which in
 * this increment runs against MSW-served wire payloads rather than a live endpoint. Both sit
 * behind the same port and pass the same conformance suite, so the choice is a deployment
 * detail. An omitted/unknown value falls back to `mock` so a local run always works.
 */
export function selectCruiseSearchProvider(env: ProviderEnv = {}): CruiseSearchProvider {
  if (env.kind !== 'http') return makeMockCruiseSearchAdapter();
  return makeHttpCruiseSearchAdapter({
    baseUrl: resolveEvoBaseUrl(env, 'cruise-search'),
    authHeaders: makeEvoAuthHeaders(env),
  });
}

/** The cruise search and the lists its form offers — selected together, see below. */
export interface SearchProviders {
  cruiseSearch: CruiseSearchProvider;
  searchCatalogs: SearchCatalogsProvider;
}

export interface SearchProviderEnv extends ProviderEnv {
  /** Required for `il` unless `authMode` is `easy-auth`; see `ilCredential`. */
  readonly ilScope?: string | undefined;
  /** Required for `il`: supplies the credential every integration-layer call carries. */
  readonly auth?: AuthProvider | undefined;
  /** Defaults to `mock`. */
  readonly authMode?: AuthMode | undefined;
}

/**
 * How the integration-layer client gets its credential from the auth seam. Its outcome is
 * structurally the client's `IlAccessToken`, so it is passed through as is.
 *
 * With Easy Auth the session cookie is the credential and the browser requests no token, so no
 * scope is needed (ADR-0021). Otherwise the token is requested for the IL's scope, which is
 * required: without it no token can be requested, so this fails at startup, not on a call.
 */
function ilCredential(
  auth: AuthProvider,
  authMode: AuthMode | undefined,
  rawScope: string | undefined,
) {
  const scopes = authMode === 'easy-auth' ? [] : [resolveIlScope(rawScope)];
  return (options: AccessTokenOptions) => auth.getAccessToken(scopes, options);
}

/**
 * Resolves the cruise search and its catalogs for this run (VCX-10507).
 *
 * Selected as a pair because with `il` they are one integration: both read the integration
 * layer through ONE client, so they share the token handling and the 401 retry — the same
 * wiring as the CRM context.
 *
 * Otherwise the search follows `selectCruiseSearchProvider` (mock or direct EVO) and the
 * catalogs are the mock lists the form shipped with. Those have no simulated delay: the
 * think-time exists to show a search's loading state, and here it would only open the form
 * with empty dropdowns.
 */
export function selectSearchProviders(env: SearchProviderEnv): SearchProviders {
  if (env.kind !== 'il') {
    return {
      cruiseSearch: selectCruiseSearchProvider(env),
      searchCatalogs: makeMockSearchCatalogsAdapter({ delayMs: 0 }),
    };
  }
  const { auth } = env;
  if (auth === undefined) {
    throw new Error('VITE_CRUISE_PROVIDER=il needs the auth seam to get integration-layer tokens.');
  }
  const client = createIlClient({
    getAccessToken: ilCredential(auth, env.authMode, env.ilScope),
  });
  return {
    cruiseSearch: makeIlCruiseSearchAdapter({ client }),
    searchCatalogs: makeIlSearchCatalogsAdapter({ client }),
  };
}

/**
 * Resolves the `AirCityPricingProvider` for this run (ADR-0016 § 3).
 *
 * Selected independently of the search provider, which is the property the single-provider
 * design could not express: air can go real while the rest stays mocked. Today both read the
 * same `kind`, but they are separate functions precisely so that can change without a
 * redesign.
 */
export function selectAirCityPricingProvider(env: ProviderEnv = {}): AirCityPricingProvider {
  if (env.kind !== 'http') return makeMockAirCityPricingAdapter();
  return makeHttpAirCityPricingAdapter({
    baseUrl: resolveEvoBaseUrl(env, 'air-pricing'),
    authHeaders: makeEvoAuthHeaders(env),
  });
}

/**
 * Resolves the `VoyageItineraryProvider` for this run (ADR-0016 § 3).
 *
 * **Always the mock, even with `kind: 'http'`** — and that is deliberate, not an oversight.
 * This operation's endpoint is undocumented (AGENTS.md § 10 item 7); the MSW harness binds an
 * inferred route so the tab can be built, but shipping a real client against a guessed URL
 * would turn that inference into a fact nobody remembers questioning. The http adapter gets
 * written when Viking supplies the route.
 */
export function selectVoyageItineraryProvider(_env: ProviderEnv = {}): VoyageItineraryProvider {
  return makeMockVoyageItineraryAdapter();
}

/**
 * Resolves the `StateroomAvailabilityProvider` for this run (ADR-0016 § 3).
 *
 * Unlike the itinerary, this operation's transport IS documented — a GET at
 * `core.qa.ninerealms.tech`, a different origin from the APIM gateway the two POST
 * operations use — so a real http adapter exists and `kind: 'http'` selects it.
 */
export function selectStateroomAvailabilityProvider(
  env: ProviderEnv = {},
): StateroomAvailabilityProvider {
  if (env.kind !== 'http') return makeMockStateroomAvailabilityAdapter();
  return makeHttpStateroomAvailabilityAdapter({
    baseUrl: resolveEvoBaseUrl(env, 'stateroom-availability'),
    authHeaders: makeEvoAuthHeaders(env),
  });
}

/**
 * Resolves the `CruiseExtensionsProvider` for this run (ADR-0016 § 3).
 *
 * **Always the mock**, like the itinerary and for a stronger reason: this operation has no
 * documented route AND no documented payload — the corpus describes it as a Power Automate
 * flow, not a REST call (AGENTS.md § 10 item 8). There is nothing to write an http adapter
 * against.
 */
export function selectCruiseExtensionsProvider(_env: ProviderEnv = {}): CruiseExtensionsProvider {
  return makeMockCruiseExtensionsAdapter();
}

/** The CRM-context ports the host shell loads its session through (ADR-0019). */
export interface CrmProviders {
  agentProfile: AgentProfileProvider;
  contactProfile: ContactProfileProvider;
}

export interface CrmProviderEnv {
  readonly source: CrmSource;
  /** Required for the `il` source unless `authMode` is `easy-auth`; see `ilCredential`. */
  readonly ilScope: string | undefined;
  /** Supplies the credential every integration-layer call carries. */
  readonly auth: AuthProvider;
  /** Defaults to `mock`. */
  readonly authMode?: AuthMode | undefined;
}

/**
 * Resolves the CRM-context ports for this run (ADR-0019).
 *
 * `il` builds ONE integration-layer client and shares it, so both ports get the same
 * credential handling and retry (see `ilCredential`).
 *
 * The mocks have no simulated delay: the demo think-time exists to show a feature's loading
 * state, and here it would only hold the whole app on "Signing you in…".
 */
export function selectCrmProviders(env: CrmProviderEnv): CrmProviders {
  if (env.source === 'mock') {
    return {
      agentProfile: makeMockAgentProfileAdapter({ delayMs: 0 }),
      contactProfile: makeMockContactProfileAdapter({ delayMs: 0 }),
    };
  }
  const client = createIlClient({
    getAccessToken: ilCredential(env.auth, env.authMode, env.ilScope),
  });
  return {
    agentProfile: makeIlAgentProfileAdapter({ client }),
    contactProfile: makeIlContactProfileAdapter({ client }),
  };
}
