import { describe, expect, it } from 'vitest';
import { APP_ENVIRONMENTS, resolveAppEnvironment } from './app-environment.ts';

// VCX-10478: one flag says where this build runs. The values are the release pipelines'
// environments (dev, int, qas) plus `local` for the mocked, no-credentials run. A wrong value
// is a deployment misconfiguration that is invisible at compile time, so it must fail loudly
// instead of quietly booting as some other environment.

describe('resolveAppEnvironment', () => {
  it('defaults to local when nothing is configured, so a clean checkout still runs', () => {
    expect(resolveAppEnvironment(undefined)).toBe('local');
  });

  it('treats an empty value as unset', () => {
    expect(resolveAppEnvironment('')).toBe('local');
  });

  it.each(['local', 'dev', 'int', 'qas'] as const)('accepts %s', (environment) => {
    expect(resolveAppEnvironment(environment)).toBe(environment);
  });

  // `qa` and `DEV` are the near-misses the CRM side and the ticket use; `prd` has no pipeline.
  it.each(['qa', 'DEV', 'prd', 'staging'])('rejects %s instead of guessing', (raw) => {
    expect(() => resolveAppEnvironment(raw)).toThrow(/VITE_APP_ENV/);
  });

  it('names every allowed value in the error, so the fix is obvious', () => {
    expect(() => resolveAppEnvironment('qa')).toThrow(APP_ENVIRONMENTS.join(', '));
  });
});
