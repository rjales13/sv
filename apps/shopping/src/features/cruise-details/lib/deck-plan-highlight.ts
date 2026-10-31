/*
  The deck plan's highlight rules, shared by the panel and the expand dialog so the detail view
  shows exactly what the small view shows — the same cabin picked out. Pure string work, so it
  is testable without a DOM.
*/

/**
 * Ids are interpolated into a stylesheet, so anything that could close the rule is stripped.
 *
 * EVO cabin numbers and category codes are alphanumeric in every delivered payload; this is
 * here so a future drop with a stray quote degrades to "no highlight" instead of injecting CSS.
 */
export function cssSafe(value: string): string {
  return value.replace(/[^A-Za-z0-9-]/g, '');
}

/**
 * Picks the pointed-at cabin out of the selected category (R4.4).
 *
 * The rest of the plan is left in the colours Viking drew, as production shows it. An earlier
 * version receded every other category to 25% opacity; that washed the whole drawing out and
 * took the cabin numbers down with it.
 *
 * Rooms are drawn as `<g id="room-3002-Ocean-Veranda-V1">` wrapping their own shape, so the
 * cabin number and the category code sit at the two ends of the id. That is what makes the
 * per-cabin rule safe to emit unconditionally: `[id^="room-3101-"][id$="-V1"]` can only match a
 * room that is BOTH cabin 3101 and category V1.
 *
 * It matters because a cabin list and a drawing come from different systems (EVO and AEM), and
 * nothing forces them to agree: an earlier synthetic cabin set named V1 cabins 3101-3112, which
 * the Vesta's drawing gives to a PS3. Matching on the number alone would have pointed an agent
 * at a different category's room. When the two disagree the rule matches nothing, which is the
 * honest answer.
 */
export function injectPlanHighlight(
  svgRaw: string,
  categoryCode: string,
  cabinNumber: string | undefined,
): string {
  if (cabinNumber === undefined) return svgRaw;
  const code = cssSafe(categoryCode);
  const cabin = cssSafe(cabinNumber);

  // Stroked rather than recoloured: the fill IS the category, so overpainting it would say the
  // cabin had changed category. `paint-order` keeps the stroke outside the room's own edge.
  const cabinRule = `
    [id^="room-${cabin}-"][id$="-${code}"] :is(rect, polygon, path, polyline) {
      stroke: #101820; stroke-width: 2.5; paint-order: stroke;
    }`;

  return svgRaw.replace(/(<svg[^>]*)>/, `$1><style>${cabinRule}</style>`);
}
