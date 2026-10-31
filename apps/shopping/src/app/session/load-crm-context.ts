import type {
  AgentProfile,
  AgentProfileProvider,
  ContactProfile,
  ContactProfileProvider,
  ContactProfileResult,
  PrincipalRef,
} from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';

// The host shell's startup load (ADR-0019): the signed-in agent and the contact the launch is
// about, read once through their ports and handed to the session.
//
// The two fail differently, on purpose:
//   - The agent is identity. Without a confirmed CRM user there is no CRM session, so its
//     failure stops the app — the denied screen, or the startup error.
//   - The contact is context. VCX-10474/10475 say a CRM payload failure must never block
//     search, so a contact that is missing or fails to load leaves the app running with the
//     contact "unselected". The reason is kept on the session, not swallowed.

/** The launch contact, as screens see it. */
export type CrmContact =
  | { readonly status: 'selected'; readonly contact: ContactProfile }
  | {
      readonly status: 'unselected';
      readonly reason: 'no-contact-id' | 'not-found' | 'failed';
      /** Why it failed, for support. Present only for `failed`. */
      readonly detail?: string;
    };

export type CrmContextResult =
  | { readonly status: 'ready'; readonly agent: AgentProfile; readonly contact: CrmContact }
  // 403 because a denied agent is authenticated but not a confirmed CRM user: the IL reports
  // a missing CRM record as 403, and a token it refuses never gets this far without one.
  | { readonly status: 'denied'; readonly code: 403; readonly reason: string }
  | { readonly status: 'error'; readonly message: string };

export interface LoadCrmContextInput {
  readonly agentProfile: AgentProfileProvider;
  readonly contactProfile: ContactProfileProvider;
  readonly principal: AuthenticatedPrincipal;
  /** From the host context. Absent or empty when the launch carries no contact. */
  readonly contactId: string | undefined;
  /** The launch's `userId` (a Dataverse systemuserid), only ever compared — see below. */
  readonly launchUserId?: string | undefined;
  readonly newRequestId: () => string;
}

/** The contracts-side projection of the platform principal every port request carries. */
function toPrincipalRef(principal: AuthenticatedPrincipal): PrincipalRef {
  return {
    principalId: principal.principalId,
    officeCurrency: principal.officeCurrency,
    authorizationScopes: principal.authorizationScopes ?? [],
  };
}

function toCrmContact(result: ContactProfileResult): CrmContact {
  switch (result.status) {
    case 'ok':
      return { status: 'selected', contact: result.contact };
    case 'empty':
      return { status: 'unselected', reason: 'not-found' };
    case 'error':
      return {
        status: 'unselected',
        reason: 'failed',
        detail:
          result.detail === undefined ? result.message : `${result.message} (${result.detail})`,
      };
  }
}

async function loadContact(
  input: LoadCrmContextInput,
  principal: PrincipalRef,
): Promise<CrmContact> {
  if (input.contactId === undefined || input.contactId === '') {
    return { status: 'unselected', reason: 'no-contact-id' };
  }
  const result = await input.contactProfile.getContact({
    requestId: input.newRequestId(),
    contactId: input.contactId,
    principal,
  });
  return toCrmContact(result);
}

export async function loadCrmContext(input: LoadCrmContextInput): Promise<CrmContextResult> {
  const principal = toPrincipalRef(input.principal);
  // In parallel: they are independent reads, and startup waits for the slower of the two
  // rather than for both in a row.
  const [agentResult, contact] = await Promise.all([
    input.agentProfile.getCurrentAgent({ requestId: input.newRequestId(), principal }),
    loadContact(input, principal),
  ]);

  if (agentResult.status === 'ok') {
    // VCX-10480: the IL identifies the agent from the token, so the URL's userId is never
    // trusted for identity — only compared. A mismatch means this launch was not opened for the
    // signed-in agent, so no session is built on it. GUID case carries no meaning.
    const launchUser = input.launchUserId?.toLowerCase();
    if (launchUser !== undefined && launchUser !== agentResult.agent.userId.toLowerCase()) {
      return {
        status: 'denied',
        code: 403,
        reason: 'This CRM launch was opened for a different user.',
      };
    }
    return { status: 'ready', agent: agentResult.agent, contact };
  }
  if (agentResult.status === 'empty') {
    return { status: 'denied', code: 403, reason: 'Your CRM user could not be confirmed.' };
  }
  return agentResult.kind === 'denied'
    ? { status: 'denied', code: 403, reason: agentResult.message }
    : { status: 'error', message: agentResult.message };
}
