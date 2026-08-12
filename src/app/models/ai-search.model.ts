import { UserProfile, ProfilePhoto, PhotoPrivacy, ProfileStatus, Gender, User } from './user.model';

// ─────────────────────────────────────────────────────────────────────────────
// Wire models — mirror suhana-api/src/modules/search/dto/ai-search.dto.ts
// ─────────────────────────────────────────────────────────────────────────────

export type IntentSource = 'LOCAL' | 'CACHE' | 'AI_FALLBACK' | 'LOCAL_DEGRADED';

export type SuggestionType = 'COMPLETION' | 'REFINEMENT' | 'POPULAR' | 'EXAMPLE';

/**
 * The structured form of a natural-language query. Every field is optional —
 * an absent field means "no constraint", not "no match".
 */
export interface SearchIntent {
  profession?: string;
  education?: string;
  religion?: string;
  caste?: string;
  city?: string;
  state?: string;
  country?: string;
  ageMin?: number;
  ageMax?: number;
  maritalStatus?: string;
  openToRemarriage?: boolean;
  languages?: string[];
  personalityTraits?: string[];
  interests?: string[];
  familyType?: string;
  familyValues?: string;
  willingToRelocate?: boolean;
  horoscopeRequired?: boolean;
  gender?: string;
  premiumOnly?: boolean;
  verifiedOnly?: boolean;
  activeWithinDays?: number;
  minMatchScore?: number;
  similarToShortlisted?: boolean;
  similarToName?: string;
  familyApproval?: boolean;
  keywords?: string[];
}

export interface AiSearchRequest {
  query: string;
  page?: number;
  limit?: number;
  refreshIntent?: boolean;
}

export interface SearchProfileResult {
  profileId: string;
  user: User | null;
  userId: string;
  profileCode: string | null;
  firstName: string;
  lastName: string | null;
  age: number | null;
  dateOfBirth: string | null;
  gender: string | null;
  caste: string | null;
  occupationTitle: string | null;
  educationLevel: string | null;
  religion: string | null;
  motherTongue: string | null;
  location: {
    city: string | null;
    state: string | null;
    country: string | null;
    willingToRelocate: boolean;
  } | null;
  height: string | null;
  weight: string | null;
  complexion: string | null;
  aboutMe: string | null;
  education: { level: string | null; field: string | null; institution: string | null } | null;
  occupation: {
    title: string | null;
    company: string | null;
    industry?: string | null;
    annualIncome: string | null;
    workingStatus: string | null;
  } | null;
  familyDetails: {
    familyType?: string | null;
    familyValues?: string | null;
    fatherOccupation?: string | null;
    motherOccupation?: string | null;
    siblings?: number | null;
    brothersCount?: number | null;
    sistersCount?: number | null;
    familyPreferenceNote?: string | null;
  } | null;
  photos: {
    id: string;
    url: string;
    isPrimary?: boolean;
    variants?: { originalUrl?: string; displayUrl?: string; thumbnailUrl?: string };
    createdAt?: string;
    isVerified?: boolean;
  }[] | null;
  photoPrivacy: string | null;
  status: string | null;
  profileCompleteness: number | null;
  videoIntroUrl: string | null;
  voiceIntroductionUrl: string | null;
  familyValues?: string | null;
  familyType: string | null;
  maritalStatus: string | null;
  interests: string[] | null;
  willingToRelocate: boolean;
  primaryPhotoUrl: string | null;
  matchScore: number;
  scoreBreakdown: Record<string, number>;
  matchReasons: string[];
  lastActive: string | null;
}

export interface AiSearchResponse {
  searchIntent: SearchIntent;
  confidence: number;
  intentSource: IntentSource;
  totalResults: number;
  page: number;
  limit: number;
  totalPages: number;
  profiles: SearchProfileResult[];
  suggestions: string[];
  corrections: Record<string, string>;
  searchTimeMs: number;
}

export interface SuggestionItem {
  text: string;
  type: SuggestionType;
  facet: string | null;
  value?: string | null;
}

export interface SearchSuggestionsResponse {
  success: boolean;
  query: string;
  data: SuggestionItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// UI models
// ─────────────────────────────────────────────────────────────────────────────

export enum SearchMode {
  TRADITIONAL = 'TRADITIONAL',
  AI = 'AI',
  HYBRID = 'HYBRID',
}

export const SEARCH_MODE_LABELS: Record<SearchMode, string> = {
  [SearchMode.TRADITIONAL]: 'Traditional Search',
  [SearchMode.AI]: 'AI Search',
  [SearchMode.HYBRID]: 'Hybrid Search',
};

/** One removable facet extracted from the intent. */
export interface IntentChip {
  /** Which intent field this came from. */
  key: keyof SearchIntent;
  label: string;
  icon: string;
  /** Set for array facets, identifying which element to drop. */
  value?: string;
}

const CHIP_ICONS: Partial<Record<keyof SearchIntent, string>> = {
  profession: 'work',
  education: 'school',
  religion: 'temple_hindu',
  caste: 'groups',
  city: 'location_city',
  state: 'map',
  country: 'public',
  maritalStatus: 'favorite_border',
  familyType: 'family_restroom',
  familyValues: 'diversity_3',
  gender: 'wc',
  languages: 'translate',
  personalityTraits: 'psychology',
  interests: 'interests',
  similarToName: 'person_search',
};

const TITLE_CASE = (s: string): string =>
  s.replace(/\b\w/g, c => c.toUpperCase()).replace(/-/g, '-');

/**
 * Flattens an intent into removable chips. Array facets yield one chip per
 * element so a member can drop a single trait without losing the rest.
 */
export function intentToChips(intent: SearchIntent | null | undefined): IntentChip[] {
  if (!intent) return [];
  const chips: IntentChip[] = [];

  // The same value can surface from several facets — "Texas" as both city and
  // state, or a profession that also appears in interests. First one wins.
  const seen = new Set<string>();
  const add = (chip: IntentChip): void => {
    const label = chip.label.trim();
    if (!label) return;
    const dedupeKey = label.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    chips.push({ ...chip, label });
  };

  const scalar = (key: keyof SearchIntent, label?: string) => {
    const v = intent[key];
    if (v === undefined || v === null || v === '') return;
    add({ key, label: label ?? TITLE_CASE(String(v)), icon: CHIP_ICONS[key] ?? 'label' });
  };

  const list = (key: 'languages' | 'personalityTraits' | 'interests') => {
    for (const v of intent[key] ?? []) {
      if (!v) continue;
      add({ key, label: TITLE_CASE(v), value: v, icon: CHIP_ICONS[key] ?? 'label' });
    }
  };

  const flag = (key: keyof SearchIntent, label: string, icon: string) => {
    if (intent[key] === true) add({ key, label, icon });
  };

  scalar('profession');
  scalar('education');
  scalar('religion');
  scalar('caste');
  scalar('city');
  scalar('state');
  scalar('country');
  scalar('gender');
  scalar('maritalStatus');
  scalar('familyType', intent.familyType ? `${TITLE_CASE(intent.familyType)} Family` : undefined);
  scalar('familyValues');
  scalar('similarToName', intent.similarToName ? `Similar to ${intent.similarToName}` : undefined);

  list('languages');
  list('personalityTraits');
  list('interests');

  if (intent.ageMin != null || intent.ageMax != null) {
    const label =
      intent.ageMin != null && intent.ageMax != null ? `Age ${intent.ageMin}-${intent.ageMax}`
      : intent.ageMin != null ? `Age ${intent.ageMin}+`
      : `Age up to ${intent.ageMax}`;
    // ageMin carries the pair; removing the chip clears both.
    add({ key: 'ageMin', label, icon: 'cake' });
  }

  if (intent.activeWithinDays != null) {
    add({ key: 'activeWithinDays', label: `Active in ${intent.activeWithinDays}d`, icon: 'schedule' });
  }
  if (intent.minMatchScore != null) {
    add({ key: 'minMatchScore', label: `Match ${intent.minMatchScore}%+`, icon: 'insights' });
  }

  flag('willingToRelocate', 'Willing to Relocate', 'flight');
  flag('horoscopeRequired', 'Horoscope Match', 'auto_awesome');
  flag('premiumOnly', 'Premium Only', 'workspace_premium');
  flag('verifiedOnly', 'Verified Only', 'verified');
  flag('openToRemarriage', 'Open to Remarriage', 'volunteer_activism');
  flag('similarToShortlisted', 'Like My Shortlist', 'bookmark');
  flag('familyApproval', 'Family Approved', 'diversity_1');

  return chips;
}

/** Facets holding a single free-text value. */
const STRING_SCALAR_KEYS = [
  'profession', 'education', 'religion', 'caste', 'city', 'state', 'country',
  'maritalStatus', 'familyType', 'familyValues', 'gender', 'similarToName',
] as const;

/** Facets holding a list of free-text values. */
const STRING_LIST_KEYS = ['languages', 'personalityTraits', 'interests', 'keywords'] as const;

/**
 * Returns a copy of the intent with the chip's value removed.
 *
 * The parser often lands the same word in more than one facet — "California"
 * arrives as both `city` and `state`. Clearing only the chip's own key would
 * leave the search still constrained by the twin, so the value is swept from
 * every facet that holds it.
 */
export function removeIntentChip(intent: SearchIntent, chip: IntentChip): SearchIntent {
  const next: SearchIntent = { ...intent };

  // Age is stored as a pair but shown as one chip.
  if (chip.key === 'ageMin') {
    delete next.ageMin;
    delete next.ageMax;
    return next;
  }

  // Boolean and numeric facets carry no text — drop the key and stop.
  const raw = chip.value ?? intent[chip.key];
  const target = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!target) {
    delete next[chip.key];
    return next;
  }

  for (const key of STRING_SCALAR_KEYS) {
    const v = next[key];
    if (typeof v === 'string' && v.trim().toLowerCase() === target) delete next[key];
  }

  for (const key of STRING_LIST_KEYS) {
    const list = next[key];
    if (!list?.length) continue;
    const remaining = list.filter(v => (v ?? '').trim().toLowerCase() !== target);
    if (remaining.length) next[key] = remaining;
    else delete next[key];
  }

  return next;
}

/**
 * Rebuilds a query string from an intent.
 *
 * The API only accepts free text, so re-running after a chip is removed means
 * re-expressing what is left. Canonical values are exactly what the parser's
 * dictionary emits, so they round-trip cleanly.
 */
export function buildQueryFromIntent(intent: SearchIntent): string {
  const parts: string[] = [];

  if (intent.personalityTraits?.length) parts.push(...intent.personalityTraits);
  if (intent.gender) parts.push(intent.gender);
  if (intent.religion) parts.push(intent.religion);
  if (intent.caste) parts.push(intent.caste);
  if (intent.profession) parts.push(intent.profession);
  if (intent.education) parts.push(`with ${intent.education}`);
  if (intent.languages?.length) parts.push(`${intent.languages.join(' ')} speaking`);
  if (intent.city) parts.push(`in ${intent.city}`);
  if (intent.state) parts.push(`in ${intent.state}`);
  if (intent.country) parts.push(`in ${intent.country}`);
  if (intent.ageMin != null && intent.ageMax != null) parts.push(`aged ${intent.ageMin}-${intent.ageMax}`);
  else if (intent.ageMin != null) parts.push(`aged over ${intent.ageMin}`);
  else if (intent.ageMax != null) parts.push(`aged under ${intent.ageMax}`);
  if (intent.maritalStatus) parts.push(intent.maritalStatus);
  if (intent.familyType) parts.push(`${intent.familyType} family`);
  if (intent.familyValues) parts.push(`${intent.familyValues} values`);
  if (intent.interests?.length) parts.push(`interested in ${intent.interests.join(' ')}`);
  if (intent.willingToRelocate) parts.push('willing to relocate');
  if (intent.horoscopeRequired) parts.push('with horoscope match');
  if (intent.premiumOnly) parts.push('premium members');
  if (intent.verifiedOnly) parts.push('verified members');
  if (intent.openToRemarriage) parts.push('open to remarriage');
  if (intent.similarToShortlisted) parts.push('similar to my shortlisted profiles');
  if (intent.similarToName) parts.push(`similar to ${intent.similarToName}`);
  if (intent.familyApproval) parts.push('my parents would approve');
  if (intent.activeWithinDays != null) parts.push(`active in the last ${intent.activeWithinDays} days`);
  if (intent.minMatchScore != null) parts.push(`${intent.minMatchScore}%+ match score`);
  if (intent.keywords?.length) parts.push(...intent.keywords);

  return parts.join(' ').trim();
}

/** Confidence bucket, driving the indicator colour. */
export function confidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 80) return 'high';
  if (confidence >= 50) return 'medium';
  return 'low';
}

/**
 * Adapts an AI search hit to the shape the existing result cards render, so
 * both search modes share one card template.
 */
export function toUserProfile(r: SearchProfileResult): UserProfile {
  const photos: ProfilePhoto[] = (r.photos ?? []).map(p => ({
    id: p.id,
    url: p.url,
    variants: p.variants
      ? {
          originalUrl: p.variants.originalUrl ?? p.url,
          displayUrl: p.variants.displayUrl ?? p.url,
          thumbnailUrl: p.variants.thumbnailUrl ?? p.url,
        }
      : undefined,
    isPrimary: p.isPrimary ?? false,
    isVerified: p.isVerified ?? false,
  }));

  if (!photos.length && r.primaryPhotoUrl) {
    photos.push({ url: r.primaryPhotoUrl, isPrimary: true, isVerified: false });
  }

  return {
    id: r.profileId,
    userId: r.userId,
    firstName: r.firstName ?? '',
    lastName: r.lastName ?? '',
    age: r.age ?? 0,
    dateOfBirth: r.dateOfBirth ? new Date(r.dateOfBirth) : new Date(0),
    gender: (r.gender as Gender) ?? 'bride',
    religion: r.religion ?? '',
    caste: r.caste ?? undefined,
    motherTongue: r.motherTongue ?? '',
    location: {
      city: r.location?.city ?? '',
      state: r.location?.state ?? '',
      country: r.location?.country ?? '',
      willingToRelocate: r.location?.willingToRelocate ?? r.willingToRelocate ?? false,
    },
    education: {
      level: r.education?.level ?? r.educationLevel ?? '',
      field: r.education?.field ?? '',
      institution: r.education?.institution ?? undefined,
    },
    occupation: {
      title: r.occupation?.title ?? r.occupationTitle ?? '',
      company: r.occupation?.company ?? undefined,
      annualIncome: r.occupation?.annualIncome ?? undefined,
      workingStatus: r.occupation?.workingStatus ?? '',
    },
    height: r.height ?? '',
    weight: r.weight ?? undefined,
    complexion: r.complexion ?? undefined,
    interests: r.interests?.length ? r.interests.join(', ') : undefined,
    aboutMe: r.aboutMe ?? '',
    photos,
    videoIntroUrl: r.videoIntroUrl ?? undefined,
    voiceIntroductionUrl: r.voiceIntroductionUrl ?? undefined,
    familyDetails: {
      familyType: (r.familyDetails?.familyType ?? r.familyType ?? 'nuclear') as UserProfile['familyDetails']['familyType'],
      fatherOccupation: r.familyDetails?.fatherOccupation ?? undefined,
      motherOccupation: r.familyDetails?.motherOccupation ?? undefined,
      siblings: r.familyDetails?.siblings ?? undefined,
      familyValues: r.familyDetails?.familyValues ?? r.familyValues ?? undefined,
      familyPreferenceNote: r.familyDetails?.familyPreferenceNote ?? undefined,
    },
    preferences: { ageRange: { min: 18, max: 60 } },
    photoPrivacy: (r.photoPrivacy as PhotoPrivacy) ?? 'everyone',
    status: (r.status as ProfileStatus) ?? 'active',
    profileCompleteness: r.profileCompleteness ?? 0,
    profileCode: r.profileCode ?? undefined,
    lastActive: r.lastActive ? new Date(r.lastActive) : undefined,
    user: r.user ?? undefined,
  };
}
