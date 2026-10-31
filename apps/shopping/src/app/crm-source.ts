import { z } from 'zod';

// Where the host shell's CRM context comes from (VITE_CRM_SOURCE, ADR-0019).
//
//   - `mock`: the in-process mock CRM adapters. The default, everywhere.
//   - `il`: the integration layer, at the same origin under `/api`, with the agent's Easy Auth
//     session cookie (VITE_AUTH=easy-auth, ADR-0021) or, with mock auth, the mock token.
//
// Deliberately an explicit opt-in, not derived from VITE_APP_ENV. Selecting the IL by
// environment would break a deployed site today: the IL is not deployed, so IIS answers
// `/api/...` with the SPA's index.html, and even once it is, it rejects the mock token unless
// the environment also signs in with Easy Auth. An environment switches to `il` in its pipeline
// variables file once both are in place.
export const CRM_SOURCES = ['mock', 'il'] as const;

export const CrmSourceSchema = z.enum(CRM_SOURCES);

export type CrmSource = z.infer<typeof CrmSourceSchema>;

/** Unset or empty means `mock`; anything else must match exactly. */
export function resolveCrmSource(raw: string | undefined): CrmSource {
  if (raw === undefined || raw === '') return 'mock';

  const parsed = CrmSourceSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `VITE_CRM_SOURCE="${raw}" is not a known source. Use one of: ${CRM_SOURCES.join(', ')}.`,
    );
  }
  return parsed.data;
}

/**
 * The scope the agent's token is requested for, e.g. `api://<IL app>/access_as_user`. Not a
 * secret — it names the IL's exposed API — but it differs per environment, so it is config.
 * Required with the `il` source under mock auth: without it no token can be requested, so fail
 * at startup rather than on the first call. Easy Auth needs none (see `ilCredential`).
 */
export function resolveIlScope(raw: string | undefined): string {
  if (raw === undefined || raw === '') {
    throw new Error(
      'VITE_CRM_SOURCE=il requires VITE_IL_SCOPE (the integration layer API scope, ' +
        'e.g. api://<IL app>/access_as_user).',
    );
  }
  return raw;
}
