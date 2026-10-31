// Public surface of the mock Dynamics shell. The entry point picks between the shell and the
// embedded app by path; nothing else should need either of these.

export { type HostShellMode, resolveHostShellMode } from './host-shell-mode.ts';
export { EMBED_BASENAME, MockDynamicsShell } from './mock-dynamics-shell.tsx';
