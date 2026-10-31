import { describe, expect, it } from 'vitest';
import { CRM_SOURCES, resolveCrmSource, resolveIlScope } from './crm-source.ts';

// Where the CRM context comes from (VITE_CRM_SOURCE). `mock` is the default everywhere, and an
// environment switches to `il` explicitly in its pipeline variables once the integration
// layer is deployed and real sign-in exists (VCX-10479). Switching automatically by
// environment would break the deployed site today: the IL is not there to answer.

describe('resolveCrmSource', () => {
  it('defaults to mock when nothing is configured', () => {
    expect(resolveCrmSource(undefined)).toBe('mock');
  });

  it('treats an empty value as unset', () => {
    expect(resolveCrmSource('')).toBe('mock');
  });

  it.each(['mock', 'il'] as const)('accepts %s', (source) => {
    expect(resolveCrmSource(source)).toBe(source);
  });

  it.each(['IL', 'live', 'http'])('rejects %s instead of guessing', (raw) => {
    expect(() => resolveCrmSource(raw)).toThrow(/VITE_CRM_SOURCE/);
  });

  it('names every allowed value in the error', () => {
    expect(() => resolveCrmSource('live')).toThrow(CRM_SOURCES.join(', '));
  });
});

describe('resolveIlScope', () => {
  it('returns the configured scope', () => {
    expect(resolveIlScope('api://integration-layer/access_as_user')).toBe(
      'api://integration-layer/access_as_user',
    );
  });

  it.each([undefined, ''])(
    'refuses a missing scope (%s), because no token could be requested',
    (raw) => {
      expect(() => resolveIlScope(raw)).toThrow(/VITE_IL_SCOPE/);
    },
  );
});
