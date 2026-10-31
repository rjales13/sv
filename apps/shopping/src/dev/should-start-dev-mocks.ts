/** The slice of `import.meta.env` that decides whether `pnpm dev` starts MSW. */
export interface DevMocksEnv {
  readonly DEV: boolean;
  readonly VITE_CRUISE_PROVIDER?: string | undefined;
  readonly VITE_IL_DEV_MOCKS?: string | undefined;
}

/**
 * Whether to start the MSW worker before the app renders.
 *
 * Only the providers that make network calls need it: `http` (MSW stands in for EVO) and `il`
 * (it stands in for the integration layer's /api routes, VCX-10507) — unless the agent set
 * `VITE_IL_DEV_MOCKS=false` to reach a real local IL through the Vite /api proxy. The in-process
 * `mock` provider never touches the network, so there is nothing to intercept.
 *
 * Kept apart from `start-dev-mocks.ts` so it can be tested without loading `msw`.
 */
export function shouldStartDevMocks(env: DevMocksEnv): boolean {
  if (!env.DEV) return false;
  if (env.VITE_CRUISE_PROVIDER === 'http') return true;
  return env.VITE_CRUISE_PROVIDER === 'il' && env.VITE_IL_DEV_MOCKS !== 'false';
}
