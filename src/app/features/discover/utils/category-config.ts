import { CategoryDetailsSummary } from '../models/discover.model';
import { SPECIALIZATION_LABELS } from './discover.utils';

/**
 * Per-category presentation + filter config for Aurora Discover.
 * One generic search page and one detail page render every category from this.
 *
 * Specialty codes and attribute keys mirror suhana-api
 * src/modules/discovery/categories/category-definitions.ts (astrologer codes:
 * ASTROLOGER_SPECIALIZATIONS). Adding a category = add a backend definition +
 * an entry here; routes, tiles and admin fields follow automatically.
 */
export interface AttributeField {
  key: string;
  label: string;
  type: 'int' | 'bool' | 'text';
  icon: string;
  /** Text after a number, e.g. "guests". */
  suffix?: string;
  /** Show as a highlight on result cards. */
  onCard?: boolean;
}

export interface CategoryConfig {
  slug: string;
  /** URL segment under /discover. */
  segment: string;
  name: string;
  singular: string;
  icon: string;
  image: string;
  heroTitle: string;
  heroSubtitle: string;
  /** Two colours for the category's animated gradient. */
  accent: [string, string];
  specialtyLabel: string;
  specialties: Record<string, string>;
  experienceLabel: string;
  /** Consultation modes (in person / phone / video) are meaningful for this category. */
  showModes: boolean;
  /** Label for the minimum-guests filter, when the API supports `minCapacity` here. */
  capacityLabel?: string;
  attributes: AttributeField[];
  emptyHint: string;
}

const yes = (label: string, icon: string, onCard = false): AttributeField => ({ key: '', label, type: 'bool', icon, onCard });

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    slug: 'astrologer', segment: 'astrologers', name: 'Astrologers', singular: 'astrologer', icon: 'auto_awesome',
    image: '/discover/astrologer.webp',
    heroTitle: 'Find an astrologer near you',
    heroSubtitle: 'Kundli, horoscope matching, dosha and muhurtham — in person, by phone or video.',
    accent: ['#800020', '#c9a84c'],
    specialtyLabel: 'Specialization', specialties: SPECIALIZATION_LABELS,
    experienceLabel: 'years experience', showModes: true, attributes: [],
    emptyHint: 'Try a larger distance, a nearby city, or video consultations.',
  },
  {
    slug: 'marriage-hall', segment: 'marriage-halls', name: 'Marriage Halls', singular: 'venue', icon: 'account_balance',
    image: '/discover/marriage-hall.webp',
    heroTitle: 'Find the perfect wedding venue',
    heroSubtitle: 'Kalyana mandapams, banquet halls, lawns and ballrooms — compare capacity, parking and catering.',
    accent: ['#a40029', '#e1b651'],
    specialtyLabel: 'Venue type',
    specialties: {
      'banquet-hall': 'Banquet hall', 'kalyana-mandapam': 'Kalyana mandapam', 'open-lawn': 'Open lawn', resort: 'Resort',
      'temple-hall': 'Temple hall', 'hotel-ballroom': 'Hotel ballroom', 'beach-venue': 'Beach venue',
    },
    experienceLabel: 'years hosting weddings', showModes: false, capacityLabel: 'Guests',
    attributes: [
      { key: 'capacityMax', label: 'Up to', type: 'int', icon: 'groups', suffix: 'guests', onCard: true },
      { key: 'capacityMin', label: 'Minimum', type: 'int', icon: 'group', suffix: 'guests' },
      { key: 'roomsAvailable', label: 'Rooms', type: 'int', icon: 'bed', suffix: 'rooms', onCard: true },
      { ...yes('Parking', 'local_parking', true), key: 'parking' },
      { ...yes('Air-conditioned', 'ac_unit', true), key: 'airConditioned' },
      { ...yes('In-house catering', 'restaurant'), key: 'inHouseCatering' },
      { ...yes('Outside catering allowed', 'room_service'), key: 'outsideCateringAllowed' },
    ],
    emptyHint: 'Try a larger distance, a lower guest count, or another venue type.',
  },
  {
    slug: 'wedding-planner', segment: 'wedding-planners', name: 'Wedding Planners', singular: 'planner', icon: 'event_available',
    image: '/discover/wedding-planner.webp',
    heroTitle: 'Plan it beautifully, stress-free',
    heroSubtitle: 'From full planning to day-of coordination — teams who handle every detail.',
    accent: ['#5c0018', '#d4a0a7'],
    specialtyLabel: 'Service',
    specialties: {
      'full-planning': 'Full planning', 'day-of-coordination': 'Day-of coordination', 'destination-weddings': 'Destination weddings',
      'budget-planning': 'Budget planning', 'decor-design': 'Décor design', 'vendor-management': 'Vendor management',
      'guest-management': 'Guest management',
    },
    experienceLabel: 'years planning weddings', showModes: true,
    attributes: [
      { key: 'eventsPlanned', label: 'Weddings planned', type: 'int', icon: 'celebration', onCard: true },
      { key: 'teamSize', label: 'Team of', type: 'int', icon: 'diversity_3', suffix: 'people', onCard: true },
      { ...yes('Travels for events', 'flight_takeoff', true), key: 'travelsForEvents' },
    ],
    emptyHint: 'Many planners work remotely — try “Any distance” or video consultations.',
  },
  {
    slug: 'matrimonial-consultant', segment: 'matrimonial-consultants', name: 'Matrimonial Consultants', singular: 'consultant',
    icon: 'diversity_3', image: '/discover/consultant.svg',
    heroTitle: 'Experienced matchmakers, by your side',
    heroSubtitle: 'Consultants who know your community and help families find the right match.',
    accent: ['#800020', '#ec88a9'],
    specialtyLabel: 'Focus',
    specialties: {
      'community-matchmaking': 'Community matchmaking', 'nri-matches': 'NRI matches', 'second-marriage': 'Second marriage',
      'horoscope-coordination': 'Horoscope coordination', 'background-verification': 'Background checks',
      'family-meetings': 'Family meetings', professionals: 'Professionals',
    },
    experienceLabel: 'years as a consultant', showModes: true,
    attributes: [
      { key: 'communitiesServed', label: 'Communities', type: 'text', icon: 'diversity_1', onCard: true },
      { ...yes('Arranges family meetings', 'family_restroom', true), key: 'familyMeetingsArranged' },
      { ...yes('Confidential service', 'lock', true), key: 'confidentialService' },
    ],
    emptyHint: 'Consultants often work by phone or video — try “Any distance”.',
  },
  {
    slug: 'photography', segment: 'photographers', name: 'Photography', singular: 'photographer', icon: 'photo_camera',
    image: '/discover/photography.webp',
    heroTitle: 'Capture every moment',
    heroSubtitle: 'Candid, traditional and cinematic wedding photographers and filmmakers.',
    accent: ['#3d2c2e', '#b76e79'],
    specialtyLabel: 'Style',
    specialties: {
      candid: 'Candid', traditional: 'Traditional', 'cinematic-video': 'Cinematic video', 'pre-wedding': 'Pre-wedding shoots',
      drone: 'Drone', albums: 'Albums', 'live-streaming': 'Live streaming',
    },
    experienceLabel: 'years shooting weddings', showModes: false,
    attributes: [
      { key: 'teamSize', label: 'Team of', type: 'int', icon: 'groups', suffix: 'people', onCard: true },
      { key: 'deliveryWeeks', label: 'Delivery in', type: 'int', icon: 'schedule', suffix: 'weeks', onCard: true },
      { ...yes('Travels for events', 'flight_takeoff', true), key: 'travelsForEvents' },
    ],
    emptyHint: 'Photographers often travel — try a larger distance.',
  },
  {
    slug: 'catering-decoration', segment: 'catering-decoration', name: 'Catering & Decoration', singular: 'caterer or decorator',
    icon: 'restaurant', image: '/discover/catering.webp',
    heroTitle: 'Feasts and décor to remember',
    heroSubtitle: 'Traditional caterers, live counters, floral and stage décor for every celebration.',
    accent: ['#b97002', '#a40029'],
    specialtyLabel: 'Speciality',
    specialties: {
      vegetarian: 'Vegetarian', 'non-vegetarian': 'Non-vegetarian', 'south-indian': 'South Indian', 'north-indian': 'North Indian',
      'live-counters': 'Live counters', 'floral-decor': 'Floral décor', 'stage-decor': 'Stage décor', lighting: 'Lighting',
    },
    experienceLabel: 'years in business', showModes: false, capacityLabel: 'Guests',
    attributes: [
      { key: 'maxGuests', label: 'Serves up to', type: 'int', icon: 'groups', suffix: 'guests', onCard: true },
      { key: 'minGuests', label: 'Minimum', type: 'int', icon: 'group', suffix: 'guests' },
      { ...yes('Tasting available', 'local_dining', true), key: 'tastingAvailable' },
    ],
    emptyHint: 'Try a larger distance or fewer filters.',
  },
  {
    slug: 'wedding-shopping', segment: 'wedding-shopping', name: 'Wedding Shopping', singular: 'store', icon: 'shopping_bag',
    image: '/discover/wedding-shopping.webp',
    heroTitle: 'Shop for the big day',
    heroSubtitle: 'Jewellers, bridal silks, lehengas, sherwanis and wedding essentials near you.',
    accent: ['#c9a84c', '#800020'],
    specialtyLabel: 'Shop for',
    specialties: {
      jewellery: 'Jewellery', 'bridal-sarees': 'Bridal sarees', lehengas: 'Lehengas', sherwanis: 'Sherwanis',
      'wedding-cards': 'Wedding cards', 'return-gifts': 'Return gifts', accessories: 'Accessories',
    },
    experienceLabel: 'years in business', showModes: true,
    attributes: [
      { ...yes('Custom orders', 'design_services', true), key: 'customOrders' },
      { ...yes('Alterations', 'content_cut', true), key: 'alterations' },
      { ...yes('Home trial', 'home', true), key: 'homeTrial' },
    ],
    emptyHint: 'Try a nearby city or a larger distance.',
  },
  {
    slug: 'mehndi-artist', segment: 'mehndi-artists', name: 'Mehndi Artists', singular: 'artist', icon: 'brush',
    image: '/discover/mehndi-artist.webp',
    heroTitle: 'Beautiful mehndi, every time',
    heroSubtitle: 'Traditional and contemporary mehndi artists for weddings and celebrations.',
    accent: ['#800020', '#c9a84c'],
    specialtyLabel: 'Style',
    specialties: {
      traditional: 'Traditional', contemporary: 'Contemporary', bridal: 'Bridal', party: 'Party',
      henna: 'Henna', glitter: 'Glitter', floral: 'Floral', arabic: 'Arabic',
    },
    experienceLabel: 'years in business', showModes: true,
    attributes: [
      { key: 'teamSize', label: 'Team of', type: 'int', icon: 'groups', suffix: 'people', onCard: true },
      { ...yes('Travels for events', 'flight_takeoff', true), key: 'travelsForEvents' },
    ],
    emptyHint: 'Try a larger distance or a nearby city.',
  },
];

export const configBySlug = (slug: string | null | undefined): CategoryConfig | undefined =>
  CATEGORY_CONFIGS.find((c) => c.slug === slug);

export const configBySegment = (segment: string | null | undefined): CategoryConfig | undefined =>
  CATEGORY_CONFIGS.find((c) => c.segment === segment);

/** Router link to a provider's detail page within its category. */
export const providerLink = (categorySlug: string, id: string): string[] =>
  ['/discover', configBySlug(categorySlug)?.segment ?? 'astrologers', id];

export const specialtyLabel = (cfg: CategoryConfig | undefined, code: string): string =>
  cfg?.specialties[code] ?? code.replace(/-/g, ' ');

export interface Highlight {
  icon: string;
  text: string;
}

/** Human-readable highlights from typed attributes (cards: onCard only). */
export function attributeHighlights(cfg: CategoryConfig | undefined, d: CategoryDetailsSummary | null | undefined, cardOnly = true): Highlight[] {
  if (!cfg || !d) return [];
  const out: Highlight[] = [];
  for (const a of cfg.attributes) {
    if (cardOnly && !a.onCard) continue;
    const v = d.attributes?.[a.key];
    if (v === undefined || v === null || v === '') continue;
    if (a.type === 'bool') {
      if (v === true) out.push({ icon: a.icon, text: a.label });
    } else if (a.type === 'int') {
      out.push({ icon: a.icon, text: `${a.label} ${Number(v).toLocaleString()}${a.suffix ? ' ' + a.suffix : ''}` });
    } else {
      out.push({ icon: a.icon, text: `${a.label}: ${v}` });
    }
  }
  return out;
}
