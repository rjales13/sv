import { MOCK_AGENT } from '@vikings/adapters';
import { type AccessTokenOptions, createAuthProvider } from '@vikings/platform';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectCrmProviders } from './select-provider.ts';

// The CRM-context half of ADR-006's selection point (ADR-0019). With `il`, both ports read the
// integration layer through one shared client whose token comes from the auth seam — so this
// is also where the IL scope meets `getAccessToken`, and a wrong wiring would only show up as
// a 401 from a deployed IL.

const SCOPE = 'api://integration-layer/access_as_user';
const REQUEST = {
  requestId: 'r-1',
  principal: { principalId: 'p-1', officeCurrency: 'USD', authorizationScopes: [] },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('selectCrmProviders', () => {
  it('serves the mock CRM context for the mock source', async () => {
    const crm = selectCrmProviders({
      source: 'mock',
      ilScope: undefined,
      auth: createAuthProvider(),
    });

    expect(await crm.agentProfile.getCurrentAgent(REQUEST)).toEqual({
      status: 'ok',
      agent: MOCK_AGENT,
    });
  });

  it('refuses the il source without a scope, before anything is called', () => {
    expect(() =>
      selectCrmProviders({ source: 'il', ilScope: undefined, auth: createAuthProvider() }),
    ).toThrow(/VITE_IL_SCOPE/);
  });

  it('reads the integration layer with a token requested for the configured scope', async () => {
    const auth = createAuthProvider({ accessToken: 'token-for-il' });
    const getAccessToken = vi.spyOn(auth, 'getAccessToken');
    const fetchSpy = vi.fn(
      async () => new Response(JSON.stringify({ userId: 'u-1', email: 'a@example.com' })),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const crm = selectCrmProviders({ source: 'il', ilScope: SCOPE, auth });
    const result = await crm.agentProfile.getCurrentAgent(REQUEST);

    expect(result).toEqual({ status: 'ok', agent: { userId: 'u-1', email: 'a@example.com' } });
    const options: AccessTokenOptions = { forceRefresh: false };
    expect(getAccessToken).toHaveBeenCalledWith([SCOPE], options);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/crm/agents/me');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer token-for-il');
  });

  it('reads the contact through the same integration layer', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ contactId: 'c-1' })));
    vi.stubGlobal('fetch', fetchSpy);

    const crm = selectCrmProviders({ source: 'il', ilScope: SCOPE, auth: createAuthProvider() });
    const result = await crm.contactProfile.getContact({ ...REQUEST, contactId: 'c-1' });

    expect(result).toEqual({ status: 'ok', contact: { contactId: 'c-1' } });
    expect((fetchSpy.mock.calls[0] as unknown as [string])[0]).toBe('/api/crm/contacts/c-1');
  });

  // With Easy Auth the browser has no token to request (ADR-0021): no scope is needed, and the
  // integration layer is called with the session cookie alone.
  it('needs no scope with easy-auth, and sends no Authorization header', async () => {
    const auth = createAuthProvider();
    const getAccessToken = vi
      .spyOn(auth, 'getAccessToken')
      .mockResolvedValue({ status: 'session' });
    const fetchSpy = vi.fn(
      async () => new Response(JSON.stringify({ userId: 'u-1', email: 'a@example.com' })),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const crm = selectCrmProviders({
      source: 'il',
      ilScope: undefined,
      auth,
      authMode: 'easy-auth',
    });
    const result = await crm.agentProfile.getCurrentAgent(REQUEST);

    expect(result.status).toBe('ok');
    expect(getAccessToken).toHaveBeenCalledWith([], { forceRefresh: false });
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBeUndefined();
  });
});
