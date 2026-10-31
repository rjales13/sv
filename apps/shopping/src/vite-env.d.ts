// Ambient declarations for this app's program.

// Side-effect stylesheet import: `main.tsx` imports `@vikings/ui/globals.css` (the DS token
// layer) so the whole app renders on the real theme; @tailwindcss/vite compiles it at build
// time. A stylesheet carries no TypeScript type, so without this `tsc --noEmit` cannot resolve
// the import.
declare module '*.css';

// Vite resolves static image imports as URL strings at build time.
declare module '*.jpg' {
  const url: string;
  export default url;
}

// Vite's `import.meta.env`. `@vikings/ui` components (e.g. icon.tsx's DEV-only guard) read
// `DEV`, and the composition root reads `VITE_CRUISE_PROVIDER` to select the search adapter.
// We mirror the minimal shape the app actually consumes rather than pull the whole
// `vite/client` lib; Vite supplies the real values at dev/build time.
interface ImportMetaEnv {
  readonly DEV: boolean;
  /** Vite's public base path. The dev mock worker URL is resolved against it, so the app
   *  keeps working when it is served from a sub-path inside the Dynamics host. */
  readonly BASE_URL: string;
  /** Where this build runs: local | dev | int | qas (app/app-environment.ts). Unset = local.
   *  Set per branch by `.azure-pipelines/variables/*.yml`. It names the environment; it does
   *  not select adapters (VITE_CRUISE_PROVIDER and VITE_CRM_SOURCE do). */
  readonly VITE_APP_ENV?: string;
  /** What the site root shows: `mock` (default, the fake D365 shell framing /embed) or
   *  `direct` (the app itself, for an environment real D365 frames). See host-shell-mode.ts. */
  readonly VITE_HOST_SHELL?: string;
  /** Where the host shell's CRM context comes from: `mock` (default) or `il`, the integration
   *  layer. An explicit per-environment opt-in; see app/crm-source.ts. */
  readonly VITE_CRM_SOURCE?: string;
  /** How the agent is signed in: `mock` (default) or `easy-auth`, App Service Authentication.
   *  An explicit per-environment opt-in; see app/auth-mode.ts. */
  readonly VITE_AUTH?: string;
  /** The agent's office currency (ISO 4217). Unset = USD. No sign-in source carries it yet. */
  readonly VITE_DEFAULT_OFFICE_CURRENCY?: string;
  /** The integration layer API scope the agent's token is requested for. Required with
   *  VITE_CRM_SOURCE=il or VITE_CRUISE_PROVIDER=il, unless VITE_AUTH=easy-auth (no token in the
   *  browser). Not a secret: it names the IL's exposed API. */
  readonly VITE_IL_SCOPE?: string;
  /** Selects the CruiseSearchProvider in the composition root. `mock` is the default. */
  readonly VITE_CRUISE_PROVIDER?: string;
  /** EVO origin the `http` adapter targets — MSW-intercepted in this increment (ADR-0008). */
  readonly VITE_EVO_BASE_URL?: string;
  /** EVO auth placeholders. Never a real secret: VITE_ values are inlined into the bundle. */
  readonly VITE_EVO_API_KEY?: string;
  readonly VITE_EVO_CLIENT_ID?: string;
  /** MSW think-time in ms (default 600). Set to 0 in E2E so the suite does not pay it. */
  readonly VITE_MOCK_LATENCY_MS?: string;
  /** `false` sends /api to the local integration layer instead of MSW (dev only). */
  readonly VITE_IL_DEV_MOCKS?: string;
  /** Opt-in to calling REAL EVO endpoints. Absent = the app refuses to leave the machine. */
  readonly VITE_ALLOW_REAL_EVO?: string;
  /** Pins the default sailing-date window (ISO dates). Unset = FR1.1's today + 2 months. */
  readonly VITE_DEFAULT_SAILING_FROM?: string;
  readonly VITE_DEFAULT_SAILING_TO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  /** Vite's static asset glob importer. */
  glob(pattern: string, options: { eager: true; as: 'url' }): Record<string, string>;
}
