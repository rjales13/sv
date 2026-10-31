import { z } from 'zod';

// What the site root shows (VITE_HOST_SHELL).
//
//   - `mock`: the fake Dynamics 365 chrome, framing the app at /embed. The default, because a
//     local run or a demo has no real host around it.
//   - `direct`: the app itself, at the root. For an environment that real D365 frames: CRM
//     points its iframe at `/?contactId=…`, and a mock shell there would draw fake D365 chrome
//     inside the real one.
//
// A separate switch rather than something derived from the environment, so a deployed
// environment can still demo the mock shell until real D365 frames it.
export const HOST_SHELL_MODES = ['mock', 'direct'] as const;

export const HostShellModeSchema = z.enum(HOST_SHELL_MODES);

export type HostShellMode = z.infer<typeof HostShellModeSchema>;

/**
 * Parses the raw `VITE_HOST_SHELL` value. Unset or empty means `mock`. Anything else must match
 * exactly: a typo throws instead of silently showing the wrong thing to an agent inside CRM.
 */
export function resolveHostShellMode(raw: string | undefined): HostShellMode {
  if (raw === undefined || raw === '') return 'mock';

  const parsed = HostShellModeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `VITE_HOST_SHELL="${raw}" is not a known mode. Use one of: ${HOST_SHELL_MODES.join(', ')}.`,
    );
  }
  return parsed.data;
}
