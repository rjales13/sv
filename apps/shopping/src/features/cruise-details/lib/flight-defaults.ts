import type {
  VikingAirGuestCardOption,
  VikingAirGuestCardSelection,
} from '@/features/cruise-details/components/viking-air-guest-card';
import { CRUISE_ONLY, ECONOMY_CLASS } from './viking-air-pricing.ts';

// Synchronized flight defaults for one guest's Viking Air selection.
//
// Most guests fly a round trip from one airport in one cabin, so the agent should only have to
// pick the origin: the return leg copies it, and the class starts at Economy. The return leg
// keeps following the origin until the agent changes it to something else.
//
// "Overridden" is derived, not stored: a return field follows the origin while it is empty or
// still equal to the origin's value. Storing an explicit flag was rejected because the
// selection is persisted to the workspace store and restored on tab navigation; a derived rule
// survives that round trip with no extra state. The cost: an agent who sets the return leg to
// exactly the origin's value is treated as following it again, which matches what they see.

type Field = keyof VikingAirGuestCardSelection;

/** Economy when the cruise offers it, else the cheapest class (toClassOptions sorts cheapest first). */
export function defaultAirClass(
  classOptions: readonly VikingAirGuestCardOption[],
): string | undefined {
  return classOptions.find((o) => o.value === ECONOMY_CLASS)?.value ?? classOptions[0]?.value;
}

function follows(returnValue: string | undefined, originValue: string | undefined): boolean {
  return returnValue === undefined || returnValue === originValue;
}

function withOriginGateway(
  prev: VikingAirGuestCardSelection,
  gateway: string,
  classOptions: readonly VikingAirGuestCardOption[],
): VikingAirGuestCardSelection {
  const originClass =
    gateway === CRUISE_ONLY ? undefined : (prev.originClass ?? defaultAirClass(classOptions));
  const returnGateway = follows(prev.returnGateway, prev.originGateway)
    ? gateway
    : prev.returnGateway;

  let returnClass: string | undefined;
  if (returnGateway !== CRUISE_ONLY) {
    returnClass = follows(prev.returnClass, prev.originClass)
      ? (originClass ?? prev.returnClass ?? defaultAirClass(classOptions))
      : prev.returnClass;
  }

  return { originGateway: gateway, originClass, returnGateway, returnClass };
}

function withOriginClass(
  prev: VikingAirGuestCardSelection,
  airClass: string,
): VikingAirGuestCardSelection {
  const returnFollows =
    prev.returnGateway !== CRUISE_ONLY && follows(prev.returnClass, prev.originClass);
  return { ...prev, originClass: airClass, ...(returnFollows && { returnClass: airClass }) };
}

function withReturnGateway(
  prev: VikingAirGuestCardSelection,
  gateway: string,
  classOptions: readonly VikingAirGuestCardOption[],
): VikingAirGuestCardSelection {
  if (gateway === CRUISE_ONLY) return { ...prev, returnGateway: gateway, returnClass: undefined };
  return {
    ...prev,
    returnGateway: gateway,
    returnClass: prev.returnClass ?? prev.originClass ?? defaultAirClass(classOptions),
  };
}

/** The selection that results from the agent setting one field, with defaults applied. */
export function applyFlightSelection(
  prev: VikingAirGuestCardSelection,
  field: Field,
  value: string,
  classOptions: readonly VikingAirGuestCardOption[],
): VikingAirGuestCardSelection {
  switch (field) {
    case 'originGateway':
      return withOriginGateway(prev, value, classOptions);
    case 'originClass':
      return withOriginClass(prev, value);
    case 'returnGateway':
      return withReturnGateway(prev, value, classOptions);
    case 'returnClass':
      return { ...prev, returnClass: value };
  }
}
