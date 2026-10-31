import { MOCK_SEARCH_CATALOGS } from '@vikings/adapters';
import { sampleCruiseSearchRequest } from '@vikings/contracts/conformance';
import { type AccessTokenOptions, createAuthProvider } from '@vikings/platform';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectSearchProviders } from './select-provider.ts';

// The search half of ADR-006's selection point (VCX-10507). With `il`, the cruise search and
// the form's catalogs both read the integration layer through ONE shared client whose token
// comes from the auth seam — the same wiring as the CRM context, so a wrong scope shows up
// here and not as a 401 from a deployed IL.

const SCOPE = 'api://integration-layer/access_as_user';
const CATALOGS_REQUEST = {
  requestId: sampleCruiseSearchRequest.requestId,
  principal: sampleCruiseSearchRequest.principal,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('selectSearchProviders', () => {
  it('serves the mock catalogs, with no delay, when nothing is configured', async () => {
    const { searchCatalogs } = selectSearchProviders({});
    const started = Date.now();
    const result = await searchCatalogs.getCatalogs(CATALOGS_REQUEST);
    expect(result).toEqual({ status: 'ok', catalogs: MOCK_SEARCH_CATALOGS });
    // The form opens with its lists filled, as it did when they were constants.
    expect(Date.now() - started).toBeLessThan(500);
  });

  it('keeps the direct-EVO search behind `http`, with the mock catalogs beside it', () => {
    expect(() => selectSearchProviders({ kind: 'http' })).toThrow(/VITE_EVO_BASE_URL/);
  });

  it('refuses `il` without a scope, before anything is called', () => {
    expect(() =>
      selectSearchProviders({ kind: 'il', ilScope: undefined, auth: createAuthProvider() }),
    ).toThrow(/VITE_IL_SCOPE/);
  });

  it('refuses `il` without the auth seam, which every call needs a token from', () => {
    expect(() => selectSearchProviders({ kind: 'il', ilScope: SCOPE })).toThrow(/auth/i);
  });

  it('needs no scope with easy-auth, since the session cookie is the credential', async () => {
    const auth = createAuthProvider();
    const getAccessToken = vi
      .spyOn(auth, 'getAccessToken')
      .mockResolvedValue({ status: 'session' });
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify(IL_CATALOGS)));
    vi.stubGlobal('fetch', fetchSpy);

    const { searchCatalogs } = selectSearchProviders({ kind: 'il', auth, authMode: 'easy-auth' });
    const result = await searchCatalogs.getCatalogs(CATALOGS_REQUEST);

    expect(result.status).toBe('ok');
    expect(getAccessToken).toHaveBeenCalledWith([], { forceRefresh: false });
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it('reads the catalogs from the integration layer with a token for the configured scope', async () => {
    const auth = createAuthProvider({ accessToken: 'token-for-il' });
    const getAccessToken = vi.spyOn(auth, 'getAccessToken');
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify(IL_CATALOGS)));
    vi.stubGlobal('fetch', fetchSpy);

    const { searchCatalogs } = selectSearchProviders({ kind: 'il', ilScope: SCOPE, auth });
    const result = await searchCatalogs.getCatalogs(CATALOGS_REQUEST);

    expect(result.status).toBe('ok');
    const options: AccessTokenOptions = { forceRefresh: false };
    expect(getAccessToken).toHaveBeenCalledWith([SCOPE], options);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/crm/catalogs');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer token-for-il');
  });

  it('runs the cruise search as the two integration-layer calls', async () => {
    const fetchSpy = vi.fn(async (url: string) =>
      url === '/api/evo/enhanced-cruise'
        ? new Response(JSON.stringify({ cruiseCodes: [], dateRangeTooBroad: false }))
        : new Response('unexpected', { status: 500 }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const { cruiseSearch } = selectSearchProviders({
      kind: 'il',
      ilScope: SCOPE,
      auth: createAuthProvider(),
    });

    expect(await cruiseSearch.search(sampleCruiseSearchRequest)).toEqual({ status: 'empty' });
    expect((fetchSpy.mock.calls[0] as unknown as [string])[0]).toBe('/api/evo/enhanced-cruise');
  });
});

const IL_CATALOGS = {
  scopes: ['All'],
  products: [{ product: 'River', brands: ['River'] }],
  countries: [],
  ships: [],
  cruiseIds: [],
  itineraryNames: [],
  ports: [],
  portCities: [{ code: 'LXR', name: 'Luxor' }],
  hotelCities: [],
  marketSegments: [],
  cabinClasses: [],
  currencies: [{ office: 'US', currency: 'USD' }],
  promos: [],
};
