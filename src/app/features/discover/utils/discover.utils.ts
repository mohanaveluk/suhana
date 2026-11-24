import {
  ConsultationMode, CountryCode, DiscoverSort, DistanceUnit, Money, ProviderPlace, RadiusOption, VerificationStatus,
} from '../models/discover.model';

/** Supported markets. Mirrors DISCOVERY_COUNTRIES in suhana-api discovery.constants.ts. */
export const DISCOVER_COUNTRIES: Record<CountryCode, {
  name: string; unit: DistanceUnit; currency: string; postalLabel: string; postalPattern: RegExp; postalHint: string;
}> = {
  IN: { name: 'India', unit: 'km', currency: 'INR', postalLabel: 'PIN code', postalPattern: /^[1-9]\d{5}$/, postalHint: '6 digits, e.g. 600001' },
  US: { name: 'United States', unit: 'mi', currency: 'USD', postalLabel: 'ZIP code', postalPattern: /^\d{5}(-\d{4})?$/, postalHint: '5 digits, e.g. 08817' },
};

export const RADIUS_OPTIONS: RadiusOption[] = ['5', '10', '25', '50', '100', 'all'];

export const SPECIALIZATION_LABELS: Record<string, string> = {
  kundli: 'Kundli / birth chart',
  'horoscope-matching': 'Horoscope matching',
  dosha: 'Dosha analysis',
  manglik: 'Manglik dosha',
  muhurtham: 'Muhurtham (auspicious dates)',
  nadi: 'Nadi astrology',
  numerology: 'Numerology',
  vastu: 'Vastu',
  palmistry: 'Palmistry',
  prashna: 'Prashna (horary)',
};

export const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', mr: 'Marathi',
  gu: 'Gujarati', bn: 'Bengali', pa: 'Punjabi', or: 'Odia', ur: 'Urdu', sa: 'Sanskrit', kok: 'Konkani', as: 'Assamese',
};

export const MODE_LABELS: Record<ConsultationMode, { label: string; icon: string }> = {
  IN_PERSON: { label: 'In person', icon: 'storefront' },
  PHONE: { label: 'Phone', icon: 'call' },
  VIDEO: { label: 'Video', icon: 'videocam' },
};

export const SORT_LABELS: Record<DiscoverSort, string> = {
  recommended: 'Recommended',
  nearest: 'Nearest first',
  rating: 'Highest rated',
  experience: 'Most experienced',
  price_asc: 'Fee: low to high',
  price_desc: 'Fee: high to low',
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  PENDING: 'Pending review',
  VERIFIED: 'Verified listing',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

export const RANKING_FACTOR_LABELS: Record<string, string> = {
  distance: 'Distance',
  rating: 'Rating',
  reviewCount: 'Number of reviews',
  experience: 'Experience',
  verification: 'Verified listing',
  availability: 'Accepting clients',
};

export const WEEK_DAYS = [
  { key: 'mon', label: 'Monday' }, { key: 'tue', label: 'Tuesday' }, { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' }, { key: 'fri', label: 'Friday' }, { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export const specializationLabel = (code: string): string => SPECIALIZATION_LABELS[code] ?? code;
export const languageLabel = (code: string): string => LANGUAGE_LABELS[code] ?? code.toUpperCase();

export function formatMoney(m: Money | { amount: number | null; currency: string | null } | null): string {
  if (!m || m.amount === null || m.amount === undefined) return 'Price on request';
  const currency = m.currency ?? 'USD';
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency', currency, maximumFractionDigits: m.amount % 1 === 0 ? 0 : 2,
    }).format(m.amount);
  } catch {
    return `${currency} ${m.amount}`;
  }
}

export function formatDistance(value: number, unit: DistanceUnit): string {
  if (value < 0.1) return `< 0.1 ${unit}`;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${unit}`;
}

export function placeLabel(p: ProviderPlace | null): string {
  if (!p) return '';
  return [p.city, p.state, p.country === 'IN' ? 'India' : p.country === 'US' ? 'USA' : p.country].filter(Boolean).join(', ');
}

/**
 * Google Maps directions to a public street address. Uses the documented
 * "Maps URLs" scheme — no API key, and the member's own location is never
 * sent by us (their maps app supplies the starting point).
 */
export function directionsUrl(address: string | null): string | null {
  return address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : null;
}

/** Best-effort default country from the member's profile ("India", "IN", "USA", …). */
export function guessCountry(raw: string | null | undefined): CountryCode {
  const v = (raw ?? '').trim().toLowerCase();
  if (['us', 'usa', 'united states', 'united states of america', 'america'].includes(v)) return 'US';
  return 'IN';
}

/** 2 dp ≈ 1.1 km — the precision we're willing to send for "use my location". */
export const coarsen = (v: number): number => Math.round(v * 100) / 100;

/** Readable message from an API error (AllExceptionsFilter → { message }). */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { status?: number; error?: { message?: string | string[] } };
  if (e?.status === 429) return 'Too many requests — please wait a moment and try again.';
  const m = e?.error?.message;
  if (Array.isArray(m)) return m[0] ?? fallback;
  return (typeof m === 'string' && m) || fallback;
}

export const AVATAR_FALLBACK = '/avatar-default.svg';
