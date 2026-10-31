import { type AuthProvider, createAuthProvider, createEasyAuthProvider } from '@vikings/platform';
import { z } from 'zod';

// How the agent is signed in (VITE_AUTH, VCX-10479, ADR-0021).
//
//   - `mock`: the in-process mock principal and token. The default, everywhere.
//   - `easy-auth`: App Service Authentication. The App Service signs the agent in with Entra ID
//     before the app loads; the app asks it who that is, and holds no token itself.
//
// An explicit opt-in, like VITE_CRM_SOURCE, not derived from VITE_APP_ENV: an App Service
// without Easy Auth enabled answers `/.auth/me` with 404, so switching by environment would break
// every site whose Easy Auth is not configured yet. An environment opts in with one line in its
// pipeline variables file once it is.
export const AUTH_MODES = ['mock', 'easy-auth'] as const;

export const AuthModeSchema = z.enum(AUTH_MODES);

export type AuthMode = z.infer<typeof AuthModeSchema>;

/** Unset or empty means `mock`; anything else must match exactly. */
export function resolveAuthMode(raw: string | undefined): AuthMode {
  if (raw === undefined || raw === '') return 'mock';

  const parsed = AuthModeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `VITE_AUTH="${raw}" is not a known mode. Use one of: ${AUTH_MODES.join(', ')}.`,
    );
  }
  return parsed.data;
}

const DEFAULT_OFFICE_CURRENCY = 'USD';

/**
 * The agent's office currency (the FR1.1 default currency). Neither Entra's claims nor the IL's
 * agent profile carry it, so it is a per-environment default until a real source exists.
 */
export function resolveOfficeCurrency(raw: string | undefined): string {
  if (raw === undefined || raw === '') return DEFAULT_OFFICE_CURRENCY;
  if (!/^[A-Z]{3}$/.test(raw)) {
    throw new Error(
      `VITE_DEFAULT_OFFICE_CURRENCY="${raw}" is not an ISO 4217 currency code (e.g. USD).`,
    );
  }
  return raw;
}

/** The auth seam for the mode. The mock keeps its own principal, office currency included. */
export function createAppAuthProvider(mode: AuthMode, officeCurrency: string): AuthProvider {
  return mode === 'easy-auth' ? createEasyAuthProvider({ officeCurrency }) : createAuthProvider();
}
