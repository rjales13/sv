// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { MOCK_AGENT } from '@vikings/adapters';
import type * as React from 'react';
import { describe, expect, it } from 'vitest';
import { type Session, SessionContext, useSession } from './session-context.tsx';

const SESSION: Session = {
  principal: { principalId: 'p-1', officeCurrency: 'USD' },
  agent: MOCK_AGENT,
  contact: { status: 'unselected', reason: 'no-contact-id' },
};

describe('useSession', () => {
  it('returns the session the composition root supplied', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionContext value={SESSION}>{children}</SessionContext>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current).toBe(SESSION);
  });

  it('names the wiring bug when no session is in scope', () => {
    expect(() => renderHook(() => useSession())).toThrow(/No session in scope/);
  });
});
