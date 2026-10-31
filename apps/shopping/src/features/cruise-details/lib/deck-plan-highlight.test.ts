// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cssSafe, injectPlanHighlight } from './deck-plan-highlight.ts';

/*
  Shaped like the delivered Viking deck plans: every room is a <g> whose id ends in the
  category code, and every shape inside carries the same id plus a "-2" suffix. Shapes are
  written with closing tags because happy-dom mis-parses self-closing SVG children.
*/
const PLAN = `<svg viewBox="0 0 100 40">
  <g id="room-5034-Ocean-Penthouse-Veranda-PV2">
    <rect id="room-5034-Ocean-Penthouse-Veranda-PV2-2" fill="#a89bc5" width="10" height="20"></rect>
    <text fill="#231f20">5034</text>
  </g>
  <g id="room-5118-Ocean-Explorer-Suite-ES1">
    <polygon id="room-5118-Ocean-Explorer-Suite-ES1-2" fill="#cb4e72" points="0,0 1,1"></polygon>
    <text fill="#fff">Suite 5118</text>
  </g>
</svg>`;

/**
 * Mounts the highlighted plan and reads computed styles off it. happy-dom stops parsing at a
 * <style> nested in <svg> (browsers do not), so the injected sheet is lifted out beside the
 * drawing — the same rules, matched against the same markup.
 */
function render(svg: string) {
  const sheet = svg.match(/<style>[\s\S]*?<\/style>/)?.[0] ?? '';
  document.body.innerHTML = sheet + svg.replace(sheet, '');
  return (selector: string, property: string) => {
    const el = document.querySelector(selector);
    if (el === null) throw new Error(`fixture is missing ${selector}`);
    return getComputedStyle(el).getPropertyValue(property);
  };
}

const opacityOf = (value: string) => Number(value || 1);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('injectPlanHighlight — colours', () => {
  it('shows every room in the colours Viking drew, whichever category is picked', () => {
    // Production renders the artwork as-is; fading the other categories washed the plan out.
    const style = render(injectPlanHighlight(PLAN, 'PV2', undefined));
    for (const room of ['5034', '5118']) {
      expect(opacityOf(style(`g[id^="room-${room}-"]`, 'opacity'))).toBe(1);
      expect(opacityOf(style(`[id^="room-${room}-"][id$="-2"]`, 'opacity'))).toBe(1);
      expect(opacityOf(style(`[id^="room-${room}-"][id$="-2"]`, 'fill-opacity'))).toBe(1);
    }
  });
});

describe('injectPlanHighlight — the pointed-at cabin', () => {
  it('outlines it when the drawing holds it in that category', () => {
    const style = render(injectPlanHighlight(PLAN, 'PV2', '5034'));
    expect(style('[id^="room-5034-"][id$="-2"]', 'stroke')).toBe('#101820');
  });

  it('outlines nothing when the drawing gives that number to another category', () => {
    const style = render(injectPlanHighlight(PLAN, 'PV2', '5118'));
    expect(style('[id^="room-5118-"][id$="-2"]', 'stroke')).not.toBe('#101820');
  });
});

describe('cssSafe', () => {
  it('strips anything that could close the injected rule', () => {
    expect(cssSafe('V1"]{}*{x:y')).toBe('V1xy');
  });
});
