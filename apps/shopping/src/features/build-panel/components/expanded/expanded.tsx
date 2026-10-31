import { Badge } from '@vikings/ui/components/badge';
import { Button } from '@vikings/ui/components/button';
import { Checkbox } from '@vikings/ui/components/checkbox';
import { Icon, type IconName } from '@vikings/ui/components/icon';
import { Separator } from '@vikings/ui/components/separator';
import { cn } from '@vikings/ui/lib/utils';
import { Fragment, useId } from 'react';
import { PanelFooter } from '@/features/build-panel/components/panel-footer';
import { PriceLineItem } from '@/shared/components/price-line-item';

/*
  BuildPanelExpanded — the Build Panel opened to its per-guest price breakdown
  (ShoppingApp_UX-VD, instance 3414:204668). Header, one column per guest, and the
  existing PanelFooter in its expanded "direct" variant.

  Code connections used:
    Button  (ghost)      header COLLAPSE + Icon IconNavigationExpandMore
    Badge   (success)    PROMO CODE tag
    Checkbox (sm)        "Include Travel Protection Plan - TPP for this guest"
    Icon                 IconStatusInfo (TPP not eligible) · section bullets:
                         IconContentDirectionsBoat / IconContentHotel16 /
                         IconTravelFlightOutline16 / IconActivityBeachAccess16 / IconContentSell16
    PriceLineItem        list / discount / subtotal rows, total (Figma "Helper" off → showPerGuest=false)
    PanelFooter          variant="direct" — gross total + Save Opportunity / Save Search / Book Now
    Separator            Divider — header detail rules and the rule between guest columns

  The COLLAPSE chevron is 20px and the footer 58px, as drawn in this instance;
  the snippet says size={24} and PanelFooter defaults to its content height.
  Bullet glyphs render at 16px: every bullet glyph layer is 16×16 inside the 24px
  bullet, even where the snippet says size={24}. The guest-total bullet is
  opacity 0 in Figma — it only keeps the total aligned with the rows above — so it
  is kept but hidden. Figma's scroll thumb is drawn as a native thin scrollbar.
*/

export type BuildPanelSectionKind = 'cruise' | 'hotel' | 'air' | 'protection';

export interface BuildPanelPriceLine {
  variant: 'list' | 'discount' | 'subtotal';
  label: string;
  /** Pre-formatted amount; discounts get their "– " prefix from PriceLineItem. */
  amount: string;
}

export interface BuildPanelSection {
  kind: BuildPanelSectionKind;
  lines: BuildPanelPriceLine[];
}

export type BuildPanelTpp =
  | {
      eligible: true;
      included: boolean;
      /** Pre-formatted plan price, e.g. "$749.00". */
      amount: string;
      onIncludedChange?: (included: boolean) => void;
    }
  | { eligible: false; reason: string };

export interface BuildPanelGuest {
  /** Column overline, e.g. "Guest 1". */
  label: string;
  name: string;
  tpp: BuildPanelTpp;
  sections: BuildPanelSection[];
  /** e.g. "GUEST 1 TOTAL". */
  totalLabel: string;
  total: string;
}

export interface BuildPanelExpandedProps {
  /** Cruise name, e.g. "Paris to the Swiss Alps". */
  title: string;
  startDate: string;
  endDate: string;
  /** Header detail run, divided by rules: ship, voyage code, nights, stateroom… */
  details: string[];
  promoCode?: string;
  guests: BuildPanelGuest[];
  /** Pre-formatted gross total for the footer, e.g. "$49,680.00". */
  grossTotal: string;
  currencyCode: string;
  onCollapse?: () => void;
  onSaveOpportunity?: () => void;
  onSaveSearch?: () => void;
  onBookNow?: () => void;
  className?: string;
}

const SECTION_ICON: Record<BuildPanelSectionKind, IconName> = {
  cruise: 'IconContentDirectionsBoat',
  hotel: 'IconContentHotel16',
  air: 'IconTravelFlightOutline16',
  protection: 'IconActivityBeachAccess16',
};

const OVERLINE = 'text-overline font-semibold uppercase tracking-[0.08em] text-ink-tertiary';

export function BuildPanelExpanded({
  title,
  startDate,
  endDate,
  details,
  promoCode,
  guests,
  grossTotal,
  currencyCode,
  onCollapse,
  onSaveOpportunity,
  onSaveSearch,
  onBookNow,
  className,
}: BuildPanelExpandedProps) {
  const titleId = useId();

  return (
    <section
      data-slot="build-panel-expanded"
      aria-labelledby={titleId}
      className={cn(
        'flex h-[750px] w-[1308px] flex-col overflow-hidden rounded-t-lg bg-surface shadow-card',
        className,
      )}
    >
      <header className="flex shrink-0 flex-col gap-1 border-b border-line bg-surface-hover px-6 py-4">
        <div className="flex items-center gap-2">
          <h2 id={titleId} className="text-h4 font-semibold text-fjord">
            {title}
          </h2>
          <span className="text-label-sm font-semibold text-fjord">{startDate}</span>
          <span className="text-label-sm font-semibold text-fjord">-</span>
          <span className="text-label-sm font-semibold text-fjord">{endDate}</span>
          <span className="flex-1" />
          <Button variant="ghost" size="default" onClick={() => onCollapse?.()}>
            Collapse
            <Icon name="IconNavigationExpandMore" size={20} tone="current" className="size-5" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {details.map((detail, i) => (
            <Fragment key={detail}>
              {i > 0 && <DetailRule />}
              <span className={OVERLINE}>{detail}</span>
            </Fragment>
          ))}
          {promoCode !== undefined && (
            <>
              <DetailRule />
              <Badge variant="success">PROMO CODE: {promoCode}</Badge>
            </>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-6 [scrollbar-color:var(--color-ink-tertiary)_transparent] [scrollbar-width:thin]">
        <div className="flex flex-1 items-stretch gap-5">
          {guests.map((guest, i) => (
            <Fragment key={guest.label}>
              {i > 0 && <Separator orientation="vertical" className="bg-line" />}
              <GuestColumn guest={guest} />
            </Fragment>
          ))}
        </div>
      </div>

      <PanelFooter
        variant="direct"
        grossTotal={grossTotal}
        currencyCode={currencyCode}
        onSaveOpportunity={() => onSaveOpportunity?.()}
        onSaveSearch={() => onSaveSearch?.()}
        onBookNow={() => onBookNow?.()}
        className="h-[58px] shrink-0"
      />
    </section>
  );
}

// Figma overrides this Divider instance to a 14px, 40%-opacity surface-disabled rule.
function DetailRule() {
  return <Separator orientation="vertical" className="h-3.5 bg-surface-disabled opacity-40" />;
}

function GuestColumn({ guest }: { guest: BuildPanelGuest }) {
  const labelId = useId();
  return (
    <fieldset
      aria-labelledby={labelId}
      className="flex min-h-[550px] w-[611px] shrink-0 flex-col justify-between self-start border-0 p-0 m-0"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex w-[602px] flex-col gap-1">
          <p id={labelId} className={OVERLINE}>
            {guest.label}
          </p>
          <p className="flex h-[22.75px] items-center text-label-md font-semibold text-fjord">
            {guest.name}
          </p>
          <TppRow tpp={guest.tpp} />
        </div>
        <div className="flex w-full flex-col gap-2">
          {guest.sections.map((section, i) => (
            <div
              key={section.kind}
              className={cn(
                'flex w-full items-start justify-between',
                i > 0 && 'border-t border-line-strong',
              )}
            >
              <SectionBullet icon={SECTION_ICON[section.kind]} />
              <div className="flex w-[572px] flex-col">
                {section.lines.map((line) => (
                  <PriceLineItem
                    key={line.label}
                    variant={line.variant}
                    label={line.label}
                    amount={line.amount}
                    className="w-full"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex w-full items-start justify-between">
        <SectionBullet icon="IconContentSell16" className="opacity-0" />
        <PriceLineItem
          variant="total"
          label={guest.totalLabel}
          amount={guest.total}
          showPerGuest={false}
          className="w-[572px]"
        />
      </div>
    </fieldset>
  );
}

function TppRow({ tpp }: { tpp: BuildPanelTpp }) {
  const checkboxId = useId();
  if (!tpp.eligible) {
    return (
      <div className="flex items-center gap-1 py-2">
        <Icon name="IconStatusInfo" size={24} tone="current" className="text-info" aria-hidden />
        <span className="text-label-md font-semibold text-info">
          TPP Non eligible guest ({tpp.reason})
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-[9px] py-2">
      <Checkbox
        id={checkboxId}
        size="sm"
        checked={tpp.included}
        onCheckedChange={(checked) => tpp.onIncludedChange?.(checked === true)}
      />
      <label htmlFor={checkboxId} className="text-body-md text-ink">
        Include <span className="text-label-md font-semibold">Travel Protection Plan - TPP</span>{' '}
        for this guest
      </label>
      <span className="text-label-lg font-semibold text-ink">({tpp.amount})</span>
    </div>
  );
}

function SectionBullet({ icon, className }: { icon: IconName; className?: string }) {
  return (
    <span className={cn('flex shrink-0 pt-1.5 pl-1', className)}>
      <span
        data-slot="section-bullet"
        className="flex size-6 items-center justify-center rounded-full bg-surface-inverse text-ink-on-brand"
      >
        <Icon name={icon} size={16} tone="current" aria-hidden />
      </span>
    </span>
  );
}
