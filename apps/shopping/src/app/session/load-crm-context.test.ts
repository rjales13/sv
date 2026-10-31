import { MOCK_AGENT, MOCK_CONTACT } from '@vikings/adapters';
import type {
  AgentProfileProvider,
  AgentProfileResult,
  ContactProfileProvider,
  ContactProfileRequest,
  ContactProfileResult,
} from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';
import { describe, expect, it } from 'vitest';
import { loadCrmContext } from './load-crm-context.ts';

// The host shell's startup load (ADR-0019): the signed-in agent and the launch contact.
//
// The two have different failure rules, and that difference is the point of these tests:
//   - The agent is identity. Without a confirmed CRM user there is no CRM session, so a
//     failure stops the app (denied, or the startup error).
//   - The contact is context. VCX-10474/10475: a CRM payload failure must never block search,
//     so any contact failure leaves the app running with the contact "unselected" — and the
//     reason kept, never swallowed.

const PRINCIPAL: AuthenticatedPrincipal = {
  principalId: 'p-1',
  officeCurrency: 'USD',
  authorizationScopes: ['cruise.search'],
};

const agentReturning = (result: AgentProfileResult): AgentProfileProvider => ({
  getCurrentAgent: async () => result,
});

function contactReturning(result: ContactProfileResult) {
  const calls: ContactProfileRequest[] = [];
  const provider: ContactProfileProvider = {
    getContact: async (input) => {
      calls.push(input);
      return result;
    },
  };
  return { provider, calls };
}

const OK_AGENT: AgentProfileResult = { status: 'ok', agent: MOCK_AGENT };
const OK_CONTACT: ContactProfileResult = { status: 'ok', contact: MOCK_CONTACT };

/** `launch` is what the host context carried; it defaults to the mock contact's id. */
function load(
  agent: AgentProfileProvider,
  contact: ContactProfileProvider,
  launch: { contactId?: string; userId?: string } = { contactId: MOCK_CONTACT.contactId },
) {
  return loadCrmContext({
    agentProfile: agent,
    contactProfile: contact,
    principal: PRINCIPAL,
    contactId: launch.contactId,
    launchUserId: launch.userId,
    newRequestId: () => 'req-1',
  });
}

describe('loadCrmContext — the contact', () => {
  it('selects the contact when the agent and the contact both load', async () => {
    const { provider } = contactReturning(OK_CONTACT);

    const result = await load(agentReturning(OK_AGENT), provider);

    expect(result).toEqual({
      status: 'ready',
      agent: MOCK_AGENT,
      contact: { status: 'selected', contact: MOCK_CONTACT },
    });
  });

  it('asks for the contact with the launch id and the principal (invariant 7)', async () => {
    const { provider, calls } = contactReturning(OK_CONTACT);

    await load(agentReturning(OK_AGENT), provider, {
      contactId: 'E4678A0D-DDD1-ED11-A7C7-000D3A11436B',
    });

    expect(calls).toEqual([
      {
        requestId: 'req-1',
        contactId: 'E4678A0D-DDD1-ED11-A7C7-000D3A11436B',
        principal: {
          principalId: 'p-1',
          officeCurrency: 'USD',
          authorizationScopes: ['cruise.search'],
        },
      },
    ]);
  });

  it('leaves the contact unselected, without asking, when the launch has no contact id', async () => {
    const { provider, calls } = contactReturning(OK_CONTACT);

    const result = await load(agentReturning(OK_AGENT), provider, {});

    expect(calls).toHaveLength(0);
    expect(result).toMatchObject({
      status: 'ready',
      contact: { status: 'unselected', reason: 'no-contact-id' },
    });
  });

  it('treats an empty contact id as no contact id', async () => {
    const { provider, calls } = contactReturning(OK_CONTACT);

    const result = await load(agentReturning(OK_AGENT), provider, { contactId: '' });

    expect(calls).toHaveLength(0);
    expect(result).toMatchObject({ contact: { status: 'unselected', reason: 'no-contact-id' } });
  });

  it('leaves the contact unselected when CRM has no such contact', async () => {
    const { provider } = contactReturning({ status: 'empty' });

    const result = await load(agentReturning(OK_AGENT), provider);

    expect(result).toMatchObject({
      status: 'ready',
      contact: { status: 'unselected', reason: 'not-found' },
    });
  });

  it('keeps the app running when the contact fails, and keeps why', async () => {
    const { provider } = contactReturning({
      status: 'error',
      kind: 'upstream',
      message: 'The contact could not be loaded.',
      detail: 'HTTP 502',
    });

    const result = await load(agentReturning(OK_AGENT), provider);

    expect(result).toEqual({
      status: 'ready',
      agent: MOCK_AGENT,
      contact: {
        status: 'unselected',
        reason: 'failed',
        detail: 'The contact could not be loaded. (HTTP 502)',
      },
    });
  });

  it('keeps the message alone when the contact failure has no detail', async () => {
    const { provider } = contactReturning({
      status: 'error',
      kind: 'denied',
      message: 'No access.',
    });

    const result = await load(agentReturning(OK_AGENT), provider);

    expect(result).toMatchObject({ contact: { reason: 'failed', detail: 'No access.' } });
  });
});

describe('loadCrmContext — the agent', () => {
  it('is denied when the agent is denied, because the CRM user is not confirmed', async () => {
    const { provider } = contactReturning(OK_CONTACT);

    const result = await load(
      agentReturning({
        status: 'error',
        kind: 'denied',
        message: 'Your CRM user could not be confirmed.',
      }),
      provider,
    );

    expect(result).toEqual({
      status: 'denied',
      code: 403,
      reason: 'Your CRM user could not be confirmed.',
    });
  });

  it('is denied when the agent has no CRM record', async () => {
    const { provider } = contactReturning(OK_CONTACT);

    const result = await load(agentReturning({ status: 'empty' }), provider);

    expect(result).toMatchObject({ status: 'denied', code: 403 });
  });

  it('is a startup error when the agent cannot be loaded for another reason', async () => {
    const { provider } = contactReturning(OK_CONTACT);

    const result = await load(
      agentReturning({
        status: 'error',
        kind: 'upstream',
        message: 'Your CRM user could not be loaded.',
      }),
      provider,
    );

    expect(result).toEqual({ status: 'error', message: 'Your CRM user could not be loaded.' });
  });
});

// VCX-10480: the launch's `userId` is the agent CRM thinks it opened the form for. The IL
// already identifies the agent from the token, so the URL value is never trusted for identity
// — it is only compared. A mismatch means the URL does not belong to this agent, so the app
// shows the denied state rather than a session built on someone else's launch.
describe('loadCrmContext — the launch user', () => {
  it('runs when the launch user is the signed-in agent, ignoring case', async () => {
    const { provider } = contactReturning(OK_CONTACT);

    const result = await load(agentReturning(OK_AGENT), provider, {
      userId: MOCK_AGENT.userId.toUpperCase(),
    });

    expect(result).toMatchObject({ status: 'ready', agent: MOCK_AGENT });
  });

  it('is denied when the launch names a different user', async () => {
    const { provider } = contactReturning(OK_CONTACT);

    const result = await load(agentReturning(OK_AGENT), provider, {
      contactId: MOCK_CONTACT.contactId,
      userId: '11111111-1111-1111-1111-111111111111',
    });

    expect(result).toEqual({
      status: 'denied',
      code: 403,
      reason: 'This CRM launch was opened for a different user.',
    });
  });

  it('skips the check when the launch names no user', async () => {
    const { provider } = contactReturning(OK_CONTACT);

    const result = await load(agentReturning(OK_AGENT), provider, {});

    expect(result).toMatchObject({ status: 'ready' });
  });
});
