import type { AgentProfile } from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';
import { createContext, use } from 'react';
import type { CrmContact } from './load-crm-context.ts';

// The session the host shell builds at startup (ADR-0019): who is signed in, and which contact
// the CRM launch is about. Screens read it here and never call auth, the URL or the
// integration layer themselves — that is the "agnostic to the CRM data management process"
// part of VCX-10478.
//
// It is supplied only once the startup load has finished, so a screen that can see it never
// has to handle a loading session.

export interface Session {
  readonly principal: AuthenticatedPrincipal;
  /** The signed-in agent's CRM record. */
  readonly agent: AgentProfile;
  /** The launch contact, or why there is none. */
  readonly contact: CrmContact;
}

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = use(SessionContext);
  if (session === null) {
    // A wiring bug, not a runtime state: the composition root mounts screens only inside the
    // session. Failing here names it, instead of a screen quietly rendering with no contact.
    throw new Error('No session in scope. Mount this tree inside <SessionContext>.');
  }
  return session;
}
