import type { IconName } from '@vikings/ui/components/icon';

// The Dynamics sitemap, transcribed from the approved frames (`01-CruiseSearch-FromContact`
// and every other screen carries the same rail).
//
// Icons are the nearest fit from the vendored DS set, which is a TRAVEL icon library — it has
// no glyphs for Dashboards, Sharepoint, Activities or a waffle menu. These are deliberate
// stand-ins: the shell is a mock of the host, not a reproduction of it, so a recognisable rail
// beats a blocked one. If the shell ever needs to be pixel-accurate, the icons are the gap.

export interface NavItem {
  label: string;
  icon: IconName;
}

export interface NavGroup {
  /** Undefined for the ungrouped items at the top of the rail. */
  label?: string;
  items: NavItem[];
}

export const DYNAMICS_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Home', icon: 'IconNavigationHome' },
      { label: 'Recent', icon: 'IconStatusSchedule' },
      { label: 'Pinned', icon: 'IconContentStar' },
    ],
  },
  {
    label: 'My work',
    items: [
      { label: 'Dashboards', icon: 'IconBookingPercent' },
      { label: 'Contact Search', icon: 'IconNavigationSearch' },
      { label: 'Activities', icon: 'IconBookingEvent' },
      { label: 'Tasks', icon: 'IconActionCheck' },
      { label: 'Sharepoint', icon: 'IconContentMail' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Cruise Search', icon: 'IconContentSailing' },
      { label: 'Opportunities', icon: 'IconContentSell' },
    ],
  },
  {
    label: 'Reference Data',
    items: [
      { label: 'Agents/Agencies', icon: 'IconBookingSupportAgent' },
      { label: 'Booking', icon: 'IconBookingBookOnline' },
      { label: 'Cruises', icon: 'IconContentDirectionsBoat' },
      { label: 'Itineraries', icon: 'IconContentMap' },
      { label: 'Port', icon: 'IconTravelAnchor' },
      { label: 'Ships', icon: 'IconContentSailing' },
    ],
  },
];

/** The rail item the shopping app corresponds to — shown selected, as the frames do. */
export const ACTIVE_NAV_LABEL = 'Cruise Search';
