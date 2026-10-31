import { describe, expect, it } from 'vitest';
import { HOST_SHELL_MODES, resolveHostShellMode } from './host-shell-mode.ts';

// What the site root shows. `mock` is the fake D365 chrome that frames the app — right for a
// local run or a demo. `direct` is the app itself — right when real D365 frames the URL, where
// the fake chrome would appear inside the real one and swallow the launch parameters.

describe('resolveHostShellMode', () => {
  it('defaults to mock when nothing is configured, so a local run keeps the demo shell', () => {
    expect(resolveHostShellMode(undefined)).toBe('mock');
  });

  it('treats an empty value as unset', () => {
    expect(resolveHostShellMode('')).toBe('mock');
  });

  it.each(['mock', 'direct'] as const)('accepts %s', (mode) => {
    expect(resolveHostShellMode(mode)).toBe(mode);
  });

  it.each(['Direct', 'embed', 'true'])('rejects %s instead of guessing', (raw) => {
    expect(() => resolveHostShellMode(raw)).toThrow(/VITE_HOST_SHELL/);
  });

  it('names every allowed value in the error, so the fix is obvious', () => {
    expect(() => resolveHostShellMode('embed')).toThrow(HOST_SHELL_MODES.join(', '));
  });
});
