import { Icon } from '@vikings/ui/components/icon';
import { SidebarProvider, SidebarTrigger, useSidebar } from '@vikings/ui/components/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@vikings/ui/components/tooltip';
import type * as React from 'react';
import { ACTIVE_NAV_LABEL, DYNAMICS_NAV, type NavItem } from './dynamics-nav.ts';

// A MOCK of the Dynamics 365 shell, so the prototype can be demoed the way an agent will
// actually meet it: our app framed by someone else's chrome, with its own scroll and its own
// document.
//
// ⚠️ This asserts NOTHING about how the app is really hosted. PCF control vs HTML Web
// Resource is an open decision Viking expects a Globant recommendation on, and ADR-0010 keeps
// it unasserted in the seam. An iframe is the cheapest way to STAGE that separation for a
// demo; it is not a claim that the answer is an iframe. See ADR-0010's amendment.
//
// Fidelity is deliberately "recognisable", not pixel-accurate: it reuses the Viking DS header
// and a rail built from DS primitives rather than reproducing the D365 frame geometry
// (1600×48 top bar, 204px rail, twin 44px side rails). The vendored icon set is a travel
// library with no Dashboards/Sharepoint/waffle glyphs, so exact reproduction is blocked on
// icons we do not have — and the shell is furniture, not the product.

/** Where the real app is served. Kept in one place: the iframe and the router agree on it. */
export const EMBED_BASENAME = '/embed';

/**
 * Sitemap width, overriding the DS default of 260px.
 *
 * The approved frames put `DYN-Menu` at 204px on every one of its 91 instances, so the
 * expanded rail matches the frame. The collapsed 72px icon rail is the DS's own and has no
 * counterpart in the design — see the note on collapsing below.
 */
const SITEMAP_WIDTH = '204px';

/**
 * The Dynamics sitemap — 204px labelled, 72px icon-only when collapsed.
 *
 * It takes its collapse STATE from the DS (`SidebarProvider` / `useSidebar` / `SidebarTrigger`,
 * including the Cmd-B shortcut) but renders the rail itself, because the DS `Sidebar`
 * positions its container `fixed inset-y-0` for a full-height layout with the rail at the
 * viewport edge. The frames put the host command bar ABOVE the rail, so a fixed sidebar would
 * overlay the bar instead of flowing beneath it. Borrowing the state and not the positioning
 * is the smaller compromise.
 *
 * Note the frames show NO collapsed state: `DYN-Menu` is 204px on all 91 instances, and only
 * the dialer has collapsed/expanded variants. Collapsing is therefore beyond the design, kept
 * deliberately because it is host behaviour an agent has in the real product, because the
 * command bar's hamburger would otherwise promise something it does not do, and because a
 * collapsed rail gives the embedded app 132px more width.
 *
 * Every item is inert: the host owns this rail and the prototype only mocks it.
 */
function DynamicsSitemap() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <nav
      aria-label="Dynamics navigation"
      data-testid="dynamics-nav"
      data-state={state}
      className={`flex shrink-0 flex-col gap-4 self-stretch overflow-x-hidden overflow-y-auto bg-surface py-3 shadow-[inset_-1px_0_0_0_var(--vk-line)] transition-[width] duration-200 ease-linear ${
        collapsed ? 'w-[72px] px-2' : 'w-[var(--sidebar-width)] px-3'
      }`}
    >
      {DYNAMICS_NAV.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="flex flex-col gap-1">
          {group.label !== undefined && !collapsed && (
            <span className="px-2 py-1 text-[11px] font-bold tracking-[0.02em] uppercase text-ink-secondary">
              {group.label}
            </span>
          )}
          {group.items.map((item) => (
            <NavRailItem key={item.label} item={item} collapsed={collapsed} />
          ))}
        </div>
      ))}
    </nav>
  );
}

/** One rail entry. Disabled rather than plain text so it reads as an unavailable control. */
function NavRailItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const button = (
    <button
      type="button"
      disabled
      aria-label={item.label}
      title="Dynamics navigation is mocked in the prototype"
      data-active={item.label === ACTIVE_NAV_LABEL || undefined}
      className={`flex items-center gap-2 rounded-sm py-1.5 text-left text-sm text-ink-secondary data-active:bg-surface-muted data-active:font-semibold data-active:text-fjord ${
        collapsed ? 'justify-center px-0' : 'px-2'
      }`}
    >
      <Icon name={item.icon} size={16} tone="current" />
      {!collapsed && item.label}
    </button>
  );

  // Collapsed, the label is the only thing identifying the icon — without this the rail is a
  // column of unlabelled glyphs.
  if (!collapsed) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The host's own command bar. Inert apart from the hamburger, which really does collapse the
 * sitemap — a control drawn next to a collapsible rail should work, or it teaches the agent
 * the wrong thing about the product.
 */
function HostCommandBar() {
  return (
    <header
      data-testid="dynamics-top-bar"
      className="flex h-12 shrink-0 items-center gap-3 bg-fjord px-4 text-ink-on-brand"
    >
      <SidebarTrigger
        data-testid="sitemap-toggle"
        aria-label="Toggle Dynamics navigation"
        className="size-7 text-ink-on-brand hover:bg-fjord-hover hover:text-ink-on-brand"
      />
      <span className="text-sm font-semibold">Dynamics 365</span>
      <div className="ml-auto flex items-center gap-3">
        <Icon name="IconContentCall" size={16} tone="current" aria-hidden="true" />
        <Icon name="IconStatusNotifications" size={16} tone="current" aria-hidden="true" />
        <Icon name="IconContentPerson" size={16} tone="current" aria-hidden="true" />
      </div>
    </header>
  );
}

export function MockDynamicsShell() {
  return (
    // TooltipProvider because the collapsed rail shows each item's label as a tooltip — that
    // is what keeps the icon-only state usable rather than a column of unlabelled glyphs.
    <TooltipProvider>
      {/* The sidebar provider owns the collapsed/expanded state and the keyboard shortcut; it
          wraps the command bar too, because the hamburger lives there rather than in the rail. */}
      <SidebarProvider
        style={{ '--sidebar-width': SITEMAP_WIDTH } as React.CSSProperties}
        className="flex h-screen min-h-0 flex-col bg-page text-ink"
      >
        <HostCommandBar />
        <div className="flex min-h-0 flex-1">
          <DynamicsSitemap />
          {/* The prototype proper. A real iframe rather than a styled div, because that is what
            makes the mock worth having: the app gets its own document and its own scroll, and
            cannot reach the host except through the seam. The shell's own query string is
            passed on, so opening it with a real CRM launch URL (`/?contactId=…`) hands the app
            the same parameters real D365 would. */}
          <iframe
            title="Viking Cruise Shopping"
            src={`${EMBED_BASENAME}${globalThis.location?.search ?? ''}`}
            data-testid="app-frame"
            className="min-w-0 flex-1 border-0"
          />
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
