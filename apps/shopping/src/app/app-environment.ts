import { z } from 'zod';

// Where this build runs (VCX-10478). The names are the release pipelines' environments
// (`.azure-pipelines/release/`), which are the source of truth; the ticket's DEV/QAT/STG/PRD
// and the CRM side's Sandbox/dev/int/qa are other spellings of overlapping sets. `local` is the
// mocked run a clean checkout gets with no configuration (AGENTS.md § 1).
//
// Add a value here only when a pipeline deploys to it — a name with nowhere to deploy would
// be a flag that can be set but never exercised.
export const APP_ENVIRONMENTS = ['local', 'dev', 'int', 'qas'] as const;

export const AppEnvironmentSchema = z.enum(APP_ENVIRONMENTS);

export type AppEnvironment = z.infer<typeof AppEnvironmentSchema>;

/**
 * Parses the raw `VITE_APP_ENV` value.
 *
 * Unset (or empty, which is how an unset pipeline variable can arrive) means `local`. Anything
 * else must be an exact match: a near-miss like `qa` or `DEV` throws rather than falling back,
 * because a build that silently boots as the wrong environment is the failure this flag exists
 * to prevent.
 */
export function resolveAppEnvironment(raw: string | undefined): AppEnvironment {
  if (raw === undefined || raw === '') return 'local';

  const parsed = AppEnvironmentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `VITE_APP_ENV="${raw}" is not a known environment. Use one of: ${APP_ENVIRONMENTS.join(', ')}.`,
    );
  }
  return parsed.data;
}
