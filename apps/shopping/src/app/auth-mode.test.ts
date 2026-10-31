import { DEFAULT_PRINCIPAL } from '@vikings/platform';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_MODES,
  createAppAuthProvider,
  resolveAuthMode,
  resolveOfficeCurrency,
} from './auth-mode.ts';

// How the agent is signed in (VITE_AUTH, ADR-0021). `mock` is the default, so a clean checkout
// runs with no tenant; a deployed environment opts in to `easy-auth` in its pipeline variables
// once App Service Authentication is enabled on it. Switching by environment instead would break
// a site whose App Service has no Easy Auth yet: `/.auth/me` answers 404 there.

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveAuthMode', () => {
  it.each([undefined, ''])('defaults to mock when unset (%s)', (raw) => {
    expect(resolveAuthMode(raw)).toBe('mock');
  });

  it.each(['mock', 'easy-auth'] as const)('accepts %s', (mode) => {
    expect(resolveAuthMode(mode)).toBe(mode);
  });

  it.each(['msal', 'Easy-Auth', 'entra'])('rejects %s instead of guessing', (raw) => {
    expect(() => resolveAuthMode(raw)).toThrow(`VITE_AUTH="${raw}"`);
  });

  it('names every allowed value in the error', () => {
    expect(() => resolveAuthMode('msal')).toThrow(AUTH_MODES.join(', '));
  });
});

// Neither Entra's claims nor the IL's agent profile carry the agent's office currency, so it is
// a per-environment default until a real source exists (decided 2026-10-15).
describe('resolveOfficeCurrency', () => {
  it.each([undefined, ''])('defaults to USD when unset (%s)', (raw) => {
    expect(resolveOfficeCurrency(raw)).toBe('USD');
  });

  it('accepts another ISO 4217 code', () => {
    expect(resolveOfficeCurrency('GBP')).toBe('GBP');
  });

  it.each(['usd', 'US$', 'DOLLAR'])('rejects %s, which is not an ISO 4217 code', (raw) => {
    expect(() => resolveOfficeCurrency(raw)).toThrow(/VITE_DEFAULT_OFFICE_CURRENCY/);
  });
});

describe('createAppAuthProvider', () => {
  it('signs in as the mock principal in mock mode, calling nothing', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await createAppAuthProvider('mock', 'USD').authenticate();

    expect(result).toEqual({ status: 'authenticated', principal: DEFAULT_PRINCIPAL });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('asks the App Service who is signed in, in easy-auth mode', async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              user_id: 'agent@viking.com',
              user_claims: [{ typ: 'name', val: 'An Agent' }],
            },
          ]),
        ),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await createAppAuthProvider('easy-auth', 'EUR').authenticate();

    expect((fetchSpy.mock.calls[0] as unknown as [string])[0]).toBe('/.auth/me');
    expect(result).toMatchObject({
      status: 'authenticated',
      principal: { upn: 'agent@viking.com', displayName: 'An Agent', officeCurrency: 'EUR' },
    });
  });
});
