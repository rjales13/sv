// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { shouldStartDevMocks } from './should-start-dev-mocks.ts';

// When `pnpm dev` starts the MSW worker. It must be intercepting before the first request
// leaves the app, so this decides it up front from the env alone.

describe('shouldStartDevMocks', () => {
  it('starts for the direct-EVO provider, which MSW stands in for', () => {
    expect(shouldStartDevMocks({ DEV: true, VITE_CRUISE_PROVIDER: 'http' })).toBe(true);
  });

  // VCX-10507: with `il` the /api routes are answered by MSW unless the agent asked for the
  // real local IL — otherwise they fall through to the /api proxy and fail with nothing there.
  it('starts for the integration-layer provider by default', () => {
    expect(shouldStartDevMocks({ DEV: true, VITE_CRUISE_PROVIDER: 'il' })).toBe(true);
    expect(
      shouldStartDevMocks({ DEV: true, VITE_CRUISE_PROVIDER: 'il', VITE_IL_DEV_MOCKS: 'true' }),
    ).toBe(true);
  });

  it('stays off for `il` when the real local IL is wanted behind the proxy', () => {
    expect(
      shouldStartDevMocks({ DEV: true, VITE_CRUISE_PROVIDER: 'il', VITE_IL_DEV_MOCKS: 'false' }),
    ).toBe(false);
  });

  it('stays off for the in-process mock, which makes no network calls to intercept', () => {
    expect(shouldStartDevMocks({ DEV: true, VITE_CRUISE_PROVIDER: 'mock' })).toBe(false);
    expect(shouldStartDevMocks({ DEV: true })).toBe(false);
  });

  it('never starts outside dev, whatever the provider', () => {
    expect(shouldStartDevMocks({ DEV: false, VITE_CRUISE_PROVIDER: 'http' })).toBe(false);
    expect(shouldStartDevMocks({ DEV: false, VITE_CRUISE_PROVIDER: 'il' })).toBe(false);
  });
});
