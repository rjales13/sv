import { sampleCruiseSearchRequest } from '@vikings/contracts/conformance';
import { describe, expect, it } from 'vitest';
import { selectAirCityPricingProvider, selectCruiseSearchProvider } from './select-provider.ts';

// ADR-006's enforcement point: the ONE place a concrete adapter is chosen. These cover the
// misconfiguration paths, because every one of them is silent at compile time and would
// otherwise surface as a confusing runtime failure in someone else's feature code.

describe('selectCruiseSearchProvider', () => {
  it('defaults to the in-process mock when nothing is configured', () => {
    const provider = selectCruiseSearchProvider();
    expect(typeof provider.search).toBe('function');
  });

  it('falls back to the mock for an unknown provider kind rather than failing a local run', () => {
    const provider = selectCruiseSearchProvider({ kind: 'nonsense' });
    expect(typeof provider.search).toBe('function');
  });

  it('refuses to build the http adapter without a base URL', () => {
    expect(() => selectCruiseSearchProvider({ kind: 'http' })).toThrow(/VITE_EVO_BASE_URL/);
  });

  it('builds the http adapter when the base URL is present', () => {
    const provider = selectCruiseSearchProvider({
      kind: 'http',
      evoBaseUrl: 'https://gateway-api-qa.ninerealms.tech',
      evoApiKey: 'local-mock-key',
      mocksIntercepting: true,
    });
    expect(typeof provider.search).toBe('function');
  });

  it('fails closed when no API key is configured, without calling out', async () => {
    // No MSW server is running in this file, so a request that escaped would fail the suite
    // on an unhandled network call — which is precisely the assertion we want.
    const provider = selectCruiseSearchProvider({
      kind: 'http',
      evoBaseUrl: 'https://gateway-api-qa.ninerealms.tech',
      evoApiKey: '',
      mocksIntercepting: true,
    });

    const result = await provider.search(sampleCruiseSearchRequest);

    expect(result).toMatchObject({ status: 'error', kind: 'denied' });
  });
});

describe('selectAirCityPricingProvider', () => {
  const AIR_REQUEST = {
    requestId: '00000000-0000-4000-8000-000000000000',
    cruiseId: 'HID270322T',
    office: 'US',
    currency: 'USD',
    rateCode: '',
    principal: { principalId: 'agent-1', officeCurrency: 'USD', authorizationScopes: [] },
  };

  it('defaults to the in-process mock when nothing is configured', () => {
    expect(typeof selectAirCityPricingProvider().getAirCityPricing).toBe('function');
  });

  it('builds the http adapter when the base URL is present', () => {
    const provider = selectAirCityPricingProvider({
      kind: 'http',
      evoBaseUrl: 'https://gateway-api-qa.ninerealms.tech',
      evoApiKey: 'local-mock-key',
      mocksIntercepting: true,
    });
    expect(typeof provider.getAirCityPricing).toBe('function');
  });

  it('fails closed when no API key is configured, without calling out', async () => {
    // No MSW server runs in this file, so an escaped request would fail the suite on an
    // unhandled network call — which is exactly the assertion wanted.
    const provider = selectAirCityPricingProvider({
      kind: 'http',
      evoBaseUrl: 'https://gateway-api-qa.ninerealms.tech',
      evoApiKey: '',
      mocksIntercepting: true,
    });

    expect(await provider.getAirCityPricing(AIR_REQUEST)).toMatchObject({
      status: 'error',
      kind: 'denied',
    });
  });

  it('is subject to the SAME network guard as cruise search', () => {
    // The guard is invisible at compile time. Without this, a new port could reach Viking
    // infrastructure while every other port stayed safely mocked.
    expect(() =>
      selectAirCityPricingProvider({
        kind: 'http',
        evoBaseUrl: 'https://gateway-api-qa.ninerealms.tech',
        evoApiKey: 'local-mock-key',
        mocksIntercepting: false,
      }),
    ).toThrow(/MSW is not intercepting/);
  });

  it('refuses to build the http adapter without a base URL', () => {
    expect(() => selectAirCityPricingProvider({ kind: 'http' })).toThrow(/VITE_EVO_BASE_URL/);
  });
});

describe('network safety', () => {
  it('refuses the http adapter when nothing is intercepting and nobody opted in', () => {
    // A clean checkout must not be one env flip away from calling Viking infrastructure
    // (AGENTS.md § 1). MSW starts in dev only, so `vite preview` is the dangerous case.
    expect(() =>
      selectCruiseSearchProvider({
        kind: 'http',
        evoBaseUrl: 'https://gateway-api-qa.ninerealms.tech',
        evoApiKey: 'local-mock-key',
        mocksIntercepting: false,
      }),
    ).toThrow(/MSW is not intercepting/);
  });

  it('allows the http adapter when the caller explicitly opts in to real endpoints', () => {
    const provider = selectCruiseSearchProvider({
      kind: 'http',
      evoBaseUrl: 'https://gateway-api-qa.ninerealms.tech',
      evoApiKey: 'real-key',
      mocksIntercepting: false,
      allowRealEndpoints: true,
    });
    expect(typeof provider.search).toBe('function');
  });
});
